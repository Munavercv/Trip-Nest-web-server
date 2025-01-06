const mongoose = require('mongoose');

const vendorApplicationSchema = new mongoose.Schema({
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
    supportContacts: {
        email: {
            type: String,
            required: true,
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
    },
    websiteUrl: { type: String },
    logoUrl: { type: String },
    certificateUrl: { type: String, required: true },
    ownerIdUrl: { type: String, required: true },
    regions: { type: Array },
    yearEst: { type: Date, required: true },
    userId: { type: String, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date }
}, { collection: 'vendorApplications' });

module.exports = mongoose.model('vendorApplications', vendorApplicationSchema);