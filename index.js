require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongodb = process.env.MONGODB
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(mongodb, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define User schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    joinedAt: {
        type: Date,
        default: Date.now,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    streak: {
        type: Number,
        default: 0,
    },
    streakClaimedOn: {
        type: Date,
        default: null,
    }
});

const User = mongoose.model('User', userSchema);


// Register Route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        await User.findOneAndUpdate({ username }, { lastLogin: new Date() });
        res.status(200).json({ username: user.username, joinedAt: user.joinedAt, lastLogin: user.lastLogin });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


function areConsecutiveDays(date1, date2) {
    const oneDayInMillis = 24 * 60 * 60 * 1000;
    const diffInDays = Math.abs((date1 - date2) / oneDayInMillis);
    return diffInDays < 2;
}
//Update Streak
app.post('/add-streak', async (req, res) => {
    const { username } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentDate = new Date();

        if (!user.lastLogin || !areConsecutiveDays(currentDate, user.lastLogin)) {
            user.streak = 1;
            user.lastLogin = currentDate;
            user.streakClaimedOn = currentDate;
            await user.save();
            return res.status(200).json({ 
                message: 'Streak Lost!',            
                username: user.username,
                joinedAt: user.joinedAt,
                lastLogin: user.lastLogin,
                streak: user.streak,
                streakClaimedOn: user.streakClaimedOn,});
        } else if (user.streakClaimedOn && areConsecutiveDays(currentDate, user.streakClaimedOn)) {
            return res.status(200).json({ 
            message: 'Streak already claimed for today',            
            username: user.username,
            joinedAt: user.joinedAt,
            lastLogin: user.lastLogin,
            streak: user.streak,
            streakClaimedOn: user.streakClaimedOn, });
        } else {
            user.streak += 1;
        }

        user.lastLogin = currentDate;
        user.streakClaimedOn = currentDate;

        await user.save();

        res.status(200).json({
            message: 'Hurray!! Keep it Up Lad!',
            username: user.username,
            joinedAt: user.joinedAt,
            lastLogin: user.lastLogin,
            streak: user.streak,
            streakClaimedOn: user.streakClaimedOn,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});