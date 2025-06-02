# Biology AI Tutor: Exam Papers Functionality

## Overview

The Exam Papers functionality allows the Biology AI Tutor to retrieve and understand biology exam questions and mark schemes. It can:

1. Extract relevant exam questions based on student queries
2. Provide mark schemes for specific questions
3. Explain marking criteria in detail
4. Help students understand how to approach exam questions

## Technical Implementation

### Components

1. **Exam Papers FAISS Index**

   - Location: `/api/faiss_index/exam_papers/`
   - Created by: `/api/src/vector/examPapersRetriever.js`
   - Format: FAISS vector store with OpenAI embeddings

2. **Retrieval Pipeline**

   - `/api/src/vector/retrieveExamPapers.js`: Fetches relevant exam paper documents
   - `/api/src/graph/nodes/examQuestionExtractor.js`: Extracts and formats exam questions
   - `/api/src/graph/nodes/markSchemeExtractor.js`: Extracts and formats mark schemes
   - `/api/src/graph/nodes/router.js`: Routes requests to the appropriate extractor

3. **Storage**
   - Exam paper PDFs stored in: `/api/exam_papers/`
   - Naming convention:
     - Questions: `{YEAR}_{PAPER-NAME}_EXAMQUESTION.pdf`
     - Mark schemes: `{YEAR}_{PAPER-NAME}_MARKSCHEME.pdf`

### Flow

1. User asks a question about exam papers
2. Router identifies it as an exam paper query
3. System retrieves relevant exam paper documents
4. Based on query type, either:
   - Exam Question Extractor processes the documents
   - Mark Scheme Extractor processes the documents
5. Response is returned to the user with the appropriate styling

## Maintenance

### Adding New Exam Papers

1. Save PDF files to the `/api/exam_papers/` directory
2. Follow the naming convention:
   - For exam questions: `YEAR_PAPER-NAME_EXAMQUESTION.pdf`
   - For mark schemes: `YEAR_PAPER-NAME_MARKSCHEME.pdf`
3. Restart the server to rebuild the FAISS index
   - Or delete the `/api/faiss_index/exam_papers/` directory to force a rebuild

### Modifying the Processing Logic

If you need to change how exam papers are processed:

1. **Retriever Changes**: Modify `/api/src/vector/examPapersRetriever.js`

   - Change chunk size, overlap, or retrieval parameters

2. **Extractor Changes**:

   - For exam questions: Modify `/api/src/graph/nodes/examQuestionExtractor.js`
   - For mark schemes: Modify `/api/src/graph/nodes/markSchemeExtractor.js`

3. **Router Changes**:
   - To adjust detection patterns: Modify `/api/src/graph/nodes/router.js`

## Testing

### Manual Testing

Run the debug script to test the retriever:

```bash
cd api
node debug/test-exam-papers.js
```

Test queries in the chat interface:

- "Show me exam questions about DNA replication"
- "What's the mark scheme for photosynthesis questions?"
- "How would an answer about cellular respiration be marked?"

### Automated Testing

Run the test suite:

```bash
cd api
npm test -- examPapers.test.js
```

## Troubleshooting

1. **FAISS Index Issues**

   - Delete the index and restart: `rm -rf faiss_index/exam_papers/`
   - Check for PDF loading errors in the logs

2. **No Results**

   - Verify PDFs are in the correct format and location
   - Check that PDFs are text-based, not just scanned images
   - Test with broader queries to verify retrieval works

3. **Response Format Issues**
   - Check the extractor prompt templates
   - Verify frontend is rendering the response type correctly
