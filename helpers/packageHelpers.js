const Packages = require('../models/packages');
const Bookings = require('../models/bookings')
const { createNotification } = require('../utils/notificationUtils');


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
    },


    checkExpiredPackages: async () => {
        try {
            const today = new Date();

            const expiredPackages = await Packages.find(
                {
                    startDate: { $lt: today },
                    status: { $in: ['active', 'pending', 'approved', 'inactive'] }
                },
                { _id: 1, title: 1, vendorId: 1 }
            );

            if (expiredPackages.length === 0) {
                console.log('No packages to update.');
                return;
            }

            const expiredPackageIds = expiredPackages.map(pkg => pkg._id);

            const packageUpdateResult = await Packages.updateMany(
                {
                    _id: { $in: expiredPackageIds }
                },
                {
                    $set: { status: 'expired', updatedAt: new Date() }
                }
            );

            console.log(`Expired Packages Updated: ${packageUpdateResult.modifiedCount}`);

            const bookingUpdateResult = await Bookings.updateMany(
                {
                    packageId: { $in: expiredPackageIds }
                },
                {
                    $set: { status: 'expired', updatedAt: new Date() }
                }
            );

            console.log(`Expired Bookings Updated: ${bookingUpdateResult.modifiedCount}`);

            const vendorPackagesMap = new Map();

            expiredPackages.forEach(pkg => {
                if (!vendorPackagesMap.has(pkg.vendorId)) {
                    vendorPackagesMap.set(pkg.vendorId, []);
                }
                vendorPackagesMap.get(pkg.vendorId).push(pkg.title);
            });

            for (const [vendorId, packageTitles] of vendorPackagesMap.entries()) {
                await createNotification(
                    `${packageTitles.length} Packages Expired`,
                    `${packageTitles.join(', ')} - Are expired`,
                    vendorId,
                    '/vendor/expired-packages'
                );
            }

        } catch (error) {
            console.error('Error updating expired packages:', error);
        }
    },


    getTrendingPlaces: async (limit) => {
        try {
            const trendingPlaces = await Bookings.aggregate([
                {
                    $match: { status: { $ne: 'expired' } }
                },
                {
                    $lookup: {
                        from: "packages",
                        localField: "packageId",
                        foreignField: "_id",
                        as: "packageDetails"
                    }
                },
                { $unwind: "$packageDetails" },
                {
                    $match: { "packageDetails.status": "active" }
                },
                {
                    $group: {
                        _id: { $arrayElemAt: [{ $split: ["$packageDetails.destination", ","] }, 0] },
                        bookingCount: { $sum: 1 },
                        avgRating: { $avg: "$packageDetails.avgRating" },
                        imageUrl: { $first: "$packageDetails.imageUrl" }
                    }
                },
                {
                    $sort: { bookingCount: -1, avgRating: -1 }
                },
                {
                    $project: {
                        _id: 0,
                        destination: "$_id",
                        imageUrl: 1
                    }
                },
                { $limit: limit }
            ]);

            return trendingPlaces;
        } catch (error) {
            console.error("Error fetching trending places:", error);
            return [];
        }
    }

}