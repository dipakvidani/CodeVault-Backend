import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "codevaultsecret";

// Register new user
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, "User already exists with this email");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  if (!user) {
    throw new ApiError(500, "Failed to create user");
  }

  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

// Login user
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Create JWT payload
  const payload = {
    id: user._id,
    email: user.email,
  };

  // Sign token
  const token = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

  // Send token as JSON or cookie
  res.json({
    message: "Login successful",
    accessToken: token,
  });
});

// Optional: Get current user profile
export const getProfile = asyncHandler(async (req, res) => {
  // req.user is set in verifyJWT middleware
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
  });
});
