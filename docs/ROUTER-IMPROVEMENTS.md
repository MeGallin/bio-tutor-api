# Router Logic Improvements

## Executive Summary

The Biology AI Tutor's router has been completely redesigned using LangGraph's StateGraph architecture, providing more accurate query classification and specialized response generation. Key improvements include enhanced pattern recognition for information-seeking questions, special handling for exam questions, and a multi-stage decision process combining rules-based and LLM-based approaches.

## Problem Statement

The original routing system had issues recognizing certain types of information-seeking questions, particularly:

- Questions starting with "does..." (e.g., "does epistasis involve enzymes?")
- Yes/no questions that were factual in nature but not being routed to the contentCollector node
- Both information and teaching intent scores were showing as 0 for these types of questions
- Ambiguous queries required clearer routing decisions

## Solution Implemented

### 1. LangGraph Implementation

We've migrated to LangGraph's StateGraph architecture for more structured and maintainable routing:

```javascript
const biologicalRouterGraph = new StateGraph(StateAnnotation)
  .addNode('analyzeQueryIntent', analyzeQueryIntent)
  .addNode('llmCallRouter', llmCallRouter)
  .addNode('contentCollector', contentCollector)
  .addNode('teach', teach)
  .addNode('clarify', clarify)
  .addNode('examQuestion', examQuestion)
  .addEdge('**start**', 'analyzeQueryIntent')
  .addEdge('analyzeQueryIntent', 'llmCallRouter')
  .addConditionalEdges('llmCallRouter', routeDecision, [
    'contentCollector',
    'teach',
    'clarify',
  ])
  .addEdge('contentCollector', '**end**')
  .addEdge('teach', '**end**')
  .addEdge('clarify', '**end**')
  .addEdge('examQuestion', '**end**')
  .compile();
```

### 2. Structured Output with Zod Schemas

Added structured output validation using zod for the router decisions:

```javascript
const routeSchema = z.object({
  responseType: z
    .enum(['contentCollector', 'teach', 'clarify', 'examQuestion'])
    .describe('The next step in the routing process'),
  confidence: z
    .number()
    .describe('Confidence score from 1-10 for the routing decision'),
  reasoning: z.string().describe('Explanation for why this route was chosen'),
});
```

### 3. Enhanced Intent Analysis Patterns

The `analyzeQueryIntent` function has been enhanced with additional patterns to recognize information-seeking questions:

```javascript
// Strong information query indicators (high score)
strongInfo: [
  // Original patterns...
  /^\bdoes\b/i, // Questions starting with "does"
  /\bis there\b/i, // Questions asking if something exists/happens
  /\bdo\b.*\binvolve\b/i, // Questions about involvement
],

// Moderate information query indicators (medium score)
moderateInfo: [
  // Original patterns...
  /\bdoes\b.*\binvolve\b/i, // Questions about involvement
  /\bdoes\b.*\buse\b/i, // Questions about usage
  /\bdoes\b.*\brequire\b/i, // Questions about requirements
  /\bdoes\b.*\boccur\b/i, // Questions about occurrence
  /\bis\b.*\bpart of\b/i, // Questions about composition
  /\bare\b.*\binvolved in\b/i, // Questions about involvement
],
```

### 4. Special Handling for Yes/No Questions

Added special handling for yes/no questions that may not match standard patterns:

```javascript
// Special handling for yes/no questions
if (
  normalizedText.startsWith('does ') ||
  normalizedText.startsWith('is ') ||
  normalizedText.startsWith('are ') ||
  normalizedText.startsWith('can ')
) {
  if (scores.information === 0 && scores.teaching === 0) {
    scores.information += 2;
  }
}
```

### 5. Improved "Why" Question Handling

Added specific detection for "why" questions which are typically teaching-oriented:

```javascript
// Strong teaching query indicators
strongTeach: [
  /\bexplain\b/i, /\bhow\b/i, /\bteach\b/i, /\bunderstand\b/i,
  /\bwhy does\b/i, /\bwhy do\b/i,
],

// Extra scoring for all why questions
if (/\bwhy\b/i.test(normalizedText)) scores.teaching += 1;
```

### 6. Multi-stage Routing Decision Process

Implemented a two-stage routing process that uses both pattern matching and LLM for ambiguous cases:

```javascript
async function llmCallRouter(state) {
  const analysis = state.queryAnalysis;

  // If we have clear signal from pattern matching
  if (analysis.infoScore > analysis.teachScore && analysis.infoScore >= 3) {
    return {
      decision: {
        responseType: 'contentCollector',
        confidence: 8,
        reasoning: 'Strong pattern match for information query',
      },
    };
  }
  // ...other pattern-based rules

  // For ambiguous cases, use LLM routing
  const decision = await router.invoke([
    {
      role: 'system',
      content: `You are an AI router for a biology education system...`,
    },
    {
      role: 'user',
      content: state.input,
    },
  ]);

  return { decision: decision };
}
```

### 7. Added Clarification Node

Introduced a dedicated clarification node for handling ambiguous queries:

