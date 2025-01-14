const express = require('express');
const router = express.Router();
const multer = require('multer')
const s3 = require('../utils/s3Client')
const { PutObjectCommand } = require('@aws-sdk/client-s3')
const packageSchema = require('../models/packages')

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
        const fileKey = `Vendor/${Date.now()}-${image.originalname} `
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
        await newPackage.save();

        res.status(200).json({ message: 'Package added successfully' })
    } catch (error) {
        console.error(error.message);
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
    const {id} = req.params
    try {
        const package = await packageSchema.findByIdAndUpdate(id, {
            $set: {
                status: 'active'
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
    const {id} = req.params
    try {
        const package = await packageSchema.findByIdAndUpdate(id, {
            $set: {
                status: 'inactive'
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

module.exports = router; 