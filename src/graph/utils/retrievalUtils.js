// src/graph/utils/retrievalUtils.js
import { retrieveNode } from '../nodes/retrieve.js';
import { retrieveExamPapersNode } from '../nodes/retrieveExamPapers.js';

/**
 * Handles document retrieval for context
 * @param {Object} retriever - The retriever to use for fetching documents
 * @param {Object} state - The current state
 * @returns {Promise<Object>} Updated state with retrieved documents
 */
export const retrieveDocuments = async (retriever, state) => {
  try {
    // Use the retriever node to fetch relevant documents
    const retrieveNodeFunction = retrieveNode(retriever);
    const retrieveResult = await retrieveNodeFunction(state);

    // Update state with retrieved documents
    return {
      ...state,
      pdfResults: retrieveResult.pdfResults || [],
    };
  } catch (retrievalError) {
    console.error('Error during retrieval:', retrievalError);
    console.log('Continuing with empty pdfResults');
    return {
      ...state,
      pdfResults: [],
    };
  }
};

/**
 * Handles retrieval of exam paper documents
 * @param {Object} examPapersRetriever - The exam papers retriever
 * @param {Object} state - The current state
 * @returns {Promise<Object>} Updated state with retrieved exam papers
 */
export const retrieveExamPapers = async (examPapersRetriever, state) => {
  if (!['examQuestion', 'markScheme'].includes(state.responseType)) {
    return state;
  }

  try {
    // Use the exam papers retriever node to fetch relevant exam papers
    const retrieveExamPapersNodeFunction =
      retrieveExamPapersNode(examPapersRetriever);
    const examPapersResult = await retrieveExamPapersNodeFunction(state);

    // Update state with retrieved exam papers
    return {
      ...state,
      examPdfResults: examPapersResult.examPdfResults || [],
    };
  } catch (retrievalError) {
    console.error('Error during exam papers retrieval:', retrievalError);
    console.log('Continuing with empty examPdfResults');
    return {
      ...state,
      examPdfResults: [],
    };
  }
};
