/**
 * Test script to verify LangSmith UUID validation
 *
 * This script tests the UUID validation and error handling in the LangSmith integration
 * to ensure it properly handles various edge cases that could cause the
 * "Invalid UUID: [object Object]" error.
 */

import { traceLLMInteraction, isValidUuid } from '../src/utils/langsmith.js';
import { v4 as uuidv4 } from 'uuid';

// Test the UUID validation function
console.log('\n--- Testing UUID validation ---');
const testUUIDs = [
  uuidv4(), // Valid UUID
  '123e4567-e89b-12d3-a456-426614174000', // Valid UUID format
  '123e4567-e89b-12d3-a456-4266141740', // Invalid - too short
  '123e4567-e89b-12d3-a456-42661417400000', // Invalid - too long
  {}, // Invalid object
  { toString: () => '123e4567-e89b-12d3-a456-426614174000' }, // Object with toString
  null, // Null
  undefined, // Undefined
  12345, // Number
  'not-a-uuid', // Invalid string
];

testUUIDs.forEach((uuid) => {
  console.log(
    `Testing: ${JSON.stringify(uuid)} (${typeof uuid}): ${isValidUuid(uuid)}`
  );
});

// Test traceLLMInteraction with various callback returns
console.log('\n--- Testing traceLLMInteraction ---');

async function runTest() {
  try {
    // Test with normal string content
    console.log('\nTest 1: Standard response object');
    const result1 = await traceLLMInteraction(
      'test',
      async () => {
        return { content: 'This is a test response' };
      },
      { test: 'metadata' }
    );
    console.log('Result 1:', result1);

    // Test with circular reference (would cause JSON.stringify to fail)
    console.log('\nTest 2: Circular reference object');
    const circularObj = { name: 'circular' };
    circularObj.self = circularObj;

    const result2 = await traceLLMInteraction(
      'test',
      async () => {
        return circularObj;
      },
      { test: 'metadata' }
    );
    console.log('Result 2:', result2);

    // Test with object that's not serializable in a normal way
    console.log('\nTest 3: Object with special properties');
    const specialObj = {
      toString() {
        return 'Custom toString';
      },
      content: 'Test content',
      get computed() {
        return Date.now();
      },
    };

    const result3 = await traceLLMInteraction(
      'test',
      async () => {
        return specialObj;
      },
      { test: 'metadata' }
    );
    console.log('Result 3:', result3);

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

runTest();
