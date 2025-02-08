const express = require('express');
const router = express.Router();
const statesSchema = require('../models/states');
const userSchema = require('../models/user')
const vendorApplicationSchema = require('../models/vendorApplications');
const packageSchema = require('../models/packages')
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require('../utils/s3Client')
const generateJWT = require('../utils/tokenUtils')
const conversationSchema = require('../models/conversation')
const messageSchema = require('../models/message');
const bookingSchema = require('../models/bookings');
const vendorSchema = require('../models/vendors')
const notificationSchema = require('../models/notifications')
const ObjectId = require('mongoose').Types.ObjectId;
const { createNotification, markAsRead, markAllAsRead, sendAdminNotifications } = require('../utils/notificationUtils');
const { getPaymetDetails } = require('../helpers/paymentHelpers');


router.get('/get-all-states-data', async (req, res) => {
    try {
        const states = await statesSchema.find({});
        res.status(200).json({ states: states })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error while getting states' })
    }
})


router.get('/get-vendor-application/:userId', async (req, res) => {
    const { userId } = req.params
    try {
        const application = await vendorApplicationSchema.findOne({ userId: userId })
        res.status(200).json({ application: application })
    } catch (error) {
        console.error(error);
        res.status(200).json({ message: 'Error fetching application' })
    }

})


router.delete('/delete-vendor-application/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const response = await vendorApplicationSchema.findOneAndDelete({ userId });

        if (!response) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const { logoUrl, certificateUrl, ownerIdUrl } = response;

        const extractKey = (url) => url.split('.amazonaws.com/')[1];

        const filesToDelete = [logoUrl, certificateUrl, ownerIdUrl]
            .filter(Boolean)
            .map(extractKey);

        for (const key of filesToDelete) {
            const deleteParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
            };

            try {
                const deleteCommand = new DeleteObjectCommand(deleteParams);
                await s3.send(deleteCommand);
            } catch (error) {
                console.error(`Failed to delete file: ${key}`, error);
            }
        }

        const user = await userSchema.findByIdAndUpdate(userId, {
            $set: {
                isAppliedForVendor: false
            },
        },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const role = 'user';
        const token = generateJWT(user, role);

        res.status(200).json({
            message: 'Application deleted successfully',
            token: token,
        });
    } catch (error) {
        console.error('Error while deleting vendor application:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


router.get('/get-package/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const package = await packageSchema.findById(id)
        if (!package) {
            return res.status(404).json({ message: 'Package not found' })
        }

        res.status(200).json({ package })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'internal server error' })
    }
})


router.delete('/delete-package/:id', async (req, res) => {
    const { id } = req.params

    try {
        const package = await packageSchema.findByIdAndDelete(id)

        if (!package) {
            return res.status(404).json({ message: 'Package not found' })
        }

        const imageKey = package.imageUrl.split('.amazonaws.com/')[1]
        const deleteParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: imageKey,
        }
        await s3.send(new DeleteObjectCommand(deleteParams))

        await bookingSchema.deleteMany({ packageId: new ObjectId(id) })

        res.status(200).json({ message: 'Package deleted successfully' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.post('/start-conversation', async (req, res) => {
    const { userId, vendorId } = req.body

    try {
        let conversation = await conversationSchema.findOne({ participants: { $all: [userId, vendorId] } })
        if (!conversation) {
            conversation = new conversationSchema({
                participants: [userId, vendorId],
                lastMessage: {
                    content: '',
                    timestamp: new Date(),
                    sender: null,
                }
            })
            await conversation.save()
        }

        res.status(200).json({ message: "Conversation created successfully", conversation })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error starting conversation' })
    }
})


router.get('/get-conversations/:userId', async (req, res) => {
    const { userId } = req.params

    try {
        const conversations = await conversationSchema.aggregate([
            { $match: { participants: new ObjectId(userId) } },

            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },

            {
                $lookup: {
                    from: 'vendors',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'vendorDetails'
                }
            },

            {
                $project: {
                    _id: 1,
                    participants: 1,
                    createdAt: 1,
                    lastMessage: 1,
                    userDetails: {
                        _id: 1,
                        name: 1,
                        dpUrl: 1
                    },
                    vendorDetails: {
                        _id: 1,
                        name: 1,
                        dpUrl: 1
                    }
                }
            },

            {
                $sort: {
                    'lastMessage.timestamp': -1
                }
            }
        ])
        if (!conversations) {
            return res.status(404).json({ message: "No conversations found" })
        }
        res.status(200).json({ conversations })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching conversations' })
    }
})


router.get('/get-messages/:chatId', async (req, res) => {
    const { chatId } = req.params

    try {
        const messages = await messageSchema.find({ conversationId: new ObjectId(chatId) })
        if (!messages) {
            return res.status(404).json({ message: "No messages Yet" })
        }

        res.status(200).json({ messages })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error while fetching messages' })
    }
})


router.get('/get-bookings-by-user/:userId', async (req, res) => {
    const { userId } = req.params;

    try {

        const bookings = await bookingSchema.aggregate([
            { $match: { userId: new ObjectId(userId) } },
            {
                $lookup: {
                    from: 'packages',
                    localField: 'packageId',
                    foreignField: '_id',
                    as: 'packageData'
                }
            },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    bookingDate: 1,
                    'packageData.title': 1
                }
            },
            {
                $sort: {
                    bookingDate: -1
                }
            }
        ])

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: 'No bookings found' })
        }

        res.status(200).json({ bookings })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching bookings' })
    }
})


