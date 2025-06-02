# Debug Utilities

This folder contains debugging utilities for the Biology AI Tutor application.

## Available Debug Tools

- `debug-context.js` - Utility for testing conversation context handling and updates
- `debug-contextual-references.js` - Utility for testing contextual reference handling in the Quiz Agent
- `test-langsmith.js` - Utility for testing LangSmith integration and tracing

## How to Use

### Testing Context Handling

```bash
node debug/debug-context.js
```

This will run tests on the conversation context handling functionality, including topic extraction and context updating.

### Testing Contextual References

```bash
node debug/debug-contextual-references.js
```

This will test how the system handles contextual references like "Tell me more about this topic" for both biology and non-biology topics.

### Testing LangSmith Integration

```bash
node debug/test-langsmith.js
```

This utility tests the LangSmith tracing integration for monitoring LLM calls.

## Notes

- These utilities are intended for development and debugging purposes only
- They require the same environment variables as the main application
- Check the console output for detailed debugging information
