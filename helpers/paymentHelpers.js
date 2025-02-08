const Payment = require('../models/payments')
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = {
    getPaymentsByUser: async (userId) => {
        try {
            const payments = await Payment.find({ userId })
                .populate('vendorId', 'contact.email')
                .populate('userId', 'email')
                .sort({ date: -1 })
            return payments
        } catch (error) {
            console.error(error);
            throw error
        }
    },

    getAllPaymentsByVendor: async (vendorId) => {
        try {
            const payments = await Payment.find({ vendorId })
                .populate('vendorId', 'contact.email')
                .populate('userId', 'email')
                .sort({ date: -1 })
            return payments
        } catch (error) {
            console.error(error);
            throw error
        }
    },

    getPaymetDetails: async (orderId) => {
        try {
            const paymentDetails = await Payment.findOne({ orderId })
                .populate({
                    path: 'bookingId',
                    populate: {
                        path: 'packageId',
                        select: 'title description',
                    },
                })
                .populate('vendorId', 'contact.email')
                .populate('userId', 'email')

            return paymentDetails;
        } catch (error) {
            console.error(error);
            throw error
        }
    },

    calculateCurrentMonthRevenue : async (vendorId) => {
        try {
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
    
            const result = await Payment.aggregate([
                {
                    $match: {
                        vendorId : new ObjectId(vendorId),
                        date: { $gte: startOfMonth, $lte: endOfMonth },
                        status: 'paid'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$amount' }
                    }
                }
            ]);
    
            const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;
    
            return totalRevenue;
        } catch (error) {
            console.error('Error calculating current month revenue:', error);
            throw error;
        }
    }
    
}