# Migration Guide: FAISS to Pinecone

This guide helps you migrate from the FAISS-based vector storage to Pinecone.

## Prerequisites

1. **Pinecone Account**: Sign up at [pinecone.io](https://pinecone.io)
2. **Pinecone Index**: Create an index with the following specifications:
   - **Dimension**: 1536 (for OpenAI embeddings)
   - **Metric**: cosine
   - **Index Name**: Choose a name (e.g., `biology-tutor-index`)

## Step 1: Environment Configuration

Copy `.env.sample` to `.env` and configure:

```env
# Required Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=biology-tutor-index

# Optional Namespaces (with sensible defaults)
PINECONE_NAMESPACE=biology-content
PINECONE_EXAM_PAPERS_NAMESPACE=exam-papers

# Keep existing OpenAI configuration
OPENAI_API_KEY=your_openai_api_key_here
```

## Step 2: Data Migration (if needed)

If you have existing FAISS data that needs to be migrated to Pinecone, you would need to:

1. Extract vectors and metadata from FAISS index
2. Upload to Pinecone using their API
3. Organize content into appropriate namespaces

_Note: This refactor assumes you already have a populated Pinecone index._

## Step 3: Test the Integration

Run the test script to verify everything works:

```bash
npm run test:pinecone
```

This will:

- Validate your Pinecone configuration
- Test connection to both namespaces
- Perform sample queries

## Step 4: Start the Application

```bash
npm start
# or for development
npm run dev
```

## Troubleshooting

### Common Issues

1. **Missing API Key**: Ensure `PINECONE_API_KEY` is set
2. **Wrong Index Name**: Verify `PINECONE_INDEX_NAME` matches your Pinecone index
3. **Empty Namespaces**: Check that your namespaces contain data
4. **Dimension Mismatch**: Ensure your Pinecone index uses dimension 1536

### Error Messages

- `PINECONE_API_KEY environment variable is required`

  - Solution: Set your Pinecone API key in `.env`

- `PINECONE_INDEX_NAME environment variable is required`

  - Solution: Set your Pinecone index name in `.env`

- `Failed to verify Pinecone vector store connection`
  - Solution: Check API key, index name, and network connectivity

### Logs to Watch

When starting the server, you should see:

```
Initializing Pinecone retriever...
Connecting to Pinecone index: your-index-name
Pinecone vector store initialized successfully
Pinecone vector store verification successful
```

## Rollback Strategy

If you need to revert to FAISS:

1. Update `src/server.js` imports:

   ```javascript
   import createRetriever from './vector/faissRetriever.js';
   import createExamPapersRetriever from './vector/examPapersRetriever.js';
   ```

2. Ensure FAISS index files exist in:

   - `./faiss_index/`
   - `./exam_papers_index/`

3. Comment out Pinecone environment variables

## Benefits of Pinecone

- ✅ No local index files to manage
- ✅ Cloud-based scaling
- ✅ Better performance for large datasets
- ✅ Real-time updates possible
- ✅ Built-in metadata filtering

## Next Steps

Once migrated successfully:

1. Remove unused FAISS index directories
2. Update deployment scripts to exclude FAISS files
3. Consider implementing real-time content updates
4. Explore Pinecone's advanced filtering capabilities
