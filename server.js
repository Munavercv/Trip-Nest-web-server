// const express = require('express')
// const app = express()
// const cors = require('cors')
// const mongoose = require('mongoose');
// const userSchema = require('./models/user')

// const mongoURI = 'mongodb://127.0.0.1:27017/tripNestDB'

// app.use(express.json())
// app.use(cors())

// app.get('/', (req, res) => {
//     res.send('Welcome to Trip Nest!');
// });

// app.get('/login', async (req, res) => {

//     const currentdate = new Date()

//     try {
//         const newUser = new userSchema({
//             name: 'abc',
//             email: 'abcd@gmail.com',
//             phone: "9887676876",
//             password: 'uuuuuuuuuuuuuuuuuuuuuuuuuuuuu',
//             createdAt: currentdate,
//         })

//         const savedUser = await newUser.save();

//         res.status(201).send({
//             message: 'Welcome to Trip Nest!',
//             user:savedUser
//         });

//     } catch (error) {
//         console.error('Error saving user:', error);
//         res.status(500).send({ error: 'Failed to save user' });
//     }

// });

// mongoose.connect(mongoURI)
//     .then(() => {
//         console.log('MongoDb connected successfully');
//     })
//     .catch((err) => {
//         console.error("MongoDb connection error");
//     })

// app.listen(5000, () => {
//     console.log("Server started on port 5000");
// })



const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth')

const mongoURI = 'mongodb://127.0.0.1:27017/tripNestDB'

app.use(express.urlencoded({ extended: false }));
app.use(express.json())
app.use(cors({origin: 'http://localhost:3000'}))

app.use('/api/auth', authRoutes)

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