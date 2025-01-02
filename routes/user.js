const express = require('express');
const router = express.Router();
const ObjectId = require('mongoose').Types.ObjectId;
const userSchema = require('../models/user');
const generateJWT = require('../utils/tokenUtils');


router.put('/edit-profile/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name, email, phone } = req.body.data

    if (!name || !email || !phone) {
        return res.status(400).json({ message: 'Name, email, and phone are required' });
    }

    try {
        const updatedUser = await userSchema.findByIdAndUpdate(
            userId,
            {
                $set: {
                    name,
                    email,
                    phone,
                    updatedAt: new Date(),
                },
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const role = 'user'
        const token = generateJWT(updatedUser, role)

        res.status(200).json({ message: 'User updated successfully', token: token });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
})

module.exports = router;