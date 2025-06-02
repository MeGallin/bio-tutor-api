// src/utils/pathUtils.js

/**
 * Sanitizes file paths in document metadata to remove sensitive information
 * such as local machine paths, usernames, etc.
 *
 * @param {string} path - The file path to sanitize
 * @returns {string} - The sanitized path with personal information removed
 */
export const sanitizeFilePath = (path) => {
  if (!path) return 'unknown';

  // Extract just the filename from the path
  const filename = path.split('\\').pop().split('/').pop();

  return filename;
};

/**
 * Process a set of documents to sanitize their metadata
 *
 * @param {Array} docs - The documents to process
 * @returns {Array} - The processed documents with sanitized metadata
 */
export const sanitizeDocumentMetadata = (docs) => {
  if (!docs || !Array.isArray(docs)) return [];

  return docs.map((doc) => {
    // Create a shallow copy of the document
    const sanitizedDoc = { ...doc };

    // If there's metadata with a source field, sanitize it
    if (sanitizedDoc.metadata && sanitizedDoc.metadata.source) {
      sanitizedDoc.metadata.source = sanitizeFilePath(
        sanitizedDoc.metadata.source
      );
    }

    return sanitizedDoc;
  });
};
