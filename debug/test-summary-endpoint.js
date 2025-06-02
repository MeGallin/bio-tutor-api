// debug/test-summary-endpoint.js
import fetch from 'node-fetch';

const API_BASE_URL = process.env.API_URL || 'http://localhost:8000/api';

/**
 * Simple function to test the summary endpoint
 */
async function testSummaryEndpoint(threadId) {
  console.log(`\n=======================================`);
  console.log(`Testing summary endpoint with thread ID: ${threadId}`);
  console.log(`Using API URL: ${API_BASE_URL}/chat`);
  console.log(`=======================================\n`);

  const payload = {
    message: 'summarise this conversation',
    thread_id: threadId,
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
          console.log('Thread ID:', data.thread_id);
        }

        if (data.error) {
          console.error('API returned error:', data.error);
          console.error('Error message:', data.message);
        } else if (data.reply) {
          console.log('Response type:', data.responseType);
          console.log('Has context:', data.has_context ? 'Yes' : 'No');
          console.log('\nSummary Response:', data.reply);
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

// Get thread ID from command line arguments
const threadId = process.argv[2];

if (!threadId) {
  console.error('Please provide a thread ID as a command line argument');
  process.exit(1);
}

// Run the test with the provided thread ID
testSummaryEndpoint(threadId);
