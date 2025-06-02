// src/graph/nodes/retrieveExamPapers.js
import {
  sanitizeFilePath,
  sanitizeDocumentMetadata,
} from '../../utils/pathUtils.js';

/**
 * Exam Papers retrieval node - fetches relevant exam papers and mark schemes
 * Retrieves exam papers and mark schemes from the Pinecone exam papers index
 */
export const retrieveExamPapersNode = (examPapersRetriever) => {
  return async (state) => {
    // If no query is provided, return empty array
    if (!state.query) {
      console.log(
        'Empty query provided to retrieveExamPapers node, returning empty results'
      );
      return { examPdfResults: [] };
    }

    console.log(`Retrieving exam papers for query: "${state.query}"`);

    // Check if this is a mark scheme request
    const isMarkSchemeRequest =
      /\b(mark scheme|marking|grade|assess|evaluate|correct|score|answer key)\b/i.test(
        state.query
      );
    if (isMarkSchemeRequest) {
      console.log(
        'Detected mark scheme request in retrieveExamPapers, prioritizing mark scheme documents'
      );
    }
    try {
      // Use the retriever to get relevant exam papers and mark schemes
      let examDocs = await examPapersRetriever.getRelevantDocuments(
        state.query
      );

      // Sanitize document metadata to remove local paths
      const sanitizedDocs = sanitizeDocumentMetadata(examDocs);

      console.log(`Retrieved ${examDocs.length} exam paper documents`);

      // In debug/verbose mode, you might want to log the document metadata
      if (sanitizedDocs.length > 0) {
        console.log(
          'Retrieved exam papers includes:',
          sanitizedDocs.map((doc) =>
            doc.metadata?.source
              ? `${doc.metadata.source} (${doc.pageContent.substring(
                  0,
                  50
                )}...)`
              : `Document with no source (${doc.pageContent.substring(
                  0,
                  50
                )}...)`
          )
        );
      }

      // Return the documents
      return { examPdfResults: examDocs };
    } catch (error) {
      console.error('Error retrieving exam paper documents:', error);
      console.error(error.stack);

      // Return empty array on error to prevent the whole chain from failing
      return { examPdfResults: [] };
    }
  };
};

export default retrieveExamPapersNode;
