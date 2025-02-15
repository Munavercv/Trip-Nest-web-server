const Packages = require('../models/packages')

module.exports = {
    getUpcomingPackagesOfVendor: async (vendorId, page, limit) => {
        try {
            const today = new Date();
            const tenDaysLater = new Date();
            tenDaysLater.setDate(today.getDate() + 10);

            const packages = await Packages.find({
                vendorId: vendorId,
                status: 'active',
                startDate: { $gte: today, $lte: tenDaysLater }
            })
                .sort({ startDate: 1 })
                .skip((page - 1) * limit)
                .limit(limit);

            return packages;
        } catch (error) {
            console.error("Error fetching upcoming packages:", error);
            throw error;
        }
    },


    getAllUpcomingPackages: async (page, limit) => {
        try {
            const today = new Date();
            const tenDaysLater = new Date();
            tenDaysLater.setDate(today.getDate() + 10);

            const packages = await Packages.find({
                status: 'active',
                startDate: { $gte: today, $lte: tenDaysLater }
            })
                .sort({ startDate: 1 })
                .skip((page - 1) * limit)
                .limit(limit);

            return packages;
        } catch (error) {
            console.error("Error fetching upcoming packages:", error);
            throw error;
        }
    }
}