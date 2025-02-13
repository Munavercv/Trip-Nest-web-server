const notificationSchema = require('../models/notifications')
const mongoose = require('mongoose')
const ObjectId = require('mongoose').Types.ObjectId;

const createNotification = async (title, body, targetIds, navLink) => {

    if (!title || targetIds.length === 0) {
        console.error('Missing required fields: title or targetIds');
        return { success: false, message: 'Missing required fields' };
    }

    const targetIdsArray = targetIds.split(",").map(id => id.trim())

    targetIdsArray.map((id) => {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error('Invalid targetId');
            return { success: false, message: `Invalid targetId : ${id}` };
        }
    })

    try {
        const newNotification = new notificationSchema({
            title,
            body,
            targetIds: targetIdsArray,
            navLink
        })

        await newNotification.save()

        return { success: true, message: 'Notification created successfully' };
    } catch (error) {
        console.error("error creating notification", error);
        return { success: false, message: 'Error creating notification' };
    }
}


const markAsRead = async (id) => {
    try {

        await notificationSchema.findByIdAndUpdate({ _id: new ObjectId(id) }, {
            $set: { isRead: true }
        })
        
        return {success: true, message: 'Notification marked as read'}
    } catch (error) {
        console.log(error);
        return {success: false, message: 'Failed to mark as read'}
    }
}


const markAllAsRead = async(targetId) => {
    try {
        await notificationSchema.updateMany({targetIds: new ObjectId(targetId)}, {
            $set: {isRead: true}
        })

        return {success: true, message: 'Notifications marked as read'}
    } catch (error) {
        console.log(error);
        return {success: false, message: 'Failed to mark as read'}
    }
}

const sendAdminNotifications = async (title, body, navLink) => {

    const adminIds = process.env.ADMIN_IDS.split(',');
    
    if (!title) {
        console.error('Missing required fields: title or targetIds');
        return { success: false, message: 'Missing required fields' };
    }

    adminIds.map((id) => {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error('Invalid targetId');
            return { success: false, message: `Invalid targetId : ${id}` };
        }
    })

    try {
        const newNotification = new notificationSchema({
            title,
            body,
            targetIds: adminIds,
            navLink,
        })

        await newNotification.save()

        return { success: true, message: 'Notification created successfully' };
    } catch (error) {
        console.error("error creating notification", error);
        return { success: false, message: 'Error creating notification' };
    }

}

module.exports = {createNotification, markAsRead, markAllAsRead, sendAdminNotifications};