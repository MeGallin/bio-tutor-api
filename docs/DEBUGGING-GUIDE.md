# Debugging Guide for Biology AI Tutor

This guide provides information on how to debug the Biology AI Tutor application effectively.

## Server Structure

The application uses a modular architecture with separate components:

- **Routes**: Handle API endpoint definitions in `/src/routes/`

  - `health.routes.js` - Health check endpoints
  - `chat.routes.js` - Chat API endpoints
  - `retrieve.routes.js` - Document retrieval endpoints

- **Controllers**: Process business logic in `/src/controllers/`

  - `health.controller.js` - Status responses
  - `chat.controller.js` - Chat processing logic
  - `retrieve.controller.js` - Document retrieval handling

- **Middleware**: Handle cross-cutting concerns in `/src/middleware/`

  - `logging.middleware.js` - Enhanced logging setup

- **LangGraph Nodes**: Implement graph-based conversation logic in `/src/graph/nodes/`

## Common Issues and Solutions

### API Endpoint Issues

If you're encountering issues with API endpoints:

1. Check the route definitions in `/src/routes/`
2. Examine the controller logic in `/src/controllers/`
3. Look for error logs from the Express server

Example debugging with curl:

```bash
curl -v http://localhost:3000/healthz
curl -v -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message": "What is DNA?"}'
```

### Context Handling Issues

If the AI isn't maintaining conversation context properly:

1. Look at the conversation context in the logs
2. Check the Quiz Agent's contextual reference handling
3. Verify that thread IDs are being maintained properly

You can debug context with:

```bash
node debug/debug-context.js
```

### LangGraph Tracing

For more detailed debugging of the conversation flow:

1. Ensure LangSmith is properly configured in your `.env` file
2. Enable trace logging by setting `LANGSMITH_TRACING=true`
3. Check the LangSmith dashboard for execution traces

### Router Logic Issues

If queries are being routed to the wrong nodes:

1. Run the router debug utility:
   ```bash
   node debug/debug-router.js
   ```
2. Check the advanced scoring in `/src/graph/nodes/router.js`
3. Verify patterns in the router's intent analysis functions

## Logging

The application uses enhanced logging with timestamp prefixes. Key areas to check:

- Server startup logs - Check for initialization errors
- API request logs - Monitor request/response flow
- LangGraph execution logs - Track conversation state
- Context handling logs - Follow context maintenance

## Common Error Patterns

### "TypeError: Cannot read property X of undefined"

Usually indicates a missing property in the state object. Check:

1. The state initialization in controllers
2. Property access in LangGraph nodes
3. Error handling in try/catch blocks

### "Error retrieving documents"

Indicates issues with the FAISS vector store:

1. Verify PDF files are in the correct location
2. Check FAISS index initialization logs
3. Test directly with the retriever debug tool:
   ```bash
   node debug/debug-retriever.js
   ```

### "Error in LangSmith tracing: Error: Invalid UUID"

Indicates issues with the LangSmith tracing system:

1. Check that UUIDs being used in `langsmith.js` are valid strings
2. Verify the response objects from LLM calls are properly structured
3. Run the LangSmith UUID validation test:
   ```bash
   node debug/test-langsmith-uuid.js
   ```
4. Look for objects being passed where string UUIDs are expected
5. Ensure LangSmith API keys are properly configured
6. Check for circular references in objects being logged to LangSmith

## Testing Routes Individually

You can test individual routes using the provided debug utilities:

```bash
# Test health routes
node debug/test-health.js

# Test chat with a fixed message
node debug/test-chat.js "What is photosynthesis?"

# Test document retrieval
node debug/test-retrieval.js "photosynthesis"
```

When debugging routes, consider the request flow through the system:

1. Route definition (in `/routes`)
2. Controller processing (in `/controllers`)
3. Graph execution (if applicable)
4. Response generation

## Debugging the Frontend

When debugging frontend issues:

1. **UI Component Rendering**:

   - Check React component props in the browser devtools
   - Verify state management with React DevTools
   - Examine component rendering patterns

2. **API Communication**:

   - Use browser Network tab to inspect requests/responses
   - Verify proper error handling in fetch/axios calls
   - Check for CORS issues in cross-domain requests

3. **Chat Interface Issues**:
   - Examine the ChatInterface component's state management
   - Verify the accordion behavior in ChatPage
   - Check message rendering in ChatMessage components

## Performance Issues

If the application is slow to respond:

1. Check LLM response times in the logs or LangSmith
2. Monitor context size (large contexts can slow down LLM calls)
3. Check FAISS index search performance

## Getting Help

For more complex issues, refer to:

- The full documentation in the `/docs/` directory
- The implementation details in source code comments
- The error logs for specific error messages