router.delete('/delete-booking/:bookingId', async (req, res) => {
    const { bookingId } = req.params

    try {

        const booking = await bookingSchema.findByIdAndDelete(bookingId)

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.status === 'approved') {
            const result = await packageSchema.updateOne(
                { _id: new ObjectId(booking.packageId) },
                { $inc: { availableSlots: booking.numberOfSeats } }
            )

            if (result.modifiedCount === 0) {
                return res.status(400).json({ message: 'Failed to update available slots' });
            }
        }

        res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred' });
    }
});


router.get('/get-pending-bookings-by-vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params

    try {

        const bookings = await bookingSchema.aggregate([
            {
                $match: {
                    vendorId: new ObjectId(vendorId),
                    status: 'pending'
                }
            },
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
                    as: 'userDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    bookingDate: 1,
                    'packageDetails.title': 1,
                    'userDetails.email': 1,
                }
            },
            {
                $sort: {
                    bookingDate: 1
                }
            }
        ])

        if (!bookings || bookings.length === 0)
            return res.status(404).json({ message: 'No bookings found' })

        res.status(200).json({ bookings })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-approved-bookings-by-vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params

    try {

        const bookings = await bookingSchema.aggregate([
            {
                $match: {
                    vendorId: new ObjectId(vendorId),
                    status: 'approved'
                }
            },
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
                    as: 'userDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    bookingDate: 1,
                    'packageDetails.title': 1,
                    'userDetails.email': 1,
                }
            },
            {
                $sort: {
                    bookingDate: 1
                }
            }
        ])

        if (!bookings || bookings.length === 0)
            return res.status(404).json({ message: 'No bookings found' })

        res.status(200).json({ bookings })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-rejected-bookings-by-vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params

    try {

        const bookings = await bookingSchema.aggregate([
            {
                $match: {
                    vendorId: new ObjectId(vendorId),
                    status: 'rejected'
                }
            },
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
                    as: 'userDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    bookingDate: 1,
                    'packageDetails.title': 1,
                    'userDetails.email': 1,
                }
            },
            {
                $sort: {
                    bookingDate: 1
                }
            }
        ])

        if (!bookings || bookings.length === 0)
            return res.status(404).json({ message: 'No bookings found' })

        res.status(200).json({ bookings })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-vendor-details/:vendorId', async (req, res) => {
    const { vendorId } = req.params;

    try {
        const vendorDetails = await vendorSchema.findById(vendorId, { password: 0 })
        if (!vendorDetails)
            return res.status(404).json({ message: "Vendor not found" })

        res.status(200).json({ vendorDetails })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching vendor details' })
    }
})


router.post('/create-notification', async (req, res) => {
    const { title, body, targetId } = req.body;

    try {
        const result = await createNotification(title, body, targetId);

        if (!result.success)
            return res.status(400).json({ message: result.message || 'TargetId not valid' })

        res.status(200).json({ message: 'Successfully created notification' })
    } catch (error) {
        console.error('api Error while creating notification: ', error);
        res.status(500).json({ message: 'Notification api error' })
    }
})