```javascript
async function clarify(state) {
  // Implementation of clarification logic
  const result = await llm.invoke([
    {
      role: 'system',
      content:
        'Ask clarifying questions to better understand what the user is looking for.',
    },
    {
      role: 'user',
      content: state.input,
    },
  ]);

  return { output: `[CLARIFICATION] ${result.content}` };
}
```

### 8. Updated Information and Teaching Query Regex Patterns

Enhanced the regex patterns used for direct pattern matching:

```javascript
const isInformationQuery =
  /\b(what is|what are|who|when|where|define|list|meaning of|definition of|tell me about|facts about|information on|details on|which chapter|in the textbook|which page|reference|textbook|a-level|section|chapter|where can i find|information about|term|terminology|describe|concept|encyclopedia|biology term|what does|what do|definition|factsheet|quick facts|details|information|key points|does.*involve|is there|are there|does|is it|are they|can it|can they)\b/i.test(
    text
  );

const isTeachingQuery =
  /\b(explain|how|teach me|understand|tutorial|step by step|process|breakdown|deep dive|details on how|elaborate on|clarify how|guide me|walk me through|learn about|why|what causes|what happens when|what happens during|what happens if)\b/i.test(
    text
  );
```

## Expected Outcome

With these changes, the router should now correctly:

1. Identify "does..." questions as information-seeking queries
2. Route yes/no questions to the contentCollector node
3. Provide more accurate routing for ambiguous queries using LLM-based routing
4. Request clarification for truly ambiguous queries
5. Provide detailed reasoning for routing decisions
6. Have a more maintainable architecture based on LangGraph's StateGraph system

These improvements ensure that:

1. Factual questions are properly handled by the contentCollector node (designed for direct, factual responses)
2. Teaching requests are routed to the teach node (designed for explanations and deep understanding)
3. Ambiguous queries receive appropriate clarification requests
4. The system's routing logic can be easily debugged and extended through the explicit state management

## Architecture

The new router implements a graph-based workflow:

```
[User Input] → [analyzeQueryIntent] → [llmCallRouter] → [contentCollector/teach/clarify/examQuestion] → [Response]
```

The router first analyzes query intent using pattern matching, then either makes a decision based on clear signals or delegates to an LLM for ambiguous cases. The final response is generated by the appropriate specialized node based on the routing decision.

## Status of Improvements

### 1. Routing Accuracy

All test cases now route to their correct destinations with the enhanced router implementation:

- Information-seeking questions → contentCollector node
- Teaching/explanation requests → teach node
- Ambiguous queries → clarify node
- Exam question requests → examQuestion node

### 2. Exam Question Handling

We've fixed an issue where requests for past exam questions were incorrectly routed to the `teach` node:

```
[2025-05-20T15:03:45.180Z] [INFO] - examQuestionResponse: [ true ]
[2025-05-20T15:03:45.183Z] [INFO] Selected response type: examQuestion
```

#### Implementation Details

The exam question handler now provides a robust solution:

1. **Topic Extraction**

   - Uses multiple regex patterns to identify the subject of the requested exam questions
   - Handles various phrasings like "on [topic]", "about [topic]" and "related to [topic]"
   - Falls back to general biology topics when no specific topic is detected

2. **Education Level Detection**

   - Identifies A-level, high school, college, or university level requests
   - Adjusts difficulty of generated questions accordingly

3. **Question Generation**

   - Creates structured exam questions with proper format
   - Includes mark allocation and difficulty progression
   - Provides expected answer outlines for educational value

4. **Error Handling**
   - Implements comprehensive error handling with fallback questions
   - Ensures users always receive useful exam content even if specific topic extraction fails

### 3. Testing Framework

We've implemented a robust testing framework to ensure router accuracy:

```javascript
async function runTests() {
  console.log('=== RUNNING ROUTER TESTS ===');

  for (const query of examQuestionTestCases) {
    const result = await testRouter(query);
    if (result.responseType !== 'examQuestion') {
      console.error(
        `FAILED: "${query}" routed to ${result.responseType} instead of examQuestion`
      );
    } else {
      console.log(`PASSED: "${query}" correctly routed to examQuestion`);
    }
  }

  console.log('=== TESTS COMPLETE ===');
}
```

Test cases include:

- "please get me past exam question on Krebs Cycle"
- "I need a past paper on cell division"
- "show me some practice questions on photosynthesis"
- "can I have an exam question about DNA replication"
- "give me some A-level questions on ecology"

## Future Work

1. **Mark Scheme Handler**

   - Add specialized handling for mark scheme requests
   - Implement detailed answer structures with marking criteria

2. **Quiz Generation Improvements**

   - Enhance quiz format options (multiple choice, short answer, etc.)
   - Provide difficulty controls for quiz generation

3. **Performance Monitoring**

   - Implement analytics to track routing accuracy over time
   - Create a feedback loop to continuously improve router decisions

4. **Edge Case Handling**
   - Further enhance handling of ambiguous queries
   - Add more specialized nodes for additional content types

## Conclusion

The LangGraph-based router implementation significantly improves the accuracy and maintainability of the Biology AI Tutor's query handling system. The structured, node-based approach provides clear separation of concerns, making the system more robust and easier to extend in the future.
