// src/graph/nodes/retrieve.js
import { Document } from '@langchain/core/documents';
import {
  sanitizeFilePath,
  sanitizeDocumentMetadata,
} from '../../utils/pathUtils.js';

/**
 * Retrieve node that uses Pinecone vector database to find relevant documents
 * based on the user's query
 */
export const retrieveNode = (retriever) => {
  return async (state, config) => {
    if (!state.query) {
      console.warn('Empty query received in retrieve node');
      return { pdfResults: [] };
    }

    try {
      console.log(`Retrieving documents for query: "${state.query}"`);

      if (!retriever) {
        console.error('Retriever not provided in config');
        return { pdfResults: [] };
      }

      // Use the retriever to get relevant documents based on the query
      const docs = await retriever.getRelevantDocuments(state.query);

      console.log(`Retrieved ${docs.length} documents`);

      // Sanitize document metadata
      const sanitizedDocs = sanitizeDocumentMetadata(docs);

      // Log some information about the retrieved documents
      if (sanitizedDocs.length > 0) {
        sanitizedDocs.forEach((doc, i) => {
          const preview = doc.pageContent.substring(0, 100).replace(/\n/g, ' ');
          console.log(
            `Document ${i + 1}: ${preview}... [source: ${
              doc.metadata.source || 'unknown'
            }]`
          );
        });
      }

      // Return the documents to update the state
      return { pdfResults: docs };
    } catch (error) {
      console.error('Error retrieving documents:', error);
      return { pdfResults: [] };
    }
  };
};

export default retrieveNode;
