import express from "express";
import { registerUser, loginUser, getProfile, resetPassword, forgotPassword, logoutUser } from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/authMiddleware.js";

const router = express.Router();

// @route   POST /api/v1/users/register
router.post("/register", registerUser);

// @route   POST /api/v1/users/login
router.post("/login", loginUser);

// @route   POST /api/v1/users/logout
router.post("/logout", verifyJWT, logoutUser);

// @route   GET /api/v1/users/profile (protected)
router.get("/profile", verifyJWT, getProfile);

// @route   POST /api/v1/users/forgot-password
router.post("/forgot-password", forgotPassword);

// @route   POST /api/v1/users/reset-password/:token
router.post("/reset-password/:token", resetPassword);

export default router;
