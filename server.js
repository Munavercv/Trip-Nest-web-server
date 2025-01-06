const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin')
const userRoutes = require('./routes/user');
const commonRoutes = require('./routes/common')
const session = require('express-session');
const passport = require('passport');

const mongoURI = 'mongodb://127.0.0.1:27017/tripNestDB'

app.use(express.urlencoded({ extended: false }));
app.use(express.json())
app.use(cors({ origin: 'http://localhost:3000' }))


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

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/user', userRoutes)
app.use('/api/common', commonRoutes)

mongoose.connect(mongoURI)
    .then(() => {
        console.log('MongoDb connected successfully');
    })
    .catch((err) => {
        console.error("MongoDb connection error");
    })

app.listen(5000, () => {
    console.log("Server started on port 5000");
})