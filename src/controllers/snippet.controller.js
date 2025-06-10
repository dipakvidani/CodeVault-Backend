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
  console.log("Snippet controller: getPublicSnippets entered");
  try {
    const snippets = await Snippet.find({ isPublic: true })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Successfully fetched ${snippets.length} public snippets.`);
    
    // Ensure each snippet has required fields and proper types
    const validSnippets = snippets.map(snippet => {
      // Log the raw snippet for debugging
      console.log("Processing snippet:", JSON.stringify(snippet, null, 2));
      
      // Log the user object after population
      console.log("Snippet user after population:", JSON.stringify(snippet.user, null, 2));

      // Ensure all required fields are present and of correct type
      const processedSnippet = {
        _id: String(snippet._id),
        title: String(snippet.title || 'Untitled Snippet'),
        code: String(snippet.code || ''),
        language: String(snippet.language || 'JavaScript'),
        isPublic: Boolean(snippet.isPublic),
        createdAt: snippet.createdAt,
        updatedAt: snippet.updatedAt
      };

      // Add user info if available
      if (snippet.user && typeof snippet.user === 'object') {
        processedSnippet.user = {
          name: String(snippet.user.name || ''),
          email: String(snippet.user.email || '')
        };
      } else {
        processedSnippet.user = null; // Ensure user is explicitly null if not an object or not present
      }

      return processedSnippet;
    });

    console.log("Processed snippets:", JSON.stringify(validSnippets, null, 2));

    res.json({
      count: validSnippets.length,
      snippets: validSnippets
    });
  } catch (error) {
    console.error("Error in getPublicSnippets:", error);
    throw new ApiError(500, "Failed to retrieve public snippets");
  }
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
