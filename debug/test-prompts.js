// debug/test-prompts.js

import PromptTester from '../src/graph/utils/promptTester.js';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';

/**
 * Simple CLI utility to test prompt templates
 *
 * Usage:
 *   node debug/test-prompts.js [promptName] [--api]
 *
 * Examples:
 *   node debug/test-prompts.js             # Test all prompts in dry run mode
 *   node debug/test-prompts.js teaching    # Test only teaching prompt in dry run mode
 *   node debug/test-prompts.js --api       # Test all prompts with actual API calls
 *   node debug/test-prompts.js teaching --api # Test teaching prompt with actual API calls
 */

async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const apiFlag = args.includes('--api');
  const promptArgs = args.filter((arg) => !arg.startsWith('--'));
  const promptToTest = promptArgs.length > 0 ? promptArgs[0] : null;

  console.log(chalk.blue('🧪 Biology AI Tutor - Prompt Testing Utility'));
  console.log(chalk.blue('=================================================='));

  // Use or don't use API based on flag
  if (apiFlag) {
    console.log(chalk.yellow('Using REAL API CALLS (may incur costs)'));
  } else {
    console.log(chalk.green('Using DRY RUN mode (no API calls)'));
  }

  // Create tester instance with appropriate options
  const tester = new PromptTester({
    dryRun: !apiFlag,
  });

  // Sample values for prompt testing
  const sampleValues = {
    default: {
      query: 'Explain photosynthesis in plants',
      context:
        'Photosynthesis is the process by which green plants, algae and certain bacteria convert light energy, usually from the sun, into chemical energy in the form of glucose or other sugars. The process primarily occurs in the chloroplasts of plant cells, specifically in structures called thylakoids. The overall reaction can be summarized as: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂. This process is critical for maintaining atmospheric oxygen levels and providing energy for nearly all life on Earth. In A-level biology textbooks, photosynthesis is typically covered in Chapter 5, Section 5.2 (pp. 102-118).',
      conversationContext:
        'Previous topics discussed: cellular respiration, plant cells',
      conversationHistory:
        'User: How does cellular respiration work?\nAI: [Detailed explanation of cellular respiration]...\nUser: What about photosynthesis?\n',
      recentMessages:
        'User: How does cellular respiration work?\nAI: [Detailed explanation of cellular respiration]...\nUser: What about photosynthesis?\n',
    },

    // Specific prompt values
    quiz: {
      query: 'Create a quiz about photosynthesis',
      context:
        'Photosynthesis is the process by which green plants, algae and certain bacteria convert light energy, usually from the sun, into chemical energy in the form of glucose or other sugars. The process primarily occurs in the chloroplasts of plant cells, specifically in structures called thylakoids. The overall reaction can be summarized as: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂. This process is critical for maintaining atmospheric oxygen levels and providing energy for nearly all life on Earth. In A-level biology textbooks, photosynthesis is typically covered in Chapter 5, Section 5.2 (pp. 102-118).',
      conversationContext:
        'Previous topics discussed: cellular respiration, plant cells',
    },

    examQuestion: {
      query: 'Find exam questions about photosynthesis',
      context:
        'BIOLOGY PAPER 2\nJune 2023\nQuestion 4:\n4.1 Describe the light-dependent reactions of photosynthesis. [5 marks]\n4.2 Explain how the structure of a chloroplast is related to its function in photosynthesis. [3 marks]\n\nQuestion 5:\n5.1 Compare and contrast the processes of cellular respiration and photosynthesis. [8 marks]\n\n--END OF EXAM--',
      conversationContext:
        'Previous topics discussed: cellular respiration, plant cells',
    },

    markScheme: {
      query: 'Show the mark scheme for photosynthesis questions',
      context:
        'MARK SCHEME - BIOLOGY PAPER 2\nJune 2023\n\nQuestion 4.1 (5 marks):\n- Light energy is absorbed by photosynthetic pigments/chlorophyll (1)\n- Excites electrons which are passed along electron transport chain (1)\n- ATP is generated (via chemiosmosis) (1)\n- Photolysis of water occurs (1)\n- Producing oxygen/O2, protons/H+ and electrons (1)\n\nQuestion 4.2 (3 marks):\n- Thylakoids contain photosynthetic pigments (1)\n- Large surface area for light absorption (1)\n- Stroma contains enzymes for the light-independent reactions / Calvin cycle (1)',
      conversationContext:
        'Previous topics discussed: cellular respiration, photosynthesis exam questions',
    },

    summary: {
      query: 'Summarize our conversation',
      conversationHistory:
        'User: How does cellular respiration work?\nAI: Cellular respiration is the process where cells break down glucose to release energy. It occurs in three main stages: glycolysis, the Krebs cycle, and oxidative phosphorylation. In glycolysis, glucose is split into two pyruvate molecules, generating a small amount of ATP. The Krebs cycle then breaks down pyruvate further, producing NADH and FADH2. Finally, these molecules enter the electron transport chain, where most ATP is produced through chemiosmosis.\n\nUser: What about photosynthesis? How does it relate to respiration?\nAI: Photosynthesis is essentially the reverse of cellular respiration. Plants capture light energy and use it to convert carbon dioxide and water into glucose and oxygen. While respiration breaks down glucose to release energy, photosynthesis builds glucose to store energy. The oxygen released by plants during photosynthesis is what animals use for respiration, while the carbon dioxide released during respiration is used by plants for photosynthesis, creating a beautiful ecological balance.\n\nUser: Can you explain the light-dependent reactions in more detail?\nAI: The light-dependent reactions occur in the thylakoid membranes of chloroplasts. When light strikes the chlorophyll pigments, it excites electrons, which are then passed along an electron transport chain. This electron flow drives the pumping of protons across the thylakoid membrane, creating a concentration gradient. As protons flow back through ATP synthase, ATP is produced - this is chemiosmosis, similar to what happens in cellular respiration. Water molecules are split in a process called photolysis, releasing oxygen, electrons (to replace those lost by chlorophyll), and protons. The light-dependent reactions produce ATP and NADPH, which are then used in the light-independent reactions (Calvin cycle) to produce glucose.',
      conversationContext:
        'Previous topics discussed: cellular respiration, photosynthesis, light-dependent reactions',
    },
  };

  // Create output directory
  const outputDir = path.join(process.cwd(), 'prompt-test-results');
  await fs.mkdir(outputDir, { recursive: true });

  try {
    if (promptToTest) {
      // Test specific prompt
      console.log(chalk.yellow(`Testing specific prompt: ${promptToTest}`));

      const values = sampleValues[promptToTest] || sampleValues.default;
      const result = await tester.testPrompt(promptToTest, values);

      // Save to file
      const outputPath = path.join(outputDir, `${promptToTest}-result.md`);
      await fs.writeFile(outputPath, result);

      console.log('\n' + chalk.green('Result:'));
      console.log(
        chalk.gray('--------------------------------------------------')
      );
      console.log(result.slice(0, 500) + (result.length > 500 ? '...' : ''));
      console.log(
        chalk.gray('--------------------------------------------------')
      );
      console.log(chalk.green(`\nFull result saved to: ${outputPath}`));
    } else {
      // Test all prompts
      console.log(chalk.yellow('Testing all prompts...'));

      const results = await tester.testAllPrompts(sampleValues);

      // Print summary
      console.log('\n' + chalk.green('Summary of Results:'));
      console.log(
        chalk.gray('--------------------------------------------------')
      );

      for (const [promptName, result] of Object.entries(results)) {
        const previewText =
          typeof result === 'string'
            ? result.slice(0, 100) + (result.length > 100 ? '...' : '')
            : 'ERROR';

        console.log(chalk.cyan(`${promptName}:`));
        console.log(previewText);
        console.log();
      }

      console.log(
        chalk.gray('--------------------------------------------------')
      );
      console.log(chalk.green(`\nFull results saved to: ${outputDir}`));
    }
  } catch (error) {
    console.error(chalk.red('Error testing prompts:'), error);
    process.exit(1);
  }
}

main().catch(console.error);
