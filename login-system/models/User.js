const mongoose = require("mongoose");

// Info to be saved in the database
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  flightDetails: {
    date: String,
    destination: String
  }
});

module.exports = mongoose.model("User", UserSchema);
