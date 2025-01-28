const express = require('express');
const router = express.Router();
const multer = require('multer')
const s3 = require('../utils/s3Client')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const packageSchema = require('../models/packages')
const bookingSchema = require('../models/bookings');
const vendorSchema = require('../models/vendors')
const ObjectId = require('mongoose').Types.ObjectId;
const generateJWT = require('../utils/tokenUtils')
const { createNotification, sendAdminNotifications } = require('../utils/notificationUtils')

const storage = multer.memoryStorage();
const upload = multer({ storage });


router.post('/create-package/:vendorId', upload.single('image'), async (req, res) => {
    const { vendorId } = req.params
    const image = req.file;
    const {
        title,
        category,
        description,
        destination,
        pricing,
        duration,
        transportationMode,
        date,
        seats,
        inclusions,
    } = req.body

    try {
        const fileKey = `Vendor/${Date.now()}-${image.originalname}`

        const params = {
            Bucket: `${process.env.AWS_BUCKET_NAME}`,
            Key: fileKey,
            Body: image.buffer,
            ContentType: image.mimetype,
        }

        await s3.send(new PutObjectCommand(params));
        const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`

        const inclusionsArray = inclusions
            ? inclusions.split(",").map(item => item.trim())
            : [];

        const newPackage = new packageSchema({
            vendorId,
            title,
            imageUrl,
            description,
            category,
            destination,
            days: Number(duration),
            startDate: new Date(date),
            price: Number(pricing),
            inclusions: inclusionsArray,
            transportationMode,
            totalSlots: Number(seats),
            availableSlots: Number(seats),
            status: 'pending',
            createdAt: new Date(),
        });
        const result = await newPackage.save();

        await sendAdminNotifications(
            'New package',
            `New package waiting for approval`,
            `/admin/view-package/${result._id}`
        );


        res.status(200).json({ message: 'Package added successfully' })
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Internal server error' })
    }

})


router.get('/get-vendor-top-packages/:vendorId', async (req, res) => {
    const { vendorId } = req.params;

    try {
        const packages = await packageSchema
            .find({ vendorId: new ObjectId(vendorId), status: 'active' }, {
                _id: 1,
                title: 1,
                category: 1,
                price: 1,
                destination: 1,
                imageUrl: 1,
                'rating.avgRating': 1,
            })
            .sort({ 'rating.avgRating': -1 })
            .limit(15)

        if (!packages || packages.length === 0)
            return res.status(404).json({ message: 'packages not found' })

        res.status(200).json({ packages })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-pending-packages/:vendorId', async (req, res) => {
    const { vendorId } = req.params
    try {
        const packages = await packageSchema.find({ vendorId, status: 'pending' }, {
            title: 1,
            category: 1,
            price: 1,
            destination: 1,
            imageUrl: 1,
            'rating.avgRating': 1,
        })
        if (!packages || packages.length === 0) {
            return res.status(404).json({ message: 'No packages found' })
        }

        res.status(200).json({ packages })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-approved-packages/:vendorId', async (req, res) => {
    const { vendorId } = req.params
    try {
        const packages = await packageSchema.find({ vendorId, status: 'approved' }, {
            title: 1,
            category: 1,
            price: 1,
            destination: 1,
            imageUrl: 1,
            'rating.avgRating': 1,
        })
        if (!packages || packages.length === 0) {
            return res.status(404).json({ message: 'No packages found' })
        }

        res.status(200).json({ packages })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-rejected-packages/:vendorId', async (req, res) => {
    const { vendorId } = req.params
    try {
        const packages = await packageSchema.find({ vendorId, status: 'rejected' }, {
            title: 1,
            category: 1,
            price: 1,
            destination: 1,
            imageUrl: 1,
            'rating.avgRating': 1,
        })
        if (!packages || packages.length === 0) {
            return res.status(404).json({ message: 'No packages found' })
        }

        res.status(200).json({ packages })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-active-packages/:vendorId', async (req, res) => {
    const { vendorId } = req.params
    try {
        const packages = await packageSchema.find({ vendorId, status: 'active' }, {
            title: 1,
            category: 1,
            price: 1,
            destination: 1,
            imageUrl: 1,
            'rating.avgRating': 1,
        })
        if (!packages || packages.length === 0) {
            return res.status(404).json({ message: 'No packages found' })
        }

        res.status(200).json({ packages })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-inactive-packages/:vendorId', async (req, res) => {
    const { vendorId } = req.params
    try {
        const packages = await packageSchema.find({ vendorId, status: 'inactive' }, {
            title: 1,
            category: 1,
            price: 1,
            destination: 1,
            imageUrl: 1,
            'rating.avgRating': 1,
        })
        if (!packages || packages.length === 0) {
            return res.status(404).json({ message: 'No packages found' })
        }

        res.status(200).json({ packages })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.put('/activate-package/:id', async (req, res) => {
    const { id } = req.params
    try {
        const package = await packageSchema.findByIdAndUpdate(id, {
            $set: {
                status: 'active',
                updatedAt: new Date()
            },
        },
            { new: true }
        )

        if (!package) {
            return res.status(404).json({ message: 'Package not found' })
        }

        res.status(200).json({ message: 'Package Activated successfully', package })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error while Activating package' })
    }
})


router.put('/deactivate-package/:id', async (req, res) => {
    const { id } = req.params
    try {
        const package = await packageSchema.findByIdAndUpdate(id, {
            $set: {
                status: 'inactive',
                updatedAt: new Date()
            },
        },
            { new: true }
        )

        if (!package) {
            return res.status(404).json({ message: 'Package not found' })
        }

        res.status(200).json({ message: 'Package Activated successfully', package })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error while Activating package' })
    }
})


router.get('/get-booking-details/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const bookingDetails = await bookingSchema.aggregate([
            { $match: { _id: new ObjectId(id) } },
            {
                $lookup: {
                    from: 'packages',
                    localField: 'packageId',
                    foreignField: '_id',
                    as: 'packageDetails'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
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
                    'user._id': 1,
                    'user.email': 1,
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


router.put('/approve-booking/:bookingId', async (req, res) => {
    const { bookingId } = req.params;

    try {

        const booking = await bookingSchema.findByIdAndUpdate(bookingId, {
            $set: { status: 'approved' },
        },
        )

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }

        const result = await packageSchema.updateOne(
            { _id: new ObjectId(booking.packageId) },
            { $inc: { availableSlots: -booking.numberOfSeats } },
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({ message: "Failed to update available slots" });
        }

        await createNotification(
            'Your Booking is Approved',
            'One of your package bookings has been approved. Check approved bookings to see the details.',
            booking.userId.toString(),
            `/view-booking-details/${bookingId}`
        );

        res.status(200).json({ message: 'Successfully approved booking' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error while Approving' })
    }
})


router.put('/reject-booking/:bookingId', async (req, res) => {
    const { bookingId } = req.params

    try {
        const booking = await bookingSchema.findByIdAndUpdate(bookingId,
            {
                $set: {
                    status: 'rejected'
                }
            }
        )

        if (!booking)
            return res.status(404).json({ message: 'Booking data not found' })

        await createNotification(
            'Your Booking is Rejected',
            'One of your package bookings has been rejected. Cancel and book again if you want to',
            booking.userId.toString(),
            `/view-booking-details/${bookingId}`
        );

        res.status(200).json({ message: 'successfully rejected booking' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to reject booking' })
    }
})


router.put('/edit-profile/:vendorId', async (req, res) => {
    const { vendorId } = req.params;
    const updatedData = req.body;

    try {
        const updatedVendor = await vendorSchema.findByIdAndUpdate(vendorId, {
            $set: {
                name: updatedData.name,
                contact: {
                    email: updatedData.contact.email,
                    phone: updatedData.contact.phone
                },
                supportContact: {
                    email: updatedData.supportContact.email,
                    phone: updatedData.supportContact.phone
                },
                updatedAt: new Date()
            }
        },
            { new: true }
        )

        if (!updatedVendor)
            return res.status(404).json({ message: 'Vendor not found' })

        const userRole = 'vendor'
        const token = generateJWT(updatedVendor, userRole)

        res.status(200).json({ message: "Profile updated successfully", token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'failed to update' })
    }
})


router.get('/pending-booking-count/:vendorId', async (req, res) => {
    const { vendorId } = req.params

    try {
        const count = await bookingSchema.countDocuments({ vendorId: new ObjectId(vendorId), status: 'pending' })

        res.status(200).json({ count })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error fetching booking count' })
    }
})


router.get('/active-package-count/:vendorId', async (req, res) => {
    const { vendorId } = req.params;

    try {
        const count = await packageSchema.countDocuments({ vendorId, status: 'active' })
        res.status(200).json({ count })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error fetching package count' })
    }
})


module.exports = router; 