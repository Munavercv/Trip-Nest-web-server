const express = require('express');
const router = express.Router();
const adminSchema = require('../models/admin')
const userSchema = require('../models/user')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
require('dotenv').config()
const passport = require('passport');
const vendorSchema = require('../models/vendors');
const vendorApplicationSchema = require('../models/vendorApplications')
require('../passport')
const generateJWT = require('../utils/tokenUtils')

const userSchemas = {
    admin: adminSchema,
    user: userSchema,
    vendor: vendorSchema
};

router.post('/signup', async (req, res) => {
    const { password, name, email, phone } = req.body;
    const currentdate = new Date()

    try {
        const userExists = await userSchema.findOne({ email })
        const adminExists = await adminSchema.findOne({ email })
        const vendorExists = await vendorSchema.findOne({ 'contact.email': email })

        if (userExists || adminExists || vendorExists) {
            return res.status(400).json({ message: 'User Already exists' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const newUser = new userSchema({
            name: name,
            email: email,
            phone: phone,
            password: hashedPassword,
            createdAt: currentdate,
            updatedAt: currentdate,
        })
        await newUser.save();

        res.status(201).send({
            message: 'Signup successfull',
        });

    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).send({ error: 'Failed to save user' });
    }
})

router.post('/login', async (req, res) => {
    const { email, password, userRole } = req.body
    let user;

    try {
        const schema = userSchemas[userRole]

        if (userRole === 'vendor') {
            user = await schema.findOne({ 'contact.email': email })
        } else {
            user = await schema.findOne({ email })
        }

        if (!user) {
            return res.status(400).json({ message: 'User not found' })
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: 'Incorrect password' });
        }

        const token = generateJWT(user, userRole)

        res.status(200).json({ token, message: 'Login successfull' })

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
})


router.get('/google-auth', passport.authenticate('google', {
    scope:
        ['email', 'profile']
}))


router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: 'http://localhost:3000/auth/login' }),
    async (req, res) => {
        const user = req.user;
        const currentDate = new Date();

        try {
            const userExists = await userSchema.findOneAndUpdate(
                { email: user.emails[0].value },
                {
                    $set: {
                        name: user.displayName,
                        updatedAt: currentDate,
                        isGoogleLogin: true,
                    },
                    $setOnInsert: {
                        createdAt: currentDate,
                    },
                },
                { upsert: true, new: true }
            );

            const jwt = generateJWT(userExists);

            res.redirect(`http://localhost:3000/auth/login?token=${jwt}`);
        } catch (error) {
            console.error('Error during Google login:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
);


router.put('/activate-vendor-account/:applicationId', async (req, res) => {
    const { password } = req.body;
    const { applicationId } = req.params;

    try {
        const application = await vendorApplicationSchema.findByIdAndUpdate(applicationId,
            {
                $set: {
                    status: 'activated'
                }
            },
            { new: true },
        )

        if (!application) {
            return res.status(404).json({ message: 'Application not found!' })
        }

        const existingVendor = await vendorSchema.findOne({ applicationId: applicationId })
        if (existingVendor) {
            return res.status(400).json({ message: 'Vendor account already found for this application' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newVendor = new vendorSchema({
            name: application.businessName,
            contact: {
                ...application.contact
            },
            supportContact: {
                ...application.supportContacts
            },
            address: {
                ...application.businessAddress
            },
            applicationId: application._id,
            logoUrl: application.logoUrl,
            websiteUrl: application.websiteUrl,
            status: 'active',
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        await newVendor.save()

        res.status(200).json({ message: 'Successfully activated vendor account' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error while activating your account!' })
    }
})

module.exports = router;