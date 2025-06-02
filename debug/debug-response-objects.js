// Simple test to check response objects
// Run with: node debug/debug-response-objects.js

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

// Create a test object
const finalState = {
  messages: [],
  conversationContext: {
    recentTopics: [],
    keyEntities: {},
    lastTopic: '',
  },
  examQuestionResponse: 'This is a test response',
};

// Function to safely print object structure
function printObjectStructure(obj, name = 'object', depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return;

  const indent = '  '.repeat(depth);

  if (obj === null) {
    console.log(`${indent}${name} = null`);
    return;
  }

  if (obj === undefined) {
    console.log(`${indent}${name} = undefined`);
    return;
  }

  if (typeof obj !== 'object') {
    console.log(
      `${indent}${name} = ${typeof obj} (${String(obj).substring(0, 50)})`
    );
    return;
  }

  console.log(`${indent}${name} = ${Array.isArray(obj) ? 'Array' : 'Object'}`);

  for (const key in obj) {
    printObjectStructure(obj[key], key, depth + 1, maxDepth);
  }
}

// Test finalization function
function testFinalResponse(finalState) {
  console.log('Checking finalState structure:');
  printObjectStructure(finalState, 'finalState');

  try {
    // Determine which response to return based on what was generated
    let reply;
    let responseType;

    // Log key properties for debugging
    console.log('\nChecking key response properties:');
    console.log(
      'examQuestionResponse:',
      finalState.examQuestionResponse !== undefined
        ? `exists (${typeof finalState.examQuestionResponse})`
        : 'undefined'
    );

    console.log(
      'markSchemeResponse:',
      finalState.markSchemeResponse !== undefined
        ? `exists (${typeof finalState.markSchemeResponse})`
        : 'undefined'
    );

    console.log(
      'quizResponse:',
      finalState.quizResponse !== undefined
        ? `exists (${typeof finalState.quizResponse})`
        : 'undefined'
    );

    console.log(
      'contentResponse:',
      finalState.contentResponse !== undefined
        ? `exists (${typeof finalState.contentResponse})`
        : 'undefined'
    );

    console.log(
      'teachingResponse:',
      finalState.teachingResponse !== undefined
        ? `exists (${typeof finalState.teachingResponse})`
        : 'undefined'
    );

    // Result assignment logic (simplified)
    if (finalState.examQuestionResponse) {
      reply = finalState.examQuestionResponse;
      responseType = 'examQuestion';
    } else if (finalState.markSchemeResponse) {
      reply = finalState.markSchemeResponse;
      responseType = 'markScheme';
    } else if (finalState.quizResponse) {
      reply = finalState.quizResponse;
      responseType = 'quiz';
    } else if (finalState.contentResponse) {
      reply = finalState.contentResponse;
      responseType = 'contentCollector';
    } else {
      reply = finalState.teachingResponse;
      responseType = 'teach';
    }

    console.log('\nResult of logic:');
    console.log('reply:', reply ? 'assigned' : 'undefined');
    console.log('responseType:', responseType || 'undefined');

    // Structure of response JSON
    const responseJson = {
      thread_id: 'test-thread',
      reply,
      responseType,
      message_count: finalState.messages?.length || 0,
      has_context:
        finalState.conversationContext &&
        ((finalState.conversationContext.recentTopics?.length || 0) > 0 ||
          Object.keys(finalState.conversationContext.keyEntities || {}).length >
            0),
    };

    console.log('\nFinal response JSON structure:');
    printObjectStructure(responseJson, 'responseJson');

    return true;
  } catch (err) {
    console.error('Error in test function:', err);
    console.error('Error stack:', err.stack);
    return false;
  }
}

// Test with our object
const result = testFinalResponse(finalState);
console.log('\nTest result:', result ? 'SUCCESS' : 'FAILURE');

// Test with a minimal object
console.log('\n=== Testing with minimal object ===');
const minimalState = {};
const minResult = testFinalResponse(minimalState);
console.log('\nMinimal test result:', minResult ? 'SUCCESS' : 'FAILURE');
