const jwt = require('jsonwebtoken');

const generateJWT = (user, role) => {
    const payload = {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dpUrl: user.dpUrl,
        role: role || 'user',
    };

    const secretKey = process.env.JWT_SECRET;
    const options = {
        expiresIn: '1h',
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


// const token = jwt.sign({ userId: user._id, email: email, role: userRole, name: user.name, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '5d' })
