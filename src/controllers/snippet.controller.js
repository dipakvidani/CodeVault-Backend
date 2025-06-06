import Snippet from "../models/Snippet.model.js";
import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";

/**
 * @desc Create a new snippet
 * @route POST /api/snippets
 * @access Private
 */
export const createSnippet = asyncHandler(async (req, res) => {
  const { title, code, language, isPublic } = req.body;

  if (!title || !code) {
    throw new ApiError(400, "Title and code are required");
  }

  const snippet = await Snippet.create({
    title,
    code,
    language,
    isPublic: isPublic || false,
    user: req.user._id,
  });

  res.status(201).json({
    message: "Snippet created successfully",
    snippet,
  });
});

/**
 * @desc Get all snippets created by the logged-in user
 * @route GET /api/snippets
 * @access Private
 */
export const getMySnippets = asyncHandler(async (req, res) => {
  const snippets = await Snippet.find({ user: req.user._id }).sort({ createdAt: -1 });

  res.json({
    count: snippets.length,
    snippets,
  });
});

/**
 * @desc Get all public snippets from all users
 * @route GET /api/snippets/public
 * @access Public
 */
export const getPublicSnippets = asyncHandler(async (_req, res) => {
  const snippets = await Snippet.find({ isPublic: true }).populate("user", "name email").sort({ createdAt: -1 });

  res.json({
    count: snippets.length,
    snippets,
  });
});

/**
 * @desc Update a snippet
 * @route PUT /api/snippets/:id
 * @access Private
 */
export const updateSnippet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const snippet = await Snippet.findById(id);

  if (!snippet) {
    throw new ApiError(404, "Snippet not found");
  }

  // Check if the logged-in user is the owner
  if (snippet.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to update this snippet");
  }

  const { title, code, language, isPublic } = req.body;

  snippet.title = title || snippet.title;
  snippet.code = code || snippet.code;
  snippet.language = language || snippet.language;
  snippet.isPublic = isPublic !== undefined ? isPublic : snippet.isPublic;

  const updatedSnippet = await snippet.save();

  res.json({
    message: "Snippet updated successfully",
    snippet: updatedSnippet,
  });
});

/**
 * @desc Delete a snippet
 * @route DELETE /api/snippets/:id
 * @access Private
 */
export const deleteSnippet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const snippet = await Snippet.findById(id);

  if (!snippet) {
    throw new ApiError(404, "Snippet not found");
  }

  // Check ownership
  if (snippet.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to delete this snippet");
  }

  await snippet.deleteOne();

  res.json({ message: "Snippet deleted successfully" });
});
