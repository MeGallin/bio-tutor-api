/**
 * Debug utility for testing contextual references in the Biology AI Tutor
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { APP_CONFIG } from './src/config/index.js';
import {
  updateConversationContext,
  formatContextForPrompt,
} from './src/utils/contextAnalysis.js';

// Main function to test contextual references
async function testContextualReferences() {
  // Create an LLM instance
  const llm = new ChatOpenAI({
    modelName: APP_CONFIG.OPENAI_MODEL_NAME,
    temperature: 0.5,
    apiKey: APP_CONFIG.OPENAI_API_KEY,
  });

  console.log('=== Biology AI Tutor - Contextual Reference Testing ===');

  // Test conversation context about photosynthesis
  const bioContext = {
    recentTopics: ['photosynthesis', 'chloroplasts'],
    keyEntities: {
      photosynthesis:
        'Process where plants convert light energy to chemical energy',
      chloroplasts: 'Organelles where photosynthesis occurs',
    },
    lastTopic: 'photosynthesis',
  };

  // Test context about DNS (non-biology)
  const nonBioContext = {
    recentTopics: ['DNS', 'networking'],
    keyEntities: {
      DNS: 'Domain Name System, translates domain names to IP addresses',
      'IP address': 'Internet Protocol address',
    },
    lastTopic: 'DNS',
  };

  // Test queries with contextual references
  const queries = [
    'Can you create a quiz about this?',
    'Can you give me 3 questions on this topic?',
    'I want to learn more about it',
  ];

  // Testing with biology context
  console.log('\nTESTING WITH BIOLOGY CONTEXT: photosynthesis');
  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    const result = await checkQuery(query, llm, bioContext);
    console.log(`Result: ${result ? 'Biology topic' : 'Not a biology topic'}`);
  }

  // Testing with non-biology context
  console.log('\n\nTESTING WITH NON-BIOLOGY CONTEXT: DNS');
  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    const result = await checkQuery(query, llm, nonBioContext);
    console.log(`Result: ${result ? 'Biology topic' : 'Not a biology topic'}`);
  }
}

// Helper function to check if a query is about biology
async function checkQuery(query, llm, context) {
  // Check if this is a contextual reference
  const hasContextualRef = /\b(this|it|that|these|those|the topic)\b/i.test(
    query
  );
  console.log(
    `Contextual reference detected: ${hasContextualRef ? 'Yes' : 'No'}`
  );

  if (hasContextualRef && context) {
    const topic =
      context.lastTopic ||
      (context.recentTopics && context.recentTopics.length > 0
        ? context.recentTopics[0]
        : null);

    if (topic) {
      console.log(`Extracted topic from context: "${topic}"`);

      // Check non-biology topics
      const nonBioTopics = ['dns', 'domain', 'ip', 'computer', 'physics'];
      if (nonBioTopics.some((t) => topic.toLowerCase().includes(t))) {
        console.log(`"${topic}" identified as non-biology topic`);
        return false;
      }

      // Biology topics don't need LLM call
      return true;
    }
  }

  // If no contextual reference or no context, use LLM
  const prompt = `
  You are an expert in biology. Determine if this query is about biology:
  
  Query: ${query}
  
  Answer only with "yes" or "no".
  `;

  const response = await llm.invoke([new HumanMessage(prompt)]);
  const answer = response.content.toLowerCase().trim();
  console.log(`LLM response: ${answer}`);

  return answer.includes('yes');
}

// Run the test
testContextualReferences()
  .then(() => console.log('Testing completed'))
  .catch((e) => console.error('Error during testing:', e))
  .finally(() => process.exit(0));
