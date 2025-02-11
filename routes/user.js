const express = require('express');
const router = express.Router();
const ObjectId = require('mongoose').Types.ObjectId;
const userSchema = require('../models/user');
const vendorApplicationSchema = require('../models/vendorApplications')
const paymentSchema = require('../models/payments')
const bookingSchema = require('../models/bookings')
const packageSchema = require('../models/packages')
const generateJWT = require('../utils/tokenUtils');
const multer = require('multer')
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require('../utils/s3Client')
const { sendAdminNotifications, createNotification } = require('../utils/notificationUtils')
const Razorpay = require('razorpay')
const {
    getPaymentsByUser
} = require('../helpers/paymentHelpers')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const uploadFilesToS3 = async (file, folderName) => {
    const fileKey = `${folderName}/${Date.now()}-${file.originalname}`;
    const params = {
        Bucket: `${process.env.AWS_BUCKET_NAME}`,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
    }

    await s3.send(new PutObjectCommand(params))
    return `https://${params.Bucket}.s3.amazonaws.com/${fileKey}`
}

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.put('/edit-profile/:userId', upload.single('file'), async (req, res) => {
    const { userId } = req.params;
    const { name, email, phone } = req.body
    const newDp = req.file

    if (!name || !email || !phone) {
        return res.status(400).json({ message: 'Name, email, and phone are required' });
    }

    try {
        const user = await userSchema.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let imageUrl = user.dpUrl;

        if (newDp) {
            if (user.dpUrl) {
                const oldKey = user.dpUrl.split('.amazonaws.com/')[1];
                const deleteParams = {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: oldKey,
                };

                try {
                    await s3.send(new DeleteObjectCommand(deleteParams));
                } catch (error) {
                    console.error('Failed to delete old image:', error);
                }
            }

            const newKey = `User/${Date.now()}-${newDp.originalname}`;
            const uploadParams = {
                Bucket: `${process.env.AWS_BUCKET_NAME}`,
                Key: newKey,
                Body: newDp.buffer,
                ContentType: newDp.mimetype,
            };

            try {
                await s3.send(new PutObjectCommand(uploadParams));
                imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newKey}`;
            } catch (error) {
                console.error('Failed to upload new image:', error);
                return res.status(500).json({ message: 'Error uploading new image' });
            }
        }

        const updatedUser = await userSchema.findByIdAndUpdate(
            userId,
            {
                $set: {
                    name,
                    email,
                    phone,
                    dpUrl: imageUrl,
                    updatedAt: new Date(),
                },
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const role = 'user';
        const token = generateJWT(updatedUser, role);

        res.status(200).json({ message: 'User updated successfully', token: token });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

})


router.delete('/delete-account/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await userSchema.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.dpUrl) {
            const dpKey = user.dpUrl.split('.amazonaws.com/')[1];
            const deleteParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: dpKey,
            };

            try {
                await s3.send(new DeleteObjectCommand(deleteParams));
            } catch (error) {
                console.error('Error deleting profile picture from S3:', error);
                res.status(404).json({ message: 'Internal server error' })
            }
        }

        const response = await userSchema.deleteOne({ _id: new ObjectId(userId) })

        if (response.deletedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Successfully deleted user account' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.post('/vendor-application', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'certificate', maxCount: 1 },
    { name: 'ownerId', maxCount: 1 }
]),
    async (req, res) => {
        try {

            const files = req.files;
            const { companyName,
                sendUser,
                email,
                phone,
                state,
                district,
                address,
                pincode,
                websiteUrl,
                yearEst,
                regions,
                supportEmail,
                supportPhone
            } = req.body;

            const uploadedFiles = {}
            const folderName = 'Vendor'

            for (const fieldName of Object.keys(files)) {
                uploadedFiles[fieldName] = [];

                for (const file of files[fieldName]) {
                    const fileUrl = await uploadFilesToS3(file, folderName)
                    uploadedFiles[fieldName].push(fileUrl)
                }
            }

            const newVendorApplication = new vendorApplicationSchema({
                businessName: companyName,
                businessAddress: {
                    state: state,
                    district: district,
                    address: address,
                    pincode: pincode
                },
                contact: {
                    email: email,
                    phone: phone
                },
                supportContacts: {
                    email: supportEmail,
                    phone: supportPhone
                },
                status: 'pending',
                websiteUrl: websiteUrl,
                logoUrl: uploadedFiles.logo[0],
                certificateUrl: uploadedFiles.certificate[0],
                ownerIdUrl: uploadedFiles.ownerId[0],
                regions: regions,
                yearEst: yearEst,
                userId: sendUser,
                createdAt: new Date(),
            })

            const result = await newVendorApplication.save()

            const user = await userSchema.findByIdAndUpdate(sendUser, {
                $set: {
                    isAppliedForVendor: true,
                },
            },
                { new: true }
            )
            const role = 'user'
            const token = generateJWT(user, role);

            await sendAdminNotifications(
                'New vendor application',
                `by ${user.email}. company name: ${companyName}`,
                `/admin/view-application/${result._id}`
            )

            res.status(200).json({ message: 'Files uploaded successfully', token: token })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);


router.get('/get-application-name-and-status/:userId', async (req, res) => {
    const { userId } = req.params

    try {
        const application = await vendorApplicationSchema.findOne({ userId }, {
            businessName: 1,
            status: 1,
        })

        if (!application) {
            return res.status(404).json({ message: 'No application found' })
        }

        res.status(200).json({ application })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-top-packages', async (req, res) => {
    try {
        const packages = await packageSchema.find({ status: 'active' }, {
            title: 1,
            category: 1,
            price: 1,
            destination: 1,
            imageUrl: 1,
            'rating.avgRating': 1,
        })
            .sort({ 'rating.avgRating': -1 }).limit(15)

        res.status(200).json({ packages })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.post('/book-package/:packageId', async (req, res) => {
    const { packageId } = req.params;
    const { numberOfSeats, specialRequests } = req.body.formData;
    const { userId, totalAmount, vendorId } = req.body

    try {
        const existingBooking = await bookingSchema.findOne({ userId: userId, packageId: packageId })
        if (existingBooking) {
            return res.status(400).json({ message: 'Already booked this package' })
        }

        const newBooking = new bookingSchema({
            userId,
            packageId,
            vendorId,
            numberOfSeats,
            totalAmount,
            specialRequests,
            status: 'pending',
            bookingDate: new Date(),
        })

        const booking = await newBooking.save()

        await createNotification(
            'New Booking',
            'New booking is pending for approval',
            vendorId.toString(),
            `/vendor/view-booking-details/${booking._id}`
        );

        res.status(200).json({ message: 'Booking successfull' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error while booking' })
    }
})


router.get('/get-booking-details/:bookingId', async (req, res) => {
    const { bookingId } = req.params;
    try {
        const bookingDetails = await bookingSchema.aggregate([
            { $match: { _id: new ObjectId(bookingId) } },
            {
                $lookup: {
                    from: 'packages',
                    localField: 'packageId',
                    foreignField: '_id',
                    as: 'packageDetails'
                }
            },
            {
                $project: {
                    numberOfSeats: 1,
                    specialRequests: 1,
                    totalAmount: 1,
                    status: 1,
                    bookingDate: 1,
                    'packageDetails._id': 1,
                    'packageDetails.title': 1,
                    'packageDetails.destination': 1,
                    'packageDetails.startDate': 1,
                    'packageDetails.vendorId': 1,
                    'paymentDetails.status': 1,
                    'paymentDetails.orderId': 1,
                }
            }
        ])

        if (!bookingDetails)
            return res.status(404).json({ message: 'Booking details not found' })

        res.status(200).json({ bookingDetails: bookingDetails[0] })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'error while fetching booking details' })
    }
})


router.get('/get-packages-by-category', async (req, res) => {
    const { category, page, limit } = req.query;
    try {
        const skip = (page - 1) * limit

        if (category === 'All') {
            const packages = await packageSchema.find({
                status: 'active',
            }, {
                title: 1,
                category: 1,
                price: 1,
                destination: 1,
                imageUrl: 1,
                'rating.avgRating': 1,
            })
                .skip(skip)
                .limit(limit)
                .sort({ 'rating.avgRating': -1 })
            return res.status(200).json({ packages })
        } else {
            const packages = await packageSchema.find({
                status: 'active',
                category: { $regex: category, $options: 'i' }
            }, {
                title: 1,
                category: 1,
                price: 1,
                destination: 1,
                imageUrl: 1,
                'rating.avgRating': 1,
            })
                .skip(skip)
                .limit(limit)
                .sort({ 'rating.avgRating': -1 })
            return res.status(200).json({ packages })
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/search-packages', async (req, res) => {
    try {
        let { query } = req.query;

        if (query) {
            const parsedQuery = new URLSearchParams(query);
            req.query.destination = parsedQuery.get('destination');
            req.query.month = parsedQuery.get('month');
            req.query.theme = parsedQuery.get('category');
        }

        const { destination, month, theme } = req.query;

        const dbQuery = {};
        dbQuery.status = 'active'

        if (destination) {
            dbQuery.destination = { $regex: destination, $options: 'i' };
        }

        if (month) {
            const startDate = new Date(`${month}-01`);
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            dbQuery.startDate = { $gte: startDate, $lte: endDate };
        }

        if (theme) {
            dbQuery.category = theme;
        }

        const packages = await packageSchema.find(dbQuery, {
            title: 1,
            category: 1,
            price: 1,
            destination: 1,
            imageUrl: 1,
            'rating.avgRating': 1,
        })
            .sort({ 'rating.avgRating': -1 })

        res.status(200).json({
            success: true,
            packages,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while searching for packages.',
            error: error.message,
        });
    }
})


router.put('/add-or-remove-favourite', async (req, res) => {
    const { packageId, userId, action } = req.body;
    if (!packageId || !userId || !action)
        return res.status(400).json({ message: 'Missing packageId, userId or action' })
    try {
        if (action === 'add') {
            await userSchema.findByIdAndUpdate(userId,
                { $addToSet: { favorites: packageId } },
                { new: true }
            )
        } else if (action === 'remove') {
            await userSchema.findByIdAndUpdate(
                userId,
                { $pull: { favorites: packageId } },
                { new: true }
            );
        }

        res.status(200).json({ message: 'successfully updated favourites' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'error while updating favourite' })
    }
})

router.get('/check-package-is-favourite', async (req, res) => {
    const { packageId, userId } = req.query;

    if (!packageId || !userId)
        return res.status(400).json({ message: 'Package id or user id not found' })

    try {

        const isFavourite = await userSchema.findOne({
            _id: new ObjectId(userId),
            favorites: { $in: [new ObjectId(packageId)] }
        })


        res.status(200).json({ isFavourite })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-favourite-packages/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const packages = await userSchema.findById(userId).populate('favorites')

        res.status(200).json({ packages: packages.favorites })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching favourites' })
    }
})


router.post('/create-order', async (req, res) => {

    const { amount, currency, userId, vendorId, bookingId } = req.body

    const options = {
        amount: amount,
        currency: currency,
        payment_capture: 1
    }

    try {
        const response = await razorpay.orders.create(options)

        const newPayment = new paymentSchema({
            amount: response.amount / 100,
            currency: response.currency,
            orderId: response.id,
            status: 'created',
            date: new Date(),
            bookingId,
            userId,
            vendorId
        })

        await newPayment.save();

        res.status(200).json({
            order_id: response.id,
            currency: response.currency,
            amount: response.amount
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Order creation failed" })
    }
})


router.post('/payment-success', async (req, res) => {
    const { orderId, paymentId, bookingId } = req.body;

    try {
        const payment = await paymentSchema.findOneAndUpdate(
            { orderId },
            { paymentId, status: 'paid' },
            { new: true }
        );


        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        await bookingSchema.findByIdAndUpdate(bookingId, {
            paymentDetails: {
                status: true,
                orderId
            }
        })

        await createNotification(
            'Payment Recieved',
            'You recieved a payment',
            payment.vendorId,
            `/vendor/all-payments`
        );

        res.status(200).json({ message: "Payment recorded successfully", payment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update payment" });
    }
})


router.put('/payment-failed', async (req, res) => {
    const { orderId } = req.body

    try {
        const payment = await paymentSchema.findOneAndUpdate(
            { orderId },
            { status: 'failed' }
        )

        await createNotification(
            'Payment Failed',
            'Payment failed',
            payment.vendorId,
            `/vendor/all-payments`
        );

        res.status(200).json({ message: "Payment marked as failed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update payment" })
    }
})


router.get('/get-payments/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const payments = await getPaymentsByUser(userId)

        if (!payments || payments.length === 0)
            return res.status(404).json({ message: "No payments found" })

        res.status(200).json({ payments })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching payments' })
    }
})


module.exports = router; 