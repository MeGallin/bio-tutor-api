// src/graph/utils/promptTester.js

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import fs from 'fs/promises';
import path from 'path';

import prompts from '../prompts/index.js';
import { APP_CONFIG } from '../../config/index.js';

/**
 * Utility for testing prompt templates
 * This allows testing the different prompt templates with sample inputs
 * Supports a "dry run" mode that doesn't require an API key
 */
class PromptTester {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;

    if (!this.dryRun) {
      // Only create LLM instance if not in dry run mode
      if (!APP_CONFIG.OPENAI_API_KEY) {
        console.warn('Warning: No OPENAI_API_KEY found. Using dry run mode.');
        this.dryRun = true;
      } else {
        this.llm = new ChatOpenAI({
          modelName: options.modelName || APP_CONFIG.OPENAI_MODEL_NAME,
          temperature: options.temperature || 0.2,
          apiKey: APP_CONFIG.OPENAI_API_KEY,
        });
      }
    }
  }

  /**
   * Format a prompt by replacing template variables with values
   * @param {string} promptTemplate - The prompt template to format
   * @param {object} values - Object containing values for template variables
   * @returns {string} - The formatted prompt
   */
  formatPrompt(promptTemplate, values) {
    let formatted = promptTemplate;
    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{{${key}}}`;
      formatted = formatted.replace(new RegExp(placeholder, 'g'), value);
    }
    return formatted;
  }

  /**
   * Test a specific prompt with sample values
   * @param {string} promptName - Name of the prompt to test
   * @param {object} values - Values for template variables
   * @returns {Promise<string>} - The LLM's response or formatted prompt in dry run mode
   */
  async testPrompt(promptName, values) {
    if (!prompts[promptName]) {
      throw new Error(`Prompt template '${promptName}' not found.`);
    }

    const promptTemplate = prompts[promptName];
    const formattedPrompt = this.formatPrompt(promptTemplate, values);

    console.log(`Testing '${promptName}' prompt...`);

    if (this.dryRun) {
      console.log('DRY RUN MODE: Not making actual API calls');
      // Return a structured response showing the formatted prompt
      return this.generateDryRunResponse(promptName, formattedPrompt);
    }

    try {
      const result = await this.llm.invoke([new HumanMessage(formattedPrompt)]);
      return result.content;
    } catch (error) {
      console.error(`Error testing prompt '${promptName}':`, error);
      throw error;
    }
  }

  /**
   * Generate a dry run response that simulates an API response
   * @param {string} promptName - Name of the prompt
   * @param {string} formattedPrompt - The formatted prompt
   * @returns {string} - A simulated response
   */
  generateDryRunResponse(promptName, formattedPrompt) {
    // Create a markdown formatted response that shows what would be sent to the API
    return `# Dry Run Test for: ${promptName}

## Formatted Prompt

\`\`\`
${formattedPrompt}
\`\`\`

## Notes

This is a dry run, so no API call was made.

* Prompt template loaded successfully
* All template variables were replaced
* The resulting prompt contains ${formattedPrompt.length} characters
* Estimated tokens: ~${Math.ceil(formattedPrompt.length / 4)}

To run an actual test with API calls, ensure your OPENAI_API_KEY is set in the .env file.
`;
  }

  /**
   * Test all prompts with sample values and save results
   * @param {object} sampleValues - Sample values for all prompts
   * @returns {Promise<object>} - Object with results for each prompt
   */
  async testAllPrompts(sampleValues) {
    const results = {};
    const outputDir = path.join(process.cwd(), 'prompt-test-results');

    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      console.error('Error creating output directory:', error);
    }

    for (const promptName of Object.keys(prompts)) {
      if (promptName === 'topicCheck') continue; // Skip helper prompts

      try {
        console.log(`Testing ${promptName} prompt...`);
        const values = sampleValues[promptName] || sampleValues.default;
        const result = await this.testPrompt(promptName, values);
        results[promptName] = result;

        // Save result to file
        const outputPath = path.join(outputDir, `${promptName}-result.md`);
        await fs.writeFile(outputPath, result);
        console.log(`Saved ${promptName} result to ${outputPath}`);
      } catch (error) {
        console.error(`Error testing ${promptName}:`, error);
        results[promptName] = `ERROR: ${error.message}`;
      }
    }

    return results;
  }
}

export default PromptTester;

// Example usage (uncomment to run):
/*
async function runTest() {
  const tester = new PromptTester();
  
  const sampleValues = {
    default: {
      query: "Explain photosynthesis",
      context: "Photosynthesis is the process by which plants convert light energy into chemical energy...",
      conversationContext: "Previous topics: cellular respiration",
      conversationHistory: "User: How does cellular respiration work?\nAI: [Detailed explanation]...",
      recentMessages: "User: How does cellular respiration work?\nAI: [Detailed explanation]..."
    },
    // Override values for specific prompts if needed
    quiz: {
      query: "Create a quiz about photosynthesis",
      context: "Photosynthesis is the process by which plants convert light energy into chemical energy...",
      conversationContext: "Previous topics: cellular respiration"
    }
  };
  
  // Test a single prompt
  const teachingResult = await tester.testPrompt('teaching', sampleValues.default);
  console.log(teachingResult);
  
  // Test all prompts
  // const allResults = await tester.testAllPrompts(sampleValues);
}

runTest().catch(console.error);
*/
