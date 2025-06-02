/**
 * Debug utility for testing contextual references in the Biology AI Tutor
 * 
 * This script simulates conversation context and helps diagnose issues with
 * contextual reference handling in the Quiz Agent and teach node.
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { APP_CONFIG } from './src/config/index.js';
import { updateConversationContext, formatContextForPrompt } from './src/utils/contextAnalysis.js';

// Recreated isBiologyTopic function since it's not exported by quizAgent.js
async function isBiologyTopic(
  query,
  model,
  conversationContext = null,
  hasContextualReference = false
) {
  try {
    // If there's a contextual reference and we have conversation context,
    // we need to extract the actual topic from context first
    if (hasContextualReference && conversationContext) {
      console.log(
        `Query "${query}" contains contextual reference. Using conversation context to determine topic.`
      );
      
      // Extract the topic from context
      const contextTopic = conversationContext.lastTopic || 
        (conversationContext.recentTopics && conversationContext.recentTopics.length > 0 
          ? conversationContext.recentTopics[0] 
          : null);
      
      if (contextTopic) {
        console.log(`Extracted topic from context: "${contextTopic}"`);
        
        // Check if the contextual topic is a common non-biology topic
        const nonBiologyTopics = [
          'dns', 'domain name system', 'ip', 'computer', 'physics',
          'history', 'mathematics', 'literature', 'politics',
          'economics', 'geography', 'art', 'music'
        ];
        
        const isNonBiology = nonBiologyTopics.some(topic => 
          contextTopic.toLowerCase().includes(topic));
        
        if (isNonBiology) {
          console.log(`Context topic "${contextTopic}" is explicitly non-biology`);
          return false;
        }
        
        // For biology context topics, we can return true without an LLM call
        console.log(`Context topic "${contextTopic}" is likely biology-related`);
        return true;
      } else {
        console.log(`No topic could be extracted from context even with contextual reference`);
      }
    }

    // Format the topic check prompt
    const topicCheckPrompt = `
    You are an expert in biology. You need to determine if the following query is related to biology:
    
    Query: ${query}
    
    Respond ONLY with "yes" if the query is related to biology (cells, DNA, proteins, ecosystems, evolution, etc.) or "no" if it's about an unrelated field (physics, computer science, history, etc.).
    `;

    // Ask the LLM if this is a biology topic
    const result = await model.invoke([new HumanMessage(topicCheckPrompt)]);
    const response = result.content.toString().toLowerCase().trim();

    console.log(`Topic check for "${query}" resulted in: ${response}`);

    // Return true if the response contains "yes"
    return response.includes('yes');
  } catch (error) {
    console.error('Error checking if topic is biology-related:', error);
    // Default to false if there's an error
    return false;
  }
}

async function testContextualReference() {
  console.log('=== Biology AI Tutor - Contextual Reference Debug Tool ===');
  
  // Create a LLM instance
  const llm = new ChatOpenAI({
    modelName: APP_CONFIG.OPENAI_MODEL_NAME,
    temperature: 0.5,
    apiKey: APP_CONFIG.OPENAI_API_KEY,
  });
  
  // 1. Test extraction of topics from conversation context
  console.log('\n[TEST 1] Topic extraction from conversation context');
  
  // Sample conversation context
  const conversationContext = {
    recentTopics: ['photosynthesis', 'chloroplasts'],
    keyEntities: {
      'photosynthesis': 'Process where plants convert light energy to chemical energy',
      'chloroplasts': 'Organelles where photosynthesis occurs'
    },
    lastTopic: 'photosynthesis'
  };
  
  // Sample contextual references
  const contextualReferences = [
    'Can you create a quiz about this?',
    'Can you give me 3 questions on this topic?',
    'Tell me more about it',
    'I'd like to test my knowledge on this subject',
    'Can you help me practice this?'
  ];
  
  // Test each contextual reference
  for (const query of contextualReferences) {
    console.log(`\nTesting contextual reference: "${query}"`);
    
    const isBiology = await isBiologyTopic(
      query,
      llm,
      conversationContext,
      true
    );
    
    console.log(`- Is biology topic: ${isBiology ? 'Yes' : 'No'}`);
    console.log(`- Expected context topic: ${conversationContext.lastTopic}`);
  }
  
  // 2. Test non-biology topics
  console.log('\n\n[TEST 2] Non-biology topic detection');
  
  const nonBiologyContext = {
    recentTopics: ['DNS', 'networking'],
    keyEntities: {
      'DNS': 'Domain Name System, translates domain names to IP addresses',
      'IP address': 'Internet Protocol address'
    },
    lastTopic: 'DNS'
  };
  
  // Test with a non-biology context
  const testQuery = 'Can you create a quiz about this?';
  console.log(`Testing with non-biology context topic "${nonBiologyContext.lastTopic}"`);
  
  const isBiologyResult = await isBiologyTopic(
    testQuery,
    llm,
    nonBiologyContext,
    true
  );
  
  console.log(`- Is biology topic: ${isBiologyResult ? 'Yes' : 'No'}`);
  console.log(`- Expected result: No (DNS is not biology-related)`);
  
  // 3. Test context updating
  console.log('\n\n[TEST 3] Context updating functionality');
  
  const messages = [
    { role: 'user', content: 'Tell me about photosynthesis' },
    { role: 'ai', content: 'Photosynthesis is the process by which plants convert light energy into chemical energy...' },
    { role: 'user', content: 'Can you give me 3 questions on this topic?' }
  ];
  
  console.log('Testing context updating with conversation about photosynthesis');
  const updatedContext = await updateConversationContext(messages, {}, llm);
  
  console.log('Updated context:');
  console.log(`- Last topic: ${updatedContext.lastTopic || 'none'}`);
  console.log(`- Recent topics: [${updatedContext.recentTopics?.join(', ') || 'none'}]`);
  console.log(`- Key entities: ${Object.keys(updatedContext.keyEntities || {}).join(', ')}`);
  
  console.log('\nContext formatted for prompt:');
  console.log(formatContextForPrompt(updatedContext));
  
  console.log('\n=== Debug Tests Complete ===');
}

    // Format the topic check prompt
    const topicCheckPrompt = `
    You are an expert in biology. You need to determine if the following query is related to biology:
    
    Query: ${query}
    
    Respond ONLY with "yes" if the query is related to biology (cells, DNA, proteins, ecosystems, evolution, etc.) or "no" if it's about an unrelated field (physics, computer science, history, etc.).
    `;

    // Ask the LLM if this is a biology topic
    const result = await llm.invoke([new HumanMessage(topicCheckPrompt)]);
    const response = result.content.toString().toLowerCase().trim();

    console.log(`Topic check for "${query}" resulted in: ${response}`);

    // Return true if the response contains "yes"
    return response.includes('yes');
  } catch (error) {
    console.error('Error checking if topic is biology-related:', error);
    // Default to false if there's an error
    return false;
  }
}

// Create a LLM instance
const llm = new ChatOpenAI({
  modelName: APP_CONFIG.OPENAI_MODEL_NAME,
  temperature: 0.5,
  apiKey: APP_CONFIG.OPENAI_API_KEY,
});

async function testContextualReference() {
  console.log('=== Biology AI Tutor - Contextual Reference Debug Tool ===');
  
  // 1. Test extraction of topics from conversation context
  console.log('\n[TEST 1] Topic extraction from conversation context');
  
  // Sample conversation context
  const conversationContext = {
    recentTopics: ['photosynthesis', 'chloroplasts'],
    keyEntities: {
      'photosynthesis': 'Process where plants convert light energy to chemical energy',
      'chloroplasts': 'Organelles where photosynthesis occurs'
    },
    lastTopic: 'photosynthesis'
  };
  
  // Sample contextual references
  const contextualReferences = [
    'Can you create a quiz about this?',
    'Can you give me 3 questions on this topic?',
    'Tell me more about it',
    'I'd like to test my knowledge on this subject',
    'Can you help me practice this?'
  ];
  
  // Test each contextual reference
  for (const query of contextualReferences) {
    console.log(`\nTesting contextual reference: "${query}"`);
    
    const isBiology = await isBiologyTopic(
      query,
      llm,
      conversationContext,
      true
    );
    
    console.log(`- Is biology topic: ${isBiology ? 'Yes' : 'No'}`);
    console.log(`- Expected context topic: ${conversationContext.lastTopic}`);
  }
  
  // 2. Test non-biology topics
  console.log('\n\n[TEST 2] Non-biology topic detection');
  
  const nonBiologyContext = {
    recentTopics: ['DNS', 'networking'],
    keyEntities: {
      'DNS': 'Domain Name System, translates domain names to IP addresses',
      'IP address': 'Internet Protocol address'
    },
    lastTopic: 'DNS'
  };
  
  // Test with a non-biology context
  const testQuery = 'Can you create a quiz about this?';
  console.log(`Testing with non-biology context topic "${nonBiologyContext.lastTopic}"`);
  
  const isBiologyResult = await isBiologyTopic(
    testQuery,
    llm,
    nonBiologyContext,
    true
  );
  
  console.log(`- Is biology topic: ${isBiologyResult ? 'Yes' : 'No'}`);
  console.log(`- Expected result: No (DNS is not biology-related)`);
  
  // 3. Test context updating
  console.log('\n\n[TEST 3] Context updating functionality');
  
  const messages = [
    { role: 'user', content: 'Tell me about photosynthesis' },
    { role: 'ai', content: 'Photosynthesis is the process by which plants convert light energy into chemical energy...' },
    { role: 'user', content: 'Can you give me 3 questions on this topic?' }
  ];
  
  console.log('Testing context updating with conversation about photosynthesis');
  const updatedContext = await updateConversationContext(messages, {}, llm);
  
  console.log('Updated context:');
  console.log(`- Last topic: ${updatedContext.lastTopic || 'none'}`);
  console.log(`- Recent topics: [${updatedContext.recentTopics?.join(', ') || 'none'}]`);
  console.log(`- Key entities: ${Object.keys(updatedContext.keyEntities || {}).join(', ')}`);
  
  console.log('\nContext formatted for prompt:');
  console.log(formatContextForPrompt(updatedContext));
  
  console.log('\n=== Debug Tests Complete ===');
}

// Run the test
testContextualReference()
  .then(() => console.log('All tests completed'))
  .catch(error => console.error('Error during testing:', error))
  .finally(() => process.exit(0));
