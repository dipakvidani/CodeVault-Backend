import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "codevaultsecret";

const verifyJWT = asyncHandler(async (req, res, next) => {
  console.log("Auth middleware: verifyJWT entered");
  // 1. Get token from cookie or Authorization header
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  console.log("Token received in verifyJWT:", token);

  if (!token) {
    console.log("No token provided.");
    throw new ApiError({
      statusCode: 401,
      message: "Unauthorized: No token provided",
    });
  }

  try {
    console.log("Using ACCESS_TOKEN_SECRET:", ACCESS_TOKEN_SECRET);
    // 2. Verify token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

    // 3. Find user by ID and remove sensitive info
    const user = await User.findById(decoded?.id).select("-password -refreshToken");
    if (!user) {
      throw new ApiError({
        statusCode: 401,
        message: "Unauthorized: Invalid token user",
      });
    }

    // 4. Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Error caught in middleware:", error.message);
    throw new ApiError({
      statusCode: 401,
      message: "Unauthorized: Invalid token",
    });
  }
});

export default verifyJWT;
