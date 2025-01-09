const express = require('express');
const router = express.Router();
const ObjectId = require('mongoose').Types.ObjectId;
const userSchema = require('../models/user');
const vendorApplicationSchema = require('../models/vendorApplications')
const vendorSchema = require('../models/vendors')
const generateJWT = require('../utils/tokenUtils');
const multer = require('multer')
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require('../utils/s3Client')

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
            const dpKey = user.dpUrl.split('.amazonaws.com/')[1]; // Extract the key from the S3 URL
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

            await newVendorApplication.save()

            const user = await userSchema.findByIdAndUpdate(sendUser, {
                $set: {
                    isAppliedForVendor: true,
                },
            },
                { new: true }
            )
            const role = 'user'
            const token = generateJWT(user, role);

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


module.exports = router; 