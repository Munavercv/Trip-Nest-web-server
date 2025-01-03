const express = require('express');
const router = express.Router();
const ObjectId = require('mongoose').Types.ObjectId;
const userSchema = require('../models/user');
const generateJWT = require('../utils/tokenUtils');
const multer = require('multer')
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require('../utils/s3Client')

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
            const dpKey = user.dpUrl.split('.amazonaws.com/')[1]; // Extract the key from the S3 URL
            const deleteParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: dpKey,
            };

            try {
                await s3.send(new DeleteObjectCommand(deleteParams));
            } catch (error) {
                console.error('Error deleting profile picture from S3:', error);
                res.status(404).json({message: 'Internal server error'})
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

module.exports = router;