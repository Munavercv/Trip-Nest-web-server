const jwt = require('jsonwebtoken');

const generateJWT = (user, role) => {
    const payload = {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dpUrl: user.dpUrl,
        role: role || 'user',
        isAppliedForVendor: user.isAppliedForVendor,
    };

    const secretKey = process.env.JWT_SECRET;
    const options = {
        expiresIn: '1d',
    };

    try {
        const token = jwt.sign(payload, secretKey, options);
        return token;
    } catch (error) {
        console.error('Error generating JWT:', error);
        throw new Error('Could not generate token');
    }
};

module.exports = generateJWT;