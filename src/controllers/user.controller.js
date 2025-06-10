import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "codevaultsecret";

// Register new user
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError({
      statusCode: 400,
      message: "User already exists with this email"
    });
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
    throw new ApiError({
      statusCode: 500,
      message: "Failed to create user"
    });
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
    throw new ApiError({
      statusCode: 401,
      message: "Invalid email or password"
    });
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError({
      statusCode: 401,
      message: "Invalid email or password"
    });
  }

  // Create JWT payload
  const payload = {
    id: user._id,
    email: user.email,
  };

  // Sign token
  const token = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

  // Set token in HTTP-only cookie
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: false, // Allow non-HTTPS in development
    sameSite: "Lax", // More permissive than Strict
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  res.status(200).json({
    message: "Login successful",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

// Optional: Get current user profile
export const getProfile = asyncHandler(async (req, res) => {
  console.log("User controller: getProfile entered");
  return res.status(200).json(
    new ApiResponse(200, "Profile fetched successfully", req.user)
  );
});

// Logout user
export const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    sameSite: "Lax",
    secure: false,
  });

  res.status(200).json({ message: "Logged out successfully" });
});

import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js"; 

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found with this email");
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  // Save token and expiry on user
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const message = `Reset your password using this link: \n\n ${resetUrl}`;

  await sendEmail({
    to: user.email,
    subject: "Password Reset Link",
    text: message,
  });

  res.status(200).json({ message: "Password reset link sent to email" });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired token");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.status(200).json({ message: "Password reset successful" });
});
