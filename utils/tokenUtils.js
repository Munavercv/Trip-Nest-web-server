const jwt = require('jsonwebtoken');

const generateJWT = (user, role) => {
    const isVendor = role === 'vendor';

    const payload = {
        userId: user._id,
        name: user.name,
        role: role || 'user',
        dpUrl: isVendor ? user.logoUrl : user.dpUrl,
        email: isVendor ? user.contact.email : user.email,
        phone: isVendor ? user.contact.phone : user.phone,
        ...(isVendor ? {} : { isAppliedForVendor: user.isAppliedForVendor }),
    };

    const secretKey = process.env.JWT_SECRET;
    const options = {
        expiresIn: '1d',
    };

    try {
        const token = jwt.sign(payload, secretKey, options);
        return token;
    } catch (error) {
        console.error('Error generating JWT:', {
            error,
            userId: user._id,
            role,
        });
        throw new Error('Could not generate token');
    }
};

module.exports = generateJWT;