router.post('/create-admin-notification', async (req, res) => {
    const { title, body } = req.body;

    try {
        const result = await sendAdminNotifications(title, body);

        if (!result.success)
            return res.status(400).json({ message: result.message || 'TargetId not valid' })

        res.status(200).json({ message: 'Successfully created notification' })
    } catch (error) {
        console.error('api Error while creating notification: ', error);
        res.status(500).json({ message: 'Notification api error' })
    }
})


router.get('/get-notification-count/:userId', async (req, res) => {
    const { userId } = req.params

    try {
        const count = await notificationSchema.countDocuments({ targetIds: new ObjectId(userId), isRead: false })
        res.status(200).json({ count })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'failed to get notification' })
    }
})


router.get('/get-notifications/:userId', async (req, res) => {
    const { userId } = req.params

    try {
        const notifications = await notificationSchema
            .find({ targetIds: new ObjectId(userId), isRead: false })
            .sort({ createdAt: -1 })

        if (!notifications || notifications.length === 0)
            return res.status(404).json({ message: "You have no notifications" })

        res.status(200).json({ notifications })
    } catch (error) {
        res.status(500).json({ message: 'No notifications' })
    }
})


router.put('/mark-notification-as-read/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await markAsRead(id)
        if (!result.success) {
            return res.status(400).json({ message: 'Error updating notification as read' })
        }

        res.status(200).json({ message: 'Successfully updated notification as read' })
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Error updating notification as read' })
    }
})

router.put('/mark-notifications-as-read/:targetId', async (req, res) => {
    const { targetId } = req.params;

    try {
        const result = await markAllAsRead(targetId)

        if (!result.success) {
            return res.status(400).json({ message: 'Error updating notifications as read' })
        }

        res.status(200).json({ message: 'Successfully updated notifications as read' })
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Error updating notification as read' })
    }
})


router.get('/get-packages-by-vendor/:vendorId', async (req, res) => {
    const { page, limit } = req.query;
    const { vendorId } = req.params
    try {
        const skip = (page - 1) * limit

        const packages = await packageSchema.find({ vendorId }, {
            title: 1,
            category: 1,
            price: 1,
            destination: 1,
            imageUrl: 1,
            status: 1,
            'rating.avgRating': 1,
            createdAt: 1
        })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: 1 })
        res.status(200).json({ packages })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/search-packages', async (req, res) => {
    const { keyword, vendorId } = req.query;
    if (!keyword)
        return res.status(400).json({ message: 'Keyword is required' })

    try {
        const query = { title: { $regex: `^${keyword}`, $options: 'i' } }

        if (vendorId) query.vendorId = new ObjectId(vendorId)

        const results = await packageSchema.find(query)

        res.status(200).json({ results })
    } catch (error) {
        console.error('Error finding vendors: ', error);
        res.status(500).json({ message: 'Error finding vendors' })
    }
})


router.get('/view-bookings-by-package/:packageId', async (req, res) => {
    const { packageId } = req.params;

    try {
        const bookings = await bookingSchema.aggregate([
            {
                $match: {
                    packageId: new ObjectId(packageId),
                }
            },
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
                    as: 'userDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    bookingDate: 1,
                    status: 1,
                    'packageDetails.title': 1,
                    'userDetails.email': 1,
                }
            },
            {
                $sort: {
                    bookingDate: 1
                }
            }
        ])

        if (!bookings || bookings.length === 0)
            return res.status(404).json({ message: 'No Bookings found' })

        res.status(200).json({ bookings })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching packages' })
    }
})


router.get('/get-payment-details/:orderId', async (req, res) => {
    const { orderId } = req.params

    try {
        const paymentDetails = await getPaymetDetails(orderId)

        res.status(200).json({ paymentDetails })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching payment details' })
    }
})

// router.post('/insert-data', async (req, res) => {
//     const convId = new ObjectId('67889083b109515f6a790484')

//     try {
//         const newMessage = new messageSchema({
//             conversationId: convId,
//             sender: new ObjectId('6768e8410beb1a30ef26038e'),
//             timestamp: new Date(),
//             content: 'Hello are you fine'
//         })
//         await newMessage.save()
//         res.status(200).json({ message: 'successfully inserted data', response: newMessage });
//     } catch (error) {
//         console.log(error)
//         res.status(500).json({ error: error, message: 'failed to insert data' })
//     }
// })

module.exports = router; 