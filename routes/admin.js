const express = require('express');
const router = express.Router();
const vendorSchema = require('../models/vendors');
const userSchema = require('../models/user')
const packageSchema = require('../models/packages');
const paymentSchema = require('../models/payments');
const ObjectId = require('mongoose').Types.ObjectId;


router.get('/get-vendors-count', async (req, res) => {
    try {
        const vendorsCount = await vendorSchema.countDocuments({ status: 'active' })

        res.status(200).json({ count: vendorsCount })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' })
    }
});


router.get('/get-packages-count', async (req, res) => {
    try {
        const packagesCount = await packageSchema.countDocuments({ status: 'active' })

        res.status(200).json({ count: packagesCount })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' })
    }
});


router.get('/get-users-count', async (req, res) => {
    try {
        const usersCount = await userSchema.countDocuments()

        res.status(200).json({ count: usersCount })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' })
    }
});


router.get('/get-payments-count', async (req, res) => {
    try {
        const paymentsCount = await paymentSchema.countDocuments()

        res.status(200).json({ count: paymentsCount })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' })
    }
});


router.get('/all-active-vendors', async (req, res) => {
    try {
        const vendors = await vendorSchema.find({ status: 'active' }, {
            businessName: 1,
            'contact.email': 1,
        })
        res.status(200).json({ vendors: vendors })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/all-pending-vendors', async (req, res) => {
    try {
        const vendors = await vendorSchema.find({ status: 'pending' }, {
            businessName: 1,
            'contact.email': 1,
        })
        res.status(200).json({ vendors: vendors })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/all-rejected-vendors', async (req, res) => {
    try {
        const vendors = await vendorSchema.find({ status: 'rejected' }, {
            businessName: 1,
            'contact.email': 1,
        })
        res.status(200).json({ vendors: vendors })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/all-disabled-vendors', async (req, res) => {
    try {
        const vendors = await vendorSchema.find({ status: 'disabled' }, {
            businessName: 1,
            'contact.email': 1,
        })
        res.status(200).json({ vendors: vendors })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-package-details/:vendorId', async (req, res) => {
    const { vendorId } = req.params

    try {
        const vendorDetails = await vendorSchema.findOne({ _id: new ObjectId(vendorId) })
        res.status(200).json({ vendorDetails: vendorDetails })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' })
    }

})


//API TO INSERT TEST DATA
// router.get('/insert-data', async (req, res) => {
//     const currentDate = Date.now()

//     try {
//         const response = await paymentSchema.create({
//             userId: '6768e8410beb1a30ef26038e', 
//             vendorId: '676d01860118c1d67b2710bc',
//             amount: 1999.00,
//             success: true,
//             transactionId: 'uueryuy8787475345',
//             date: currentDate,
//         })
//         res.status(200).json({ message: 'successfully inserted data', response: response });
//     } catch (error) {
//         console.log(error)
//         res.status(500).json({ error: error, message: 'failed to insert data' })
//     }
// })

module.exports = router;