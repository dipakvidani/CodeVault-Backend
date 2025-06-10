import express from "express";
import {
  createSnippet,
  getMySnippets,
  getPublicSnippets,
  updateSnippet,
  deleteSnippet,
  toggleSnippetVisibility
} from "../controllers/snippet.controller.js";
import verifyJWT from "../middlewares/authMiddleware.js";

const router = express.Router();

// Protected
router.post("/", verifyJWT, createSnippet);
router.get("/", verifyJWT, getMySnippets);
router.put("/:id", verifyJWT, updateSnippet);
router.delete("/:id", verifyJWT, deleteSnippet);
router.patch("/:id", verifyJWT, toggleSnippetVisibility);

// Public
router.get("/public", getPublicSnippets);

export default router;
