# LangSmith Integration Guide

This document provides comprehensive information about the LangSmith integration in the Biology AI Tutor application, including recent fixes to the UUID handling issue.

## Overview

LangSmith is used for tracing, monitoring, and analyzing the performance of LLM calls throughout the application. It provides valuable insights into:

- Execution time of different components
- Token usage and API costs
- Success rates and error patterns
- Input/output analysis

## Configuration

LangSmith integration is controlled by environment variables:

```
LANGSMITH_API_KEY=your_api_key_here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=biology-tutor
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

Set `LANGSMITH_TRACING=true` to enable tracing, or `false` to disable it. The application will function normally even if LangSmith integration is disabled.

## Core Components

The LangSmith integration consists of several key components:

### traceLLMInteraction Function

This is the primary function used to trace individual LLM calls:

```javascript
const result = await traceLLMInteraction(
  'summary_agent', // Name of the component
  async () => {
    // Callback that performs the LLM call
    return await llm.invoke([new HumanMessage(prompt)]);
  },
  {
    // Metadata to include in the trace
    query: state.query,
    messageCount: filteredMessages.length,
    threadId: state.threadId,
  }
);
```

### UUID Validation

All UUIDs are validated before use with LangSmith to prevent errors:

```javascript
function isValidUuid(uuid) {
  if (typeof uuid !== 'string') return false;

  // Simple regex to validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
```

This validation is applied at multiple points in the tracing process.

### Graph Tracing

For LangGraph executions, a more comprehensive tracing approach is used:

```javascript
// Start tracing a graph execution
const trace = await createGraphTrace(graph, inputs, langSmithClient);

// ... execute the graph ...

// End the trace with outputs
await endGraphTrace(trace, outputs, langSmithClient);
```

## Recent Fixes

### UUID Format Error Resolution (May 19, 2025)

An issue was identified where an object (instead of a string) was being passed as a UUID to LangSmith's `updateRun` method, causing the error: "Error in LangSmith tracing: Error: Invalid UUID: [object Object]".

#### Root Cause:

The issue occurred because:

1. The LLM's response object was being passed directly without proper extraction
2. No validation was performed on UUIDs before using them with the LangSmith API
3. Error handling did not properly catch and handle serialization issues

#### Implemented Fixes:

1. **UUID Validation**: Added comprehensive validation of all UUIDs
2. **Enhanced Error Handling**: Improved error catching throughout the tracing process
3. **Proper Response Handling**: Ensured LLM responses are properly processed before passing to LangSmith
4. **Serialization Improvements**: Added safe serialization for objects that might contain circular references

#### Validation in All LangSmith Functions:

All functions that interact with LangSmith now validate their inputs:

- `traceLLMInteraction`: Validates runId before creating or updating runs
- `createGraphTrace`: Validates the generated UUID
- `endGraphTrace`: Validates trace ID before ending the trace
- `createTrace`: Validates traceId before creating a trace

## Debugging LangSmith Issues

When encountering LangSmith-related issues:

1. **Check UUID handling**: Ensure all UUIDs are properly validated
2. **Validate LangSmith configuration**: Verify environment variables are correctly set
3. **Run UUID validation test**: Use the test script at `debug/test-langsmith-uuid.js`
4. **Check object serialization**: Verify complex objects are properly serialized
5. **Look for circular references**: Objects with circular references need special handling
6. **Verify error handling**: Ensure tracing errors don't disrupt the main application flow

### Common Error Patterns:

| Error                                  | Likely Cause                         | Solution                                                 |
| -------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| `Error: Invalid UUID: [object Object]` | Object passed instead of string UUID | Validate UUIDs with `isValidUuid()`                      |
| `Cannot stringify circular structure`  | Object with circular references      | Use custom serialization or extract necessary properties |
| `401 Unauthorized`                     | Invalid API key                      | Check LANGSMITH_API_KEY environment variable             |

## Best Practices

1. **Always validate UUIDs**: Use `isValidUuid()` before using any UUID with LangSmith
2. **Handle trace failures gracefully**: Ensure application works even if LangSmith tracing fails
3. **Provide meaningful trace names**: Use descriptive names for traces to aid in debugging
4. **Include relevant metadata**: Add context like thread IDs and query information
5. **Monitor trace performance**: Watch for slow traces that might impact application performance

## Testing

A dedicated test script (`debug/test-langsmith-uuid.js`) can verify UUID validation and error handling:

```bash
node debug/test-langsmith-uuid.js
```

This script tests different UUID formats and validates the error handling in the LangSmith integration.
