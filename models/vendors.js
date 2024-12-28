const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    businessName: { type: String, required: true },
    businessAddress: {
        state: {
            type: String,
            required: true,
        },
        district: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        pincode: {
            type: String,
            required: true,
        }
    },
    contact: {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        phone: {
            type: String,
            required: true,
        }
    },
    status: {
        type: String,
        required: true,
    },
    packages: {
        type: Array,
    }
}, { collection: 'vendors' });

module.exports = mongoose.model('vendors', vendorSchema);