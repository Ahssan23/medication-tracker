const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/users");
const jwt = require("jsonwebtoken");
const router = express.Router();

// ✅ Register (Signup)
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Signup successful ✅",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (err) {
    console.log("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, existingUser.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }


const token = jwt.sign({ userId: existingUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

res.json({
  message: "Login successful ✅",
  user: {
    _id: existingUser._id,
    name: existingUser.name,
    email: existingUser.email,
  },
  token: token
});  } catch (err) {
    console.log("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
