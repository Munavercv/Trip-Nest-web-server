const express = require('express');
const router = express.Router();
const vendorSchema = require('../models/vendors');
const userSchema = require('../models/user')
const packageSchema = require('../models/packages');
const paymentSchema = require('../models/payments');
const vendorApplicationSchema = require('../models/vendorApplications')
const ObjectId = require('mongoose').Types.ObjectId;
const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
const s3 = require('../utils/s3Client')


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


router.get('/get-pending-applications', async (req, res) => {
    try {
        const applications = await vendorApplicationSchema.find({ status: 'pending' }, {
            businessName: 1,
        });
        if (!applications || applications.length === 0) {
            return res.status(404).json({ message: 'No Applications found' })
        }
        res.status(200).json({ applications })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-approved-applications', async (req, res) => {
    try {
        const applications = await vendorApplicationSchema.find({ status: 'approved' }, {
            businessName: 1,
        });
        if (!applications || applications.length === 0) {
            return res.status(400).json({ message: 'No Applications found' })
        }
        res.status(200).json({ applications })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-rejected-applications', async (req, res) => {
    try {
        const applications = await vendorApplicationSchema.find({ status: 'rejected' }, {
            businessName: 1,
        });
        if (!applications || applications.length === 0) {
            return res.status(404).json({ message: 'No Applications found' })
        }
        res.status(200).json({ applications })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-activated-applications', async (req, res) => {
    try {
        const applications = await vendorApplicationSchema.find({ status: 'activated' }, {
            businessName: 1,
        });
        if (!applications || applications.length === 0) {
            return res.status(404).json({ message: 'No Applications found' })
        }
        res.status(200).json({ applications })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/get-application/:id', async (req, res) => {
    const { id } = req.params
    try {
        const application = await vendorApplicationSchema.findById(id)

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const user = await userSchema.findById(application.userId, {
            name: 1,
            email: 1,
        })

        if (!user) {
            return res.status(404).json({ message: 'Error while finding user' })
        }

        res.status(200).json({ application: application, user })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching application' })
    }

})


router.put('/approve-application/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const application = await vendorApplicationSchema.findByIdAndUpdate(id, {
            $set: { status: 'approved' }
        },
            { new: true }
        )

        if (!application) {
            return res.status(404).json({ message: 'No application found' })
        }

        res.status(200).json({ application })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error while Approve application' })
    }
})


router.put('/reject-application/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const application = await vendorApplicationSchema.findByIdAndUpdate(id, {
            $set: { status: 'rejected' }
        },
            { new: true }
        )

        if (!application) {
            return res.status(404).json({ message: 'No application found' })
        }

        res.status(200).json({ application })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error while Approve application' })
    }
})


router.delete('/delete-application/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const response = await vendorApplicationSchema.findByIdAndDelete(id);

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

        const user = await userSchema.findByIdAndUpdate(response.userId, {
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


router.get('/all-active-vendors', async (req, res) => {
    try {
        const vendors = await vendorSchema.find({ status: 'active' }, {
            name: 1,
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
            name: 1,
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


router.get('/get-all-pending-packages', async (req, res) => {
    try {
        const packages = await packageSchema.find({ status: "pending" }, {
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
        res.status(500).json({ message: 'Error while fetching packages' })
    }
})


router.get('/get-all-approved-packages', async (req, res) => {
    try {
        const packages = await packageSchema.find({ status: "approved" }, {
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
        res.status(500).json({ message: 'Error while fetching packages' })
    }
})


router.get('/get-all-rejected-packages', async (req, res) => {
    try {
        const packages = await packageSchema.find({ status: "rejected" }, {
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
        res.status(500).json({ message: 'Error while fetching packages' })
    }
})


router.get('/get-all-active-packages', async (req, res) => {
    try {
        const packages = await packageSchema.find({ status: "active" }, {
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
        res.status(500).json({ message: 'Error while fetching packages' })
    }
})


router.get('/get-all-inactive-packages', async (req, res) => {
    try {
        const packages = await packageSchema.find({ status: "inactive" }, {
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
        res.status(500).json({ message: 'Error while fetching packages' })
    }
})


router.put('/approve-package/:id', async (req, res) => {
    const { id } = req.params

    try {
        const package = await packageSchema.findByIdAndUpdate(id, {
            $set: {
                status: 'approved',
                updatedAt: new Date()
            },
            $unset: { rejectionReason: '' }
        },
            { new: true }
        )

        if (!package) {
            return res.status(404).json({ message: 'Package not found' })
        }

        res.status(200).json({ message: 'Package approved successfully', package })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error while approving package' })
    }
})


router.put('/reject-package/:id', async (req, res) => {
    const { id } = req.params
    const { rejectionReason } = req.body

    try {
        const package = await packageSchema.findByIdAndUpdate(id, {
            $set: {
                status: 'rejected',
                rejectionReason,
                updatedAt: new Date()
            }
        },
            { new: true }
        )

        if (!package) {
            return res.status(404).json({ message: 'Package not found' })
        }

        res.status(200).json({ message: 'Package rejected successfully', package })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error while rejecting package' })
    }
})

module.exports = router;