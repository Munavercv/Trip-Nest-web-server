const express = require('express');
const router = express.Router();
const statesSchema = require('../models/states');


router.get('/get-all-states-data', async (req, res) => {
    try {
        const states = await statesSchema.find({});
        res.status(200).json({states: states})
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error while getting states' })
    }
})


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