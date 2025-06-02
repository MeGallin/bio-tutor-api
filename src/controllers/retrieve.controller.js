/**
 * Document retrieval controller
 * Uses Pinecone retriever to find relevant documents based on a query
 */
export const retrieveDocuments = async (req, res) => {
  try {
    const { query } = req.body;
    const { retriever } = req.app.locals;

    if (!query) {
      return res
        .status(400)
        .json({ error: 'Query is required for document retrieval' });
    }

    console.log(
      `Received document retrieval request with query: "${query.substring(
        0,
        50
      )}${query.length > 50 ? '...' : ''}"`
    );

    // Use the Pinecone retriever to find relevant documents
    const documents = await retriever.getRelevantDocuments(query);

    res.json({
      query,
      documents,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error retrieving documents:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      error: 'Internal server error during document retrieval',
      message: err.message,
    });
  }
};

/**
 * Exam paper retrieval controller
 * Uses the exam papers Pinecone retriever to find relevant documents
 */
export const retrieveExamPapers = async (req, res) => {
  try {
    const { query } = req.body;
    const { examPapersRetriever } = req.app.locals;

    if (!query) {
      return res
        .status(400)
        .json({ error: 'Query is required for exam paper retrieval' });
    }

    console.log(
      `Received exam paper retrieval request with query: "${query.substring(
        0,
        50
      )}${query.length > 50 ? '...' : ''}"`
    );

    // Use the exam papers Pinecone retriever to find relevant documents
    const documents = await examPapersRetriever.getRelevantDocuments(query);

    res.json({
      query,
      documents,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error retrieving exam papers:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      error: 'Internal server error during exam paper retrieval',
      message: err.message,
    });
  }
};
