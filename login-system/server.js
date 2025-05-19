const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const fetch = require('node-fetch'); // Add this line
const User = require('./models/User');

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.listen(5005, () => console.log("Server running on port 5005"));

const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

// Helper: Get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Fetch and cache health data from disease.sh
let countryRiskCache = {};
let lastCacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

async function updateCountryRiskCache() {
    // Only update if cache is old
    if (Date.now() - lastCacheTime < CACHE_DURATION) return;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const res = await fetch('https://disease.sh/v3/covid-19/countries', { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        countryRiskCache = {};
        data.forEach(country => {
            // Assign risk level based on daily cases
            let riskLevel = 'low';
            if (country.todayCases > 10000) riskLevel = 'high';
            else if (country.todayCases > 1000) riskLevel = 'medium';
            countryRiskCache[country.country.toLowerCase()] = riskLevel;
        });
        lastCacheTime = Date.now();
        console.log('Updated country risk cache');
    } catch (err) {
        console.error('Failed to update country risk cache:', err.message || err);
        // Do not throw; just keep the old cache
    }
}

// Improved risk level checker using real data
async function getRiskLevelForCountry(destination) {
    await updateCountryRiskCache();
    if (!destination) return 'unknown';
    // Try to match by country name (case-insensitive)
    const dest = destination.toLowerCase().trim();
    // Try exact match
    if (countryRiskCache[dest]) return countryRiskCache[dest];
    // Try partial match (for "City, Country" or similar)
    const parts = dest.split(',').map(s => s.trim());
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        if (countryRiskCache[part]) return countryRiskCache[part];
    }
    // Not found
    return 'unknown';
}

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Cron job: Every 12AM Philippine time (16 hours ahead of UTC) 
cron.schedule('0 0 * * *', async () => {
    const today = getTodayDate();
    try {
        const users = await User.find({ "flightDetails.date": today });
        for (const user of users) {
            const { destination, date } = user.flightDetails;
            const riskLevel = await getRiskLevelForCountry(destination);

            let safetyMsg = '';
            if (riskLevel === 'high') {
                safetyMsg = `⚠️ It is NOT safe to travel to ${destination} today.`;
            } else if (riskLevel === 'medium') {
                safetyMsg = `⚠️ There are some risks traveling to ${destination} today.`;
            } else if (riskLevel === 'low') {
                safetyMsg = `✅ It is safe to travel to ${destination} today.`;
            } else {
                safetyMsg = `⚠️ Safety data for ${destination} is unavailable.`;
            }

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: `SafeFlight: Travel Safety Notification for your flight to ${destination}`,
                text: `Hello,\n\nYour flight to ${destination} is scheduled for today (${date}).\n\nSafety assessment: ${safetyMsg}\n\nSafe travels!\n\n- SafeFlight`
            };

            await transporter.sendMail(mailOptions);
            console.log(`Sent safety email to ${user.email} for flight to ${destination}`);
        }
    } catch (err) {
        console.error('Error sending flight safety emails:', err);
    }
}, {
    timezone: 'Asia/Manila'
});

// manual trigger (para lang makita pag nagd-demo)
if (process.env.NODE_ENV !== 'production') {
    (async () => {
        const today = getTodayDate();
        try {
            const users = await User.find({ "flightDetails.date": today });
            for (const user of users) {
                const { destination, date } = user.flightDetails;
                const riskLevel = await getRiskLevelForCountry(destination);

                let safetyMsg = '';
                if (riskLevel === 'high') {
                    safetyMsg = `⚠️ It is NOT safe to travel to ${destination} today.`;
                } else if (riskLevel === 'medium') {
                    safetyMsg = `⚠️ There are some risks traveling to ${destination} today.`;
                } else if (riskLevel === 'low') {
                    safetyMsg = `✅ It is safe to travel to ${destination} today.`;
                } else {
                    safetyMsg = `⚠️ Safety data for ${destination} is unavailable.`;
                }

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: `SafeFlight: Travel Safety Notification for your flight to ${destination}`,
                    text: `Hello,\n\nYour flight to ${destination} is scheduled for today (${date}).\n\nSafety assessment: ${safetyMsg}\n\nSafe travels!\n\n- SafeFlight`
                };

                await transporter.sendMail(mailOptions);
                console.log(`Sent safety email to ${user.email} for flight to ${destination}`);
            }
        } catch (err) {
            console.error('Error sending flight safety emails:', err);
        }
    })();
}