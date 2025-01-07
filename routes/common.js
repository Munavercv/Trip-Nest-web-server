const express = require('express');
const router = express.Router();
const statesSchema = require('../models/states');
const userSchema = require('../models/user')
const vendorApplicationSchema = require('../models/vendorApplications');
// const ObjectId = require('mongoose').Types.ObjectId;
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require('../utils/s3Client')
const generateJWT = require('../utils/tokenUtils')


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



//API TO INSERT TEST DATA
// router.post('/insert-data', async (req, res) => {

//     try {
//         const newState = new statesSchema({
//             state: 'Kerala',
//             districts: ['Kasaragod', 'Kannur', 'Kozhikode', 'Wayanad', 'Malappuram', 'Palakkad', 'Ernakulam', 'Kollam', 'Trissur']
//         })
//         await newState.save()
//         res.status(200).json({ message: 'successfully inserted data', response: newState });
//     } catch (error) {
//         console.log(error)
//         res.status(500).json({ error: error, message: 'failed to insert data' })
//     }
// })

module.exports = router; 