# Biology AI Tutor - Prompt Templates

This directory contains the prompt templates used by the Biology AI Tutor. Each template is designed for a specific type of response and follows a consistent pattern.

## Prompt Structure

All prompts follow a similar structure:

1. **Role Definition**: Clearly defines the AI's role (e.g., "You are a Tutor Agent...")
2. **Context Insertion**: Uses placeholders like `{{variable}}` for dynamic content
3. **Response Format Instructions**: Provides detailed guidance on how to structure the response
4. **Edge Case Handling**: Includes instructions for handling unusual or edge cases

## Available Prompts

- `teach.js`: Structured teaching responses using Bloom's Taxonomy
- `contentCollector.js`: Factual information with textbook references
- `router.js`: Intent detection for routing queries to appropriate handlers
- `quiz.js`: Quiz generation with various question types
- `examQuestion.js`: Exam question extraction and formatting
- `markScheme.js`: Mark scheme extraction and formatting
- `summary.js`: Conversation summarization

## Usage

Prompts are imported from the central export in `index.js`:

```javascript
import prompts from '../prompts/index.js';

// Use a specific prompt
const teachingPrompt = prompts.teaching;
const quizPrompt = prompts.quiz;
```

## Testing Prompts

You can test prompts using the `promptTester.js` utility:

```javascript
import PromptTester from '../utils/promptTester.js';

const tester = new PromptTester();
const result = await tester.testPrompt('teaching', {
  query: 'Explain photosynthesis',
  context: 'Photosynthesis is the process...',
  conversationContext: 'Previous topics: cellular respiration',
});
```

Or use the CLI utility:

```bash
# Test in dry run mode (no API calls)
npm run test:prompt teaching

# Test with actual API calls
npm run test:prompt:api teaching
```

## Template Variables

Common variables used across prompts:

- `{{query}}`: The user's query or question
- `{{context}}`: Retrieved content from the FAISS index
- `{{conversationContext}}`: Context from previous messages
- `{{conversationHistory}}`: Full or filtered conversation history
- `{{recentMessages}}`: Most recent messages in the conversation

## Contextual Reference Handling

All prompts include instructions for handling contextual references (e.g., "Tell me more about this") by using the conversation context to resolve ambiguous references to specific biology topics.

## Best Practices for Modifying Prompts

1. **Maintain Educational Structure**: Ensure all prompts maintain the educational focus and structure
2. **Preserve Variable Placeholders**: Keep the `{{variable}}` syntax consistent
3. **Test Thoroughly**: Test any changes with both simple and complex queries
4. **Consider Token Limits**: Keep prompts efficient to avoid excessive token usage
5. **Maintain A-Level Focus**: Ensure prompts are appropriate for A-Level biology education

## Adding New Prompts

To add a new prompt:

1. Create a new file in this directory (e.g., `newPrompt.js`)
2. Export the prompt template as a string
3. Add it to the exports in `index.js`
4. Test it using the `promptTester.js` utility
