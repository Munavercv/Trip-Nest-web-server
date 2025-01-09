const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact: {
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true }
    },
    supportContact: {
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true }
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'vendorApplications',
        required: true
    },
    address: {
        state: { type: String },
        district: { type: String },
        address: { type: String },
        pincode: { type: String },
    },
    logoUrl: { type: String },
    websiteUrl: { type: String },
    status: { type: String, required: true, default: 'active' },
    password: { type: String, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date },
}, { collection: 'vendors' });

module.exports = mongoose.model('vendors', vendorSchema);