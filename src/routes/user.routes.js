import express from "express";
import { registerUser, loginUser, getProfile } from "../controllers/user.controller.js.js";
import verifyJWT from "../middlewares/authMiddleware.js";

const router = express.Router();

// @route   POST /api/v1/users/register
router.post("/register", registerUser);

// @route   POST /api/v1/users/login
router.post("/login", loginUser);

// @route   GET /api/v1/users/profile (protected)
router.get("/profile", verifyJWT, getProfile);

export default router;
