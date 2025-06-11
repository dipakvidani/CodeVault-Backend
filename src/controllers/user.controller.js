import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import sendEmail from "../utils/sendEmail.js";
import logger from "../utils/logger.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// Register new user
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    throw new ApiError({
      statusCode: 400,
      message: "User already exists with this email or username"
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
  });

  if (!user) {
    throw new ApiError({
      statusCode: 500,
      message: "Failed to create user"
    });
  }

  // Generate tokens
  const accessToken = jwt.sign(
    { id: user._id, email: user.email },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  // Send welcome email
  try {
    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to CodeVault!</h2>
        <p>Hi ${user.username},</p>
        <p>Thank you for registering your account with CodeVault. We're excited to have you!</p>
        <p>Start storing and sharing your code snippets securely.</p>
        <p>Best regards,</p>
        <p>The CodeVault Team</p>
      </div>
    `;
    const welcomeText = `Welcome to CodeVault, ${user.username}! Thank you for registering your account.`;
    await sendEmail({
      to: user.email,
      subject: "Welcome to CodeVault!",
      text: welcomeText,
      html: welcomeHtml
    });
    logger.info('Welcome email sent successfully', { email: user.email });
  } catch (emailError) {
    logger.error('Failed to send welcome email', {
      error: emailError.message,
      email: user.email
    });
  }

  res.status(201).json({
    message: "Registration successful",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    token: accessToken,
    refreshToken
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

  // Generate tokens
  const accessToken = jwt.sign(
    { id: user._id, email: user.email },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  // Send login notification email
  try {
    const loginHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Login Notification</h2>
        <p>Hi ${user.username},</p>
        <p>This is a notification that your CodeVault account was just logged into.</p>
        <p>If this was not you, please change your password immediately.</p>
        <p>Login Time: ${new Date().toLocaleString()}</p>
        <p>Best regards,</p>
        <p>The CodeVault Team</p>
      </div>
    `;
    const loginText = `Hi ${user.username}, your CodeVault account was just logged into at ${new Date().toLocaleString()}. If this was not you, please change your password immediately.`;
    await sendEmail({
      to: user.email,
      subject: "CodeVault Account Login Notification",
      text: loginText,
      html: loginHtml
    });
    logger.info('Login notification email sent successfully', { email: user.email });
  } catch (emailError) {
    logger.error('Failed to send login notification email', {
      error: emailError.message,
      email: user.email
    });
  }

  res.status(200).json({
    message: "Login successful",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    token: accessToken,
    refreshToken
  });
});

// Get current user profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  
  return res.status(200).json({
    id: user._id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });
});

// Logout user
export const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "Logout successful" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  logger.info('Forgot password request received', { email });

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    logger.warn('Password reset requested for non-existent email', { email });
    // Don't reveal that the user doesn't exist
    return res.status(200).json({ message: "If an account exists with this email, you will receive a password reset link" });
  }

  try {
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save token and expiry on user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    // Create HTML email template
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>You requested a password reset for your CodeVault account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Reset Password
        </a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          ${resetUrl}
        </p>
      </div>
    `;

    const text = `Reset your password using this link: ${resetUrl}`;

    await sendEmail({
      to: user.email,
      subject: "Reset Your CodeVault Password",
      text,
      html
    });

    logger.info('Password reset email sent successfully', { email: user.email });
    res.status(200).json({ message: "If an account exists with this email, you will receive a password reset link" });
  } catch (error) {
    logger.error('Failed to send password reset email', { 
      error: error.message,
      email: user.email 
    });
    
    // Reset the token fields if email sending fails
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    throw new ApiError(500, "Failed to send password reset email. Please try again later.");
  }
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
