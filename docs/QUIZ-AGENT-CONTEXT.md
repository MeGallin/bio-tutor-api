# Quiz Agent Conversation Context Implementation

This document describes the implementation of conversation context retention for the Quiz Agent in the Biology Tutor application.

## Overview

The Quiz Agent now properly maintains conversation context during interactions, allowing it to understand contextual references to previously discussed topics. For example, if a user has been discussing DNA replication and then asks for "a quiz on this topic," the Quiz Agent will understand that "this topic" refers to DNA replication.

## Key Changes

1. **Explicit Topic Extraction**:

   - When a contextual reference is detected, the topic is explicitly extracted from conversation context
   - The exact topic is used for decision-making rather than relying on implicit context
   - Topics like "DNS" are definitively recognized as non-biology topics

2. **Direct Topic Handling**:

   - The system directly checks if the extracted topic is biology-related
   - Common non-biology topics are recognized without requiring LLM calls
   - Explicit topic names are used in responses to improve clarity

3. **Query Management**:

   - Original query is preserved while using an explicit derived query internally
   - The system maintains the conversation flow even when rewriting queries internally
   - Context state is properly maintained throughout query transformations

4. **Enhanced Contextual Reference Handling**:

   - More robust handling of references like "this", "it", etc.
   - Clearer, more specific responses that reference the actual topic by name
   - Better topic disambiguation for ambiguous references

5. **Detailed Logging**:
   - Comprehensive logging of topic extraction and decision-making
   - Clear tracking of query transformations and state changes
   - Improved debugging information for troubleshooting

## Implementation Details

The Quiz Agent now uses a direct topic extraction approach:

1. When a contextual reference is detected, it extracts the specific topic from conversation context
2. It explicitly checks if the topic is biology-related (e.g., "DNS" is clearly not biology)
3. For non-biology topics, it provides a response that specifically mentions the topic by name
4. For biology topics, it continues with quiz generation using the explicit topic

### Topic Extraction Process (Updated)

```javascript
if (hasContextualReference && state.conversationContext) {
  console.log(
    `Quiz Agent detected contextual reference in query: "${state.query}"`
  );

  // Extract the topic from context more aggressively with multiple fallbacks
  if (state.conversationContext.lastTopic) {
    explicitTopic = state.conversationContext.lastTopic;
    console.log(`Using lastTopic: "${explicitTopic}"`);
  } else if (
    state.conversationContext.recentTopics &&
    state.conversationContext.recentTopics.length > 0
  ) {
    explicitTopic = state.conversationContext.recentTopics[0];
    console.log(`Using first recentTopic: "${explicitTopic}"`);
  } else if (
    Object.keys(state.conversationContext.keyEntities || {}).length > 0
  ) {
    // If we still don't have a topic, use the first key entity as a fallback
    explicitTopic = Object.keys(state.conversationContext.keyEntities)[0];
    console.log(`Using first keyEntity as fallback: "${explicitTopic}"`);
  }

  if (explicitTopic) {
    // Create an explicit query with the resolved topic
    originalQuery = state.query; // Save original for later
    state.query = `Create a quiz about ${explicitTopic}`;
    console.log(`Rewriting query to: "${state.query}"`);
  }
}
```

### Biology Topic Checking (Updated)

```javascript
// Check if we have a contextual reference with conversation context
if (hasContextualReference && conversationContext) {
  // Extract the topic from context
  const contextTopic = conversationContext.lastTopic ||
    (conversationContext.recentTopics && conversationContext.recentTopics.length > 0
      ? conversationContext.recentTopics[0] : null);

  if (contextTopic) {
    // Check if the contextual topic is a biology topic directly
    const nonBiologyTopics = ['dns', 'domain name system', 'ip', ...];
    const isNonBiology = nonBiologyTopics.some(topic =>
      contextTopic.toLowerCase().includes(topic));

    if (isNonBiology) {
      return false; // Topic is explicitly non-biology
    }

    return true; // Topic is likely biology-related
  }
}

// Only call the LLM for direct queries or ambiguous topics
// Format the topic check prompt and make the LLM call...
```

## Testing the Feature

You can test the conversation context retention with sequences like:

1. "Tell me about DNA replication"
2. "Create a quiz about this process"

The Quiz Agent should generate a quiz about DNA replication without requiring explicit mention of the topic again.

When testing with non-biology topics (like "DNS"):

1. "Tell me about DNS"
2. "Can I have a quiz on this topic?"

The system should now recognize DNS is not a biology topic and provide a response that specifically mentions DNS.

## Date

May 16, 2025

## Update

This document was updated on May 16, 2025 to reflect important fixes to the `isBiologyTopic` function to correctly handle contextual references. The implementation now properly extracts topics from context even for vague references like "can you tell more about this?" and accurately determines whether the topic is biology-related.

## Additional Contextual Reference Handling Improvements (May 16, 2025)

The Quiz Agent has been enhanced to handle a wider variety of contextual reference phrases:

### Supported Reference Phrases

The implementation now properly handles a wider variety of contextual reference phrases:

### Supported Reference Phrases

The system now properly handles various forms of contextual references, including:

- "Can you create a quiz about this?"
- "Can you tell me more about this topic?"
- "Can you give me 3 questions on this topic?"
- "I'd like to test my knowledge on this subject"
- "Can you help me practice this?"

### Testing Coverage

A new test case has been added to specifically verify handling of these varied reference phrases:

```javascript
test('Quiz Agent should handle various contextual reference phrases for biology topics', async () => {
  // Test with phrase: "Can you give me 3 questions on this topic?"
  const initialState = {
    messages: [
      // Previous conversation about photosynthesis
      // ...
      {
        role: 'user',
        content: 'Can you give me 3 questions on this topic?',
      },
    ],
    query: 'Can you give me 3 questions on this topic?',
    hasContextualReference: true,
    conversationContext: {
      lastTopic: 'photosynthesis',
      // ...
    },
  };

  // Verify that the quiz is correctly generated for photosynthesis
});
```

### Bug Fixes (May 17, 2025)

We've fixed several scope-related issues in the Quiz Agent:

1. Fixed a bug where `explicitTopic` was referenced in the `finally` block but defined in the `try` block
2. Fixed a bug where `hasContextualReference` was also referenced outside its scope
3. Moved critical variables to the function's outer scope to ensure they're accessible throughout
4. Properly initialized all variables to prevent undefined reference errors

These fixes ensure the Quiz Agent can properly handle contextual references without throwing runtime errors.
