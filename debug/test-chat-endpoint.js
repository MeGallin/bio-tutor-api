// debug/test-chat-endpoint.js - Simplified test for just the chat endpoint
import fetch from 'node-fetch';

const API_BASE_URL = process.env.API_URL || 'http://localhost:8000/api';
let currentThreadId = null;

/**
 * Simple function to test the chat endpoint with better error handling
 */
async function testChatEndpoint(message) {
  console.log(`\n=======================================`);
  console.log(`Testing chat endpoint with: "${message}"`);
  console.log(`Using API URL: ${API_BASE_URL}/chat`);
  console.log(`Thread ID: ${currentThreadId || 'New conversation'}`);
  console.log(`=======================================\n`);

  const payload = {
    message,
    ...(currentThreadId && { thread_id: currentThreadId }),
  };

  console.log('Request payload:', JSON.stringify(payload, null, 2));

  try {
    // Send the request with a longer timeout
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 30000, // 30 second timeout
    });

    console.log('Response status:', response.status);
    console.log(
      'Response headers:',
      Object.fromEntries(response.headers.entries())
    );

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);

    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        console.log('Response data structure:', Object.keys(data));

        if (data.thread_id) {
          currentThreadId = data.thread_id;
          console.log('Thread ID:', currentThreadId);
        }

        if (data.error) {
          console.error('API returned error:', data.error);
          console.error('Error message:', data.message);
        } else if (data.reply) {
          console.log(
            'Reply (first 150 chars):',
            data.reply.substring(0, 150) +
              (data.reply.length > 150 ? '...' : '')
          );
          console.log('Response type:', data.responseType);
          console.log('Message count:', data.message_count);
          console.log('Has context:', data.has_context ? 'Yes' : 'No');
        } else {
          console.log('No reply or error in response. Full data:', data);
        }
      } catch (jsonError) {
        console.error('Failed to parse JSON:', jsonError);
        const text = await response.text();
        console.log('Raw response text:', text.substring(0, 500) + '...');
      }
    } else {
      // Handle non-JSON response
      const text = await response.text();
      console.log(
        'Non-JSON response (first 500 chars):',
        text.substring(0, 500) + (text.length > 500 ? '...' : '')
      );
    }
  } catch (error) {
    console.error('Request failed:', error);
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      console.error(
        'Request timed out. The server might be processing your request but taking too long to respond.'
      );
    }
    console.error('Error stack:', error.stack);
  }
}

// Run the test with a simple message
async function runTest() {
  try {
    // First message to create a new thread
    await testChatEndpoint('Hi, I want to learn about cell biology');

    // If we got a thread ID, send a follow-up
    if (currentThreadId) {
      // Give the server a moment to process the first request
      console.log('\nWaiting 2 seconds before sending follow-up...\n');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Send a follow-up asking for exam questions (should trigger examQuestionExtractor)
      await testChatEndpoint(
        'Can you give me some exam questions on this topic?'
      );

      // Send another follow-up asking for mark scheme (should trigger markSchemeExtractor)
      console.log('\nWaiting 2 seconds before sending final message...\n');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await testChatEndpoint('What about the mark scheme for these questions?');
    }
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

runTest();
