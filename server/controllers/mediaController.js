import asyncHandler from 'express-async-handler';

// @desc    Upload a media file
// @route   POST /api/media/upload
// @access  Private
export const uploadMedia = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded.');
    }

    // Respond with the path to the uploaded file
    // Normalize path to use forward slashes (especially for Windows)
    const normalizedPath = req.file.path.replace(/\\/g, '/');

    res.status(201).json({
        message: 'File uploaded successfully',
        filePath: normalizedPath,
    });
});
