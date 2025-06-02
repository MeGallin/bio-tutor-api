// debug/test-router-logic.js
import { createConversationGraph } from '../src/graph/index.js';
import { routerNode } from '../src/graph/nodes/router.js';
import { ChatOpenAI } from '@langchain/openai';
import { APP_CONFIG } from '../src/config/index.js';

// Create a mock LLM instance
const llm = new ChatOpenAI({
  modelName: APP_CONFIG.OPENAI_MODEL_NAME,
  temperature: 0.5,
  apiKey: APP_CONFIG.OPENAI_API_KEY,
});

// Set of test queries
const testQueries = [
  // Information queries that should go to contentCollector
  { query: 'What is photosynthesis?', expectedType: 'contentCollector' },
  { query: 'Define mitosis', expectedType: 'contentCollector' },
  { query: 'List the parts of a cell', expectedType: 'contentCollector' },
  { query: 'What are enzymes?', expectedType: 'contentCollector' },
  { query: 'Tell me about DNA', expectedType: 'contentCollector' },
  {
    query: 'Information on the circulatory system',
    expectedType: 'contentCollector',
  },
  { query: 'What does ATP stand for?', expectedType: 'contentCollector' },
  { query: 'Facts about evolution', expectedType: 'contentCollector' },

  // "Does..." question tests - should go to contentCollector
  {
    query: 'Does epistasis involve enzymes?',
    expectedType: 'contentCollector',
  },
  {
    query: 'Does respiration involve the action of enzymes?',
    expectedType: 'contentCollector',
  },
  {
    query: 'Does glycolysis occur in the cytoplasm?',
    expectedType: 'contentCollector',
  },
  { query: 'Is DNA a double helix?', expectedType: 'contentCollector' },
  {
    query: 'Are proteins made of amino acids?',
    expectedType: 'contentCollector',
  },

  // Teaching queries that should go to teach
  { query: 'Explain how photosynthesis works', expectedType: 'teach' },
  { query: 'Help me understand cell division', expectedType: 'teach' },
  { query: 'Can you teach me about genetics?', expectedType: 'teach' },
  { query: 'Why does oxygen bind to hemoglobin?', expectedType: 'teach' },
  { query: 'I want to learn about the nervous system', expectedType: 'teach' },
  { query: 'Show me how DNA replication works', expectedType: 'teach' },

  // Ambiguous queries that could go either way
  { query: 'Tell me about photosynthesis', ambiguous: true },
  { query: 'Explain what enzymes are', ambiguous: true },

  // Quiz queries
  { query: 'Quiz me on cell biology', expectedType: 'quiz' },
  {
    query: 'Give me some practice questions on genetics',
    expectedType: 'quiz',
  },

  // Exam paper queries
  {
    query: 'Show me past exam questions on photosynthesis',
    expectedType: 'examQuestion',
  },

  // Mark scheme queries
  {
    query: "What's the mark scheme for photosynthesis questions?",
    expectedType: 'markScheme',
  },
];

// Function to test router
async function testRouter() {
  console.log('TESTING ROUTER LOGIC');
  console.log('======================================');

  const router = routerNode(llm);

  // Process each test query
  for (const test of testQueries) {
    const state = {
      messages: [{ role: 'user', content: test.query }],
      conversationContext: {
        recentTopics: [],
        keyEntities: {},
        lastTopic: '',
      },
      threadId: `test-${Date.now()}`,
    };

    try {
      console.log(`\nTesting query: "${test.query}"`);
      const result = await router(state);
      const actualType =
        result.responseType || result.__config__?.responseType || 'unknown';

      if (test.ambiguous) {
        console.log(
          `  Result: ${actualType} (This was an ambiguous query that could go either way)`
        );
      } else if (actualType === test.expectedType) {
        console.log(`  ✅ PASSED: Routed to ${actualType} as expected`);
      } else {
        console.log(
          `  ❌ FAILED: Routed to ${actualType}, expected ${test.expectedType}`
        );
      }
    } catch (error) {
      console.error(`  ❌ ERROR: ${error.message}`);
    }
  }

  console.log('\n======================================');
  console.log('ROUTER TESTING COMPLETE');
}

// Run the test
testRouter().catch((error) => {
  console.error('Test failed with error:', error);
});
