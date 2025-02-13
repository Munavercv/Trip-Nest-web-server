const Terms = require('../models/termsAndConditions')

module.exports = {
    getTermsByName: async (name) => {
        try {
            const terms = await Terms.findOne({ name })
            return terms
        } catch (error) {
            throw error
        }
    }
}

// getPaymentsByUser: async (userId) => {
//     try {
//         const payments = await Payment.find({ userId })
//             .populate('vendorId', 'contact.email')
//             .populate('userId', 'email')
//             .sort({ date: -1 })
//         return payments
//     } catch (error) {
//         console.error(error);
//         throw error
//     }
// },