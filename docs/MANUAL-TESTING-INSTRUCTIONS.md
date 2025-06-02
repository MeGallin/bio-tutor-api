# Manual Testing Instructions for Contextual References Fix

Due to test configuration issues with Jest and ES modules, please test the improved context handling of the Quiz Agent manually using the following steps:

## Testing Procedure

1. **Restart the application with the fixes**:

   ```
   cd c:/xampp/htdocs/WebSitesDesigns/developments/biology-ai-tutor/langGraph-tutorV3.1/api
   npm run dev
   ```

   - Note: If you're encountering persistent issues, try stopping any existing server processes first
   - For Windows, you might need to use:
     ```
     taskkill /F /IM node.exe
     npm run dev
     ```

2. **Open the frontend application** in your browser.

   - Start the client application with:
     ```
     cd c:/xampp/htdocs/WebSitesDesigns/developments/biology-ai-tutor/langGraph-tutorV3.1/client
     npm run dev
     ```
   - Navigate to the application URL (typically http://localhost:3000 or as configured)

3. **Test Case 1: Basic Contextual Reference**:

   - Send: "Tell me about photosynthesis"
   - Wait for response
   - Send: "Can you create a quiz about this?"
   - Expected: Quiz about photosynthesis is generated

4. **Test Case 2: Alternative Phrasing**:

   - Send: "Tell me about DNA replication"
   - Wait for response
   - Send: "Can you give me 3 questions on this topic?"
   - Expected: Quiz about DNA replication is generated

5. **Test Case 3: Multiple Contextual References**:

   - Send: "Explain cellular respiration"
   - Wait for response
   - Send: "Can you tell me more about this?"
   - Wait for response
   - Send: "Give me a quiz about it"
   - Expected: Quiz about cellular respiration is generated

6. **Test Case 4: Non-Biology Topic with Contextual Reference**:
   - Send: "What is DNS?"
   - Wait for response
   - Send: "Can you create a quiz about this?"
   - Expected: Response indicates that DNS is not a biology topic and suggests biology topics instead

## Checking Logs for Proper Context Handling

While testing, monitor the server logs to verify:

1. The system correctly identifies contextual references
2. Topics are properly extracted from the conversation context
3. The `isBiologyTopic` function correctly identifies biology vs non-biology topics
4. Context is preserved throughout the conversation

## Issues to Look For

- Context not being properly extracted from previous messages
- Quiz topics not matching the previously discussed topic
- System failing to recognize certain phrasing of contextual references
- Generic responses instead of topic-specific ones
- "ReferenceError: explicitTopic is not defined" in logs (should now be fixed)
- "ReferenceError: hasContextualReference is not defined" in logs (should now be fixed)
- Any other unexpected errors reported in the server logs

> **Note**: We made several improvements to the error handling:
>
> 1. Fixed scope-related issues:
>
>    - Moved `explicitTopic` and `hasContextualReference` to the outer function scope
>    - Added `updatedContext` to the outer scope variables for future-proofing
>
> 2. Enhanced server-level error handling:
>    - Added try-catch block in server.js for catching unhandled errors
>    - Improved error reporting with more detailed logs
>    - Ensured context preservation even during unexpected errors

## Next Steps

After manual testing confirms the fix works correctly, we will need to update the Jest configuration to properly support ES modules for automated testing of these features.

## Debug Utilities

If you're still experiencing issues with contextual references, we've included debug utilities in the `debug` folder to help isolate the problems:

```
cd c:/xampp/htdocs/WebSitesDesigns/developments/biology-ai-tutor/langGraph-tutorV3.1/api
node debug/debug-context.js
```

Or for more detailed contextual reference testing:

```
cd c:/xampp/htdocs/WebSitesDesigns/developments/biology-ai-tutor/langGraph-tutorV3.1/api
node debug/debug-contextual-references.js
```

These utilities will:

1. Test contextual references with biology topics
2. Test contextual references with non-biology topics
3. Verify the topic extraction logic works correctly

The output will help diagnose if the issues are in:

- Topic extraction from context
- Biology/non-biology classification
- The language model responses
- Reference detection

Use this information to pinpoint any remaining issues in the implementation.
