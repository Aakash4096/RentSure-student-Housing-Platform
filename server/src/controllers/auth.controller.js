const User = require("../models/User");
const jwt = require("jsonwebtoken");
const config = require("../config/env");

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
};

// Cookie options — defined once, used everywhere
const cookieOptions = {
  httpOnly: true, // JS cannot read
  secure: config.isProduction, // HTTPS only in production
  sameSite: "strict", // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

// Register user
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({ name, email, password, role });

    const token = generateToken(user._id, user.role);

    // Set token in httpOnly cookie
    res.cookie("token", token, cookieOptions);

    res.status(201).json({
      message: "Registration successful",
      user: user.toJSON(),
      // token is NOT sent in body anymore
    });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ message: "Registration failed" });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id, user.role);

    // Set token in httpOnly cookie
    res.cookie("token", token, cookieOptions);

    res.json({
      message: "Login successful",
      user: user.toJSON(),
      // token is NOT sent in body anymore
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Login failed" });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error("GetMe error:", error.message);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

// Logout — clear the cookie
const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "strict",
  });
  res.json({ message: "Logged out successfully" });
};

module.exports = { register, login, getMe, logout };
