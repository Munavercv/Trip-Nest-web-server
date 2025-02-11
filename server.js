const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const vendorRoutes = require('./routes/vendor');
const commonRoutes = require('./routes/common');
const session = require('express-session');
const passport = require('passport');
const http = require('http');
const { Server } = require('socket.io');
const ObjectId = require('mongoose').Types.ObjectId;

const conversationSchema = require('./models/conversation');
const messageSchema = require('./models/message')

// const mongoURI = 'mongodb://127.0.0.1:27017/tripNestDB';
const mongoURI = 'mongodb://admin:pass123@127.0.0.1:27017/tripNestDB?authSource=admin'

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({ origin: 'https://tripnest.xyz' }));
// app.use(cors({ origin: 'http://localhost:3000' }));

app.use(
    session({
        secret: 'your_secret_key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/common', commonRoutes);

mongoose
    .connect(mongoURI)
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'https://tripnest.xyz',
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {

    socket.on('join-chat', (conversationId) => {
        socket.join(conversationId);
    });

    socket.on('send-message', async (messageData) => {
        try {
            const { conversationId, sender, content } = messageData;

            const newMessage = await messageSchema.create({
                conversationId: new ObjectId(conversationId),
                sender: new ObjectId(sender),
                content,
                timestamp: new Date(),
            });

            await conversationSchema.findByIdAndUpdate(
                conversationId,
                {
                    $set: {
                        lastMessage: {
                            content,
                            timestamp: new Date(),
                            sender: new ObjectId(sender),
                        },
                    },
                },
                { new: true }
            );

            io.to(conversationId).emit('receive-message', {
                ...messageData,
                timestamp: newMessage.timestamp,
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(5000, () => {
    console.log('Server started on port 5000');
});