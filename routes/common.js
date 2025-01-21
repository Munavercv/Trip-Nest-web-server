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
const ObjectId = require('mongoose').Types.ObjectId;


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