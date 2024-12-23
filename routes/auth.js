const express = require('express');
const router = express.Router();
const adminSchema = require('../models/admin')
const userSchema = require('../models/user')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
require('dotenv').config()

const userSchemas = {
    admin: adminSchema,
    user: userSchema,
};

router.post('/signup', async (req, res) => {
    const { password, name, email, phone } = req.body;
    const currentdate = new Date()
    
    try {
        const userExists = await userSchema.findOne({ email })
        const adminExists = await adminSchema.findOne({ email })

        if (userExists || adminExists) {
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

    try {
        const schema = userSchemas[userRole]

        const user = await schema.findOne({ email })

        if (!user) {
            return res.status(400).json({ message: 'User not found' })
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: 'Password does not match' })
        }

        const token = jwt.sign({ userId: user._id, email: email, role: userRole }, process.env.JWT_SECRET, { expiresIn: '5d' })

        res.status(200).json({ token, message: 'Login successfull' })

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }


})

module.exports = router;