const mongoose = require('mongoose');

const statesSchema = new mongoose.Schema({
    state: { type: String, unique: true, required: true },
    districts: { type: Array, required: true },
}, { collection: 'states' });

module.exports = mongoose.model('states', statesSchema)