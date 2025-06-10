import Snippet from "../models/Snippet.model.js";
import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";

/**
 * @desc Create a new snippet
 * @route POST /api/v1/snippets
 * @access Private
 */
export const createSnippet = asyncHandler(async (req, res) => {
  const { title, description, code, language, isPublic, tags } = req.body;

  if (!title || !code || !language) {
    throw new ApiError(400, "Title, code, and language are required");
  }

  const snippet = await Snippet.create({
    title,
    description,
    code,
    language,
    isPublic: isPublic || false,
    tags: tags || [],
    user: req.user._id,
  });

  res.status(201).json({
    message: "Snippet created successfully",
    snippet: {
      _id: snippet._id,
      userId: snippet.user,
      title: snippet.title,
      description: snippet.description,
      code: snippet.code,
      language: snippet.language,
      isPublic: snippet.isPublic,
      tags: snippet.tags,
      createdAt: snippet.createdAt,
      updatedAt: snippet.updatedAt
    }
  });
});

/**
 * @desc Get all snippets created by the logged-in user
 * @route GET /api/v1/snippets
 * @access Private
 */
export const getMySnippets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const snippets = await Snippet.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Snippet.countDocuments({ user: req.user._id });

  res.json({
    count: total,
    snippets: snippets.map(snippet => ({
      _id: snippet._id,
      userId: snippet.user,
      title: snippet.title,
      description: snippet.description,
      code: snippet.code,
      language: snippet.language,
      isPublic: snippet.isPublic,
      tags: snippet.tags,
      createdAt: snippet.createdAt,
      updatedAt: snippet.updatedAt
    })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    }
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
 * @route PUT /api/v1/snippets/:id
 * @access Private
 */
export const updateSnippet = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, code, language, isPublic, tags } = req.body;

  const snippet = await Snippet.findById(id);

  if (!snippet) {
    throw new ApiError(404, "Snippet not found");
  }

  // Check if the logged-in user is the owner
  if (snippet.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to update this snippet");
  }

  // Update fields if provided
  if (title) snippet.title = title;
  if (description !== undefined) snippet.description = description;
  if (code) snippet.code = code;
  if (language) snippet.language = language;
  if (isPublic !== undefined) snippet.isPublic = isPublic;
  if (tags) snippet.tags = tags;

  const updatedSnippet = await snippet.save();

  res.json({
    message: "Snippet updated successfully",
    snippet: {
      _id: updatedSnippet._id,
      userId: updatedSnippet.user,
      title: updatedSnippet.title,
      description: updatedSnippet.description,
      code: updatedSnippet.code,
      language: updatedSnippet.language,
      isPublic: updatedSnippet.isPublic,
      tags: updatedSnippet.tags,
      createdAt: updatedSnippet.createdAt,
      updatedAt: updatedSnippet.updatedAt
    }
  });
});

/**
 * @desc Delete a snippet
 * @route DELETE /api/v1/snippets/:id
 * @access Private
 */
export const deleteSnippet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const snippet = await Snippet.findById(id);

  if (!snippet) {
    throw new ApiError(404, "Snippet not found");
  }

  // Check if the logged-in user is the owner
  if (snippet.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to delete this snippet");
  }

  await snippet.deleteOne();

  res.json({ message: "Snippet deleted successfully" });
});

/**
 * @desc Toggle snippet visibility
 * @route PATCH /api/v1/snippets/:id
 * @access Private
 */
export const toggleSnippetVisibility = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isPublic } = req.body;

  if (typeof isPublic !== 'boolean') {
    throw new ApiError(400, "isPublic must be a boolean value");
  }

  const snippet = await Snippet.findById(id);

  if (!snippet) {
    throw new ApiError(404, "Snippet not found");
  }

  // Check if the logged-in user is the owner
  if (snippet.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to update this snippet");
  }

  snippet.isPublic = isPublic;
  const updatedSnippet = await snippet.save();

  res.json({
    message: "Snippet visibility updated successfully",
    snippet: {
      _id: updatedSnippet._id,
      userId: updatedSnippet.user,
      title: updatedSnippet.title,
      description: updatedSnippet.description,
      code: updatedSnippet.code,
      language: updatedSnippet.language,
      isPublic: updatedSnippet.isPublic,
      tags: updatedSnippet.tags,
      createdAt: updatedSnippet.createdAt,
      updatedAt: updatedSnippet.updatedAt
    }
  });
});
