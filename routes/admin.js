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


router.get('/get-vendor-details/:vendorId', async (req, res) => {
    const { vendorId } = req.params

    try {
        const vendorDetails = await vendorSchema.findOne({ _id: new ObjectId(vendorId) })
        res.status(200).json({ vendorDetails: vendorDetails })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' })
    }

})


router.put('/vendor-status-update/:vendorId', async (req, res) => {
    const { vendorId } = req.params
    const { status } = req.body
    try {
        const response = await vendorSchema.updateOne({ _id: new ObjectId(vendorId) }, {
            $set: { status: status }
        })
        if (response.matchedCount === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.status(200).json({ message: 'Successfully updated vendor status' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.delete('/delete-vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params;

    try {
        const response = await vendorSchema.deleteOne({ _id: new ObjectId(vendorId) })

        if (response.deletedCount === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.status(200).json({ message: 'Successfully deleted Vendor account' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.post('/edit-vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params;
    const updatedData = req.body.data;

    try {

        console.log(updatedData.state, updatedData.district, updatedData.address);
        
        const response = await vendorSchema.updateOne({ _id: new ObjectId(vendorId) }, {
            $set: {
                businessName: updatedData.businessName,
                contact: {
                    email: updatedData.email,
                    phone: updatedData.phone,
                },
                businessAddress: {
                    state: updatedData.state,
                    district: updatedData.district,
                    address: updatedData.address,
                    pincode: updatedData.pincode,
                },
                updatedAt: new Date(),
            }
        })

        if (response.matchedCount === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.status(200).json({ message: 'Vendor updated successfully' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-all-users', async (req, res) => {
    try {
        const users = await userSchema.find({}, { name: 1, email: 1 })
        res.status(200).json({ users: users, message: 'Successfully get all users' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error', error })
    }
})


router.get('/search-users', async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return res.status(400).json({ message: 'Keyword is required' })
        }
        const users = await userSchema.find({
            $or: [
                { name: { $regex: `^${keyword}`, $options: 'i' } },
                { email: { $regex: `^${keyword}`, $options: 'i' } }
            ]
        })

        res.status(200).json({ users: users })
    } catch (error) {
        console.error('Error searching users: ', error)
    }
})


router.get('/get-user-details/:userId', async (req, res) => {
    const { userId } = req.params
    try {
        const userDetails = await userSchema.find({ _id: new ObjectId(userId) }, { password: 0 })
        res.status(200).json({ userDetails: userDetails, message: 'Successfully get all users' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error', error })
    }
})


router.put('/edit-user/:userId', async (req, res) => {
    const { userId } = req.params;
    const updatedData = req.body.data

    try {
        const response = await userSchema.updateOne({ _id: new ObjectId(userId) }, {
            $set: {
                name: updatedData.name,
                email: updatedData.email,
                phone: updatedData.phone,
                updatedAt: new Date(),
            }
        })

        if (response.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'user updated successfully' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }

})


router.delete('/delete-user/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
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