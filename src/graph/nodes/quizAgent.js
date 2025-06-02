// src/graph/nodes/quizAgent.js
import { HumanMessage } from '@langchain/core/messages';
import { APP_CONFIG } from '../../config/index.js';
import { setupTracingForModels } from '../../utils/langsmith.js';
import {
  sanitizeFilePath,
  sanitizeDocumentMetadata,
} from '../../utils/pathUtils.js';
import {
  updateConversationContext,
  formatContextForPrompt,
} from '../../utils/contextAnalysis.js';
import prompts from '../prompts/index.js';

// Use the prompts from the centralized prompt system
const quizPrompt = prompts.quiz;
const topicCheckPrompt = prompts.topicCheck;
// Keeping the old prompt as a reference in case needed
const oldQuizPrompt = `
You are the Quiz Agent and will receive only your knowledge and information from the content_retriever_tool!

You are an AI assistant with expertise in A-Level Biology (advanced high-school/pre-university). You have been provided with an extensive textbook table of contents, including chapter names, section headings, and page references. This table of contents covers a wide range of biology topics, including (but not limited to): biological molecules, cell structures, transport mechanisms, genetics, ecology, physiology, homeostasis, and advanced molecular techniques.

IMPORTANT CONTEXTUAL INSTRUCTION: 
If the user query contains references like "this topic", "it", "that", etc., use the conversation context to determine what topic they're referring to. Pay special attention to the most recent topic discussed.

Your role is to:
- Use the provided textbook table of contents as your primary reference to generate educational content.
- When requested, create engaging quizzes, practice questions, and multiple-choice questions that assess understanding of A-Level Biology topics.
- For each quiz or question, ensure that:
  1. **Relevance:** The questions relate directly to topics, sections, or chapter headings from the table of contents.
  2. **Clarity and Accuracy:** The questions are clearly written, use appropriate A-Level Biology terminology, and reflect the academic standard of the provided material.
  3. **Variety:** Include different types of questions (e.g., multiple-choice, short answer, matching, fill-in-the-blank) to test various aspects of the subject.
  4. **References:** When possible, include references to the relevant section numbers or page numbers from the table of contents to guide further reading (e.g., "Refer to Section 4.2 on Diffusion (p.87)").
  5. **Answer Key (for quizzes):** Provide the correct answer(s) and a brief explanation or rationale where applicable.

Below is the textbook table of contents. Use it as your primary reference when creating quizzes or practice questions. If the user requests deeper details from a specific section, do your best to summarise the possible content in that section while staying true to the level of detail suggested by the headings.

---
**TABLE OF CONTENTS PROVIDED:**

Section 1  
4 Transport across cell membranes 84  
4.1 Structure of the cell surface membrane 84  
Biological molecules 2  
4.2 Diffusion 87  
1 Biological molecules 4  
4.3 Osmosis 89  
1.1 Introduction to Biological Molecules 4  
4.4 Active transport 93  
1.2 Carbohydrates and monosaccharides 8  
4.5 Co·transport and absorption of glucose  
1.3 Carbohydrates -disaccharides and polysaccharides 10  
Practice questions 99  
1.4 Starch, glycogen and cellulose 13  
5 Cell recognition and the immune system 102  
1.5 Lipids 16  
5.1 Defence mechanisms 102  
1.6 Proteins 19  
1.7 Enzyme action 23  
5.2 Phagocytosis 104  
1.8 Factors affecting enzyme action 26  
5.3 T Lymphocytes and cell-mediated immunity 106  
Practice questions 34  
5.4 B lymphocytes and humoral immunity 109  
5.5 Antibodies 111  
2 Nucleic acids 36  
5.6 Vaccination 115  
5.7 Human immunodeficiency virus (HIV) 119  
2.1 Structure of RNA and DNA 36  
5.7 DNA replication 42  
2.3 Energy and ATP 46  
Section 2 summary 124  
2.4 Water and its functions  
Section 2 practice questions 126  
Practice questions so  
Section 1 summary 52  
Section 3  
Section 1 practice questions 54  
Organisms exchange substances with their environment 128  
Section 2  
6 Exchange 130  
Cells 56  
6.1 Exchange between organisms and their environment 130  
3 Cell structure 58  
6.2 Methods of studying cells 58  
3.2 The electron microscope 61  
6.3 Gas exchange in single-celled organisms and insects 133  
3.3 Microscopic measurements and calculations 64  
6.4 Gas exchange in fish 135  
3.4 Eukaryotic cell structure 67  
6.5 Limiting water loss 139  
3.5 Cell specialisation and organisation 73  
6.6 Structure of the human gas-exchange system 142  
3.6 Prokaryotic cells and viruses 75  
6.7 The mechanism of breathing 144  
3.7 Mitosis 77  
6.8 Exchange of gases in the lungs 146  
3.8 The cell cycle 80  
6.9 Enzymes and digestion 151  
6.10 Absorption of the products of digestion 155  
Practice questions 158  

**Instructions for Answering Questions:**
1. **Stay On Topic:** Only use the topics and section headings from the provided content as your primary source.
2. **Reference Sections:** When possible, reference relevant pages or section numbers from the table of contents to guide the user.
3. **Offer Summaries, Not Full Text:** Provide insightful summaries or clarifications. Do not quote large verbatim chunks of text.
4. **Maintain Academic Accuracy:** Explanations should align with A-Level biology standards.

{{conversationContext}}

Now, use the following retrieved reference information to supplement your knowledge:
--------------------
{{context}}
--------------------

Topic for quiz: {{query}}

Create a comprehensive quiz on this biology topic. Include a variety of question types, such as:
1. Multiple-choice questions (with 4 options labeled A-D)
2. Short answer questions
3. Fill-in-the-blank questions
4. True/False questions
5. Matching questions
6. Diagram labeling questions (if appropriate for the topic)

For each question:
1. Be clear and specific
2. Reference relevant sections from the A-Level textbook where possible
3. Cover different aspects or subtopics within the main topic
4. Include appropriate difficulty levels (from recall to application)

Don't limit yourself to exactly 5 questions - include as many questions as needed to comprehensively assess the topic (typically 5-10 questions).

Format the quiz as follows:

# Biology Quiz: [Topic]

## Multiple Choice

### Question 1
[Question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
(References Section X.X, p.XX)

### Question 2
[Question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
(References Section X.X, p.XX)

## Short Answer

### Question 3
[Question text]
(References Section X.X, p.XX)

## Fill-in-the-Blank

### Question 4
[Sentence with blank(s) to complete]
(References Section X.X, p.XX)

## True/False

### Question 5
[Statement to evaluate as true or false]
(References Section X.X, p.XX)

[Continue with additional questions as appropriate]

## Answer Key
1. [Correct answer] - [Brief explanation]
2. [Correct answer] - [Brief explanation]
3. [Expected short answer content]
4. [Word(s) that correctly fill the blank(s)]
5. [True/False] - [Brief explanation]
[Continue with answers for all questions]

[Continue for all 5 questions]

## Answer Key
1. [Correct answer letter] - [Brief explanation]
2. [Correct answer letter] - [Brief explanation]
3. [Correct answer letter] - [Brief explanation]
4. [Correct answer letter] - [Brief explanation]
5. [Correct answer letter] - [Brief explanation]
`;

// Default response when no relevant context is found or topic is not related to biology
const noContextResponse = `I am a biology Quiz Agent specialized in topics for which I have reference information. Unfortunately, I don't have any relevant information about this topic in my database. I can create quizzes for you on biology topics such as cells, DNA, proteins, ecosystems, evolution, and other biological topics if they are in my reference materials.`;

// Response for when we detect a contextual reference but the topic is not biology-related
const nonBiologyContextualResponse = `I noticed you're asking for a quiz about a topic we were just discussing. However, as a biology tutor, I'm specialized in creating quizzes on biology topics only. The previous topic we discussed isn't within my area of expertise. 

I'd be happy to create a quiz for you on any biology topic, such as:
- Cell structure and function
- DNA and genetics
- Protein synthesis
- Photosynthesis
- Ecosystems and ecology
- Human anatomy and physiology

Would you like a quiz on one of these topics instead?`;

/**
 * Check if a query is related to biology using the LLM (reusing from teach.js)
 */
async function isBiologyTopic(
  query,
  llm,
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
      const contextTopic =
        conversationContext.lastTopic ||
        (conversationContext.recentTopics &&
        conversationContext.recentTopics.length > 0
          ? conversationContext.recentTopics[0]
          : null);

      if (contextTopic) {
        console.log(`Extracted topic from context: "${contextTopic}"`);

        // Check if the contextual topic is a common non-biology topic
        const nonBiologyTopics = [
          'dns',
          'domain name system',
          'ip',
          'computer',
          'physics',
          'history',
          'mathematics',
          'literature',
          'politics',
          'economics',
          'geography',
          'art',
          'music',
        ];

        const isNonBiology = nonBiologyTopics.some((topic) =>
          contextTopic.toLowerCase().includes(topic)
        );

        if (isNonBiology) {
          console.log(
            `Context topic "${contextTopic}" is explicitly non-biology`
          );
          return false;
        }

        // For biology context topics, we can return true without an LLM call
        console.log(
          `Context topic "${contextTopic}" is likely biology-related`
        );
        return true;
      } else {
        console.log(
          `No topic could be extracted from context even with contextual reference`
        );
      }
    }

    // Format the topic check prompt
    const checkPrompt = topicCheckPrompt.replace('{{query}}', query);

    // Ask the LLM if this is a biology topic
    const result = await llm.invoke([new HumanMessage(checkPrompt)]);
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

/**
 * Quiz Agent node that generates a quiz using the LLM
 * based on retrieved context and the user's query
 */
export const quizNode = (llm) => {
  return async (state) => {
    // Define variables that need to be accessed in the finally block outside the try scope
    let explicitTopic = null;
    let originalQuery = null;
    let hasContextualReference = false;
    let updatedContext = null;

    try {
      console.log('Quiz Agent received state with conversation context:', {
        hasContext:
          state.conversationContext &&
          (state.conversationContext.recentTopics.length > 0 ||
            Object.keys(state.conversationContext.keyEntities).length > 0),
        topicCount: state.conversationContext?.recentTopics?.length || 0,
        entityCount: Object.keys(state.conversationContext?.keyEntities || {})
          .length,
        lastTopic: state.conversationContext?.lastTopic || 'none',
      });
      // Check if there's a contextual reference in the query
      hasContextualReference = state.hasContextualReference || false;

      // NEW APPROACH: Extract explicit topic from context when there's a contextual reference
      explicitTopic = null;
      originalQuery = state.query;

      if (hasContextualReference && state.conversationContext) {
        console.log(
          `Quiz Agent detected contextual reference in query: "${state.query}"`
        );

        // Extract the topic from context more aggressively
        if (state.conversationContext.lastTopic) {
          // Ensure we get a string value
          explicitTopic =
            typeof state.conversationContext.lastTopic === 'string'
              ? state.conversationContext.lastTopic
              : 'biology topic';
          console.log(`Using lastTopic: "${explicitTopic}"`);
        } else if (
          state.conversationContext.recentTopics &&
          state.conversationContext.recentTopics.length > 0
        ) {
          // Ensure we get a string value
          const firstTopic = state.conversationContext.recentTopics[0];
          explicitTopic =
            typeof firstTopic === 'string' ? firstTopic : 'biology topic';
          console.log(`Using first recentTopic: "${explicitTopic}"`);
        } else if (
          Object.keys(state.conversationContext.keyEntities || {}).length > 0
        ) {
          // If we still don't have a topic, use the first key entity as a fallback
          const firstKey = Object.keys(
            state.conversationContext.keyEntities
          )[0];
          explicitTopic =
            typeof firstKey === 'string' ? firstKey : 'biology topic';
          console.log(`Using first keyEntity as fallback: "${explicitTopic}"`);
        }

        if (explicitTopic) {
          console.log(
            `Extracted topic "${explicitTopic}" from conversation context`
          );

          // Create an explicit query with the resolved topic
          originalQuery = state.query; // Save original for later
          state.query = `Create a quiz about ${explicitTopic}`;
          console.log(`Rewriting query to: "${state.query}"`);
        } else {
          console.log('Could not extract topic from conversation context');
        }
      } // First, check if the query is related to biology, using context if available
      let isBiology;

      // Handle contextual references and explicit topics differently
      if (hasContextualReference) {
        console.log(
          `Processing query with contextual reference: "${originalQuery}"`
        );

        if (explicitTopic) {
          console.log(
            `Using extracted topic "${explicitTopic}" to determine if it's biology`
          );

          // Use our improved isBiologyTopic that properly handles contextual references
          isBiology = await isBiologyTopic(
            `Is ${explicitTopic} a biology topic?`,
            llm,
            state.conversationContext,
            true // explicitly set hasContextualReference to true
          );

          console.log(
            `Topic check result for "${explicitTopic}": ${
              isBiology ? 'Is biology' : 'Not biology'
            }`
          );
        } else {
          // If we couldn't extract a topic but have a contextual reference,
          // we should be cautious and check with the LLM
          console.log(
            `No explicit topic extracted, checking original query with context`
          );
          isBiology = await isBiologyTopic(
            originalQuery,
            llm,
            state.conversationContext,
            true // explicitly set hasContextualReference to true
          );
          console.log(
            `Topic check for contextual reference without explicit topic: ${
              isBiology ? 'Is biology' : 'Not biology'
            }`
          );
        }
      } else if (explicitTopic) {
        // Non-contextual reference but we have an explicit topic (unlikely case)
        console.log(
          `Checking if explicit topic "${explicitTopic}" is biology-related`
        );

        // Use a direct approach for common non-biology topics to avoid LLM call
        const nonBiologyTopics = [
          'dns',
          'domain name system',
          'ip',
          'computer',
          'physics',
          'history',
          'mathematics',
          'literature',
          'politics',
          'economics',
          'geography',
          'art',
          'music',
        ];

        if (
          nonBiologyTopics.some((topic) =>
            explicitTopic.toLowerCase().includes(topic)
          )
        ) {
          console.log(`Topic "${explicitTopic}" is explicitly non-biology`);
          isBiology = false;
        } else {
          isBiology = await isBiologyTopic(
            `Is ${explicitTopic} a biology topic?`,
            llm
          );
        }
      } else {
        // Standard query, no contextual reference, no explicit topic
        console.log(`Standard query check for: "${state.query}"`);
        isBiology = await isBiologyTopic(state.query, llm);
      }
      if (!isBiology) {
        console.log(
          `Topic "${
            explicitTopic || state.query
          }" is not related to biology. Returning specific response.`
        );
        // Make a deep copy of the conversation context to avoid reference issues
        const preservedContext = state.conversationContext
          ? JSON.parse(JSON.stringify(state.conversationContext))
          : {
              recentTopics: [],
              keyEntities: {},
              lastTopic: '',
            };

        // Customize the non-biology response with the explicit topic if available
        let responseText;

        if (explicitTopic) {
          // Ensure explicitTopic is a string
          const topicString =
            typeof explicitTopic === 'string'
              ? explicitTopic
              : JSON.stringify(explicitTopic);

          responseText = `I noticed you're asking for a quiz about "${topicString}". However, as a biology tutor, I'm specialized in creating quizzes only on biology topics, and "${topicString}" appears to be outside my area of expertise.

I'd be happy to create a quiz for you on any biology topic, such as:
- Cell structure and function
- DNA and genetics
- Protein synthesis
- Photosynthesis
- Ecosystems and ecology
- Human anatomy and physiology

Would you like a quiz on one of these topics instead?`;
        } else {
          // Use standard responses if no explicit topic was found
          responseText = hasContextualReference
            ? nonBiologyContextualResponse
            : noContextResponse;
        }

        console.log(`Using customized non-biology response`);

        // Restore original query before returning
        if (originalQuery) {
          state.query = originalQuery;
        }

        return {
          quizResponse: responseText,
          messages: [],
          conversationContext: preservedContext,
        };
      }

      // Update conversation context based on message history
      // Fix: Pass the correct parameters to updateConversationContext
      const extractedTopic = explicitTopic || state.query;
      updatedContext = await updateConversationContext(
        state.conversationContext,
        state.query,
        extractedTopic,
        '',
        llm
      );

      // Format context for inclusion in the prompt
      const conversationContextText = formatContextForPrompt(updatedContext);

      // Log contextual information for debugging
      if (hasContextualReference) {
        console.log(
          'Resolving contextual reference using conversation context:'
        );
        console.log('Recent topics:', updatedContext.recentTopics);
        console.log('Last topic:', updatedContext.lastTopic);
        console.log(
          'Key entities:',
          Object.keys(updatedContext.keyEntities || {})
        );
      }

      // Extract context from retrieved PDF results
      let context = '';
      if (state.pdfResults && state.pdfResults.length > 0) {
        // Sanitize document metadata to remove local file paths
        const sanitizedDocs = sanitizeDocumentMetadata(state.pdfResults);

        context = sanitizedDocs
          .map((doc) => {
            const source = doc.metadata.source
              ? `[Source: ${doc.metadata.source}]`
              : '';
            return `${doc.pageContent} ${source}`.trim();
          })
          .join('\n\n');
      }
      console.log(`Generating Quiz Agent response for: "${state.query}"`);
      console.log(
        `Using ${
          context
            ? state.pdfResults.length + ' documents as context'
            : 'no external context'
        }`
      );
      console.log(
        `Including conversation context with ${updatedContext.recentTopics.length} topics`
      );

      // Log hasContextualReference status
      console.log(
        `Query has contextual reference: ${
          hasContextualReference ? 'Yes' : 'No'
        }`
      );
      if (hasContextualReference) {
        console.log(
          `Last topic from context: ${updatedContext.lastTopic || 'None'}`
        );
      } // If no context is available but it's a biology topic, we can still try to answer
      // based on the tutor's knowledge, but with a note
      if (!context) {
        console.log(
          'No relevant context found, checking if we can generate a quiz with context from conversation'
        );

        // Use the explicit topic if available (which would be biology-related at this point)
        if (explicitTopic) {
          console.log(
            `Using explicit topic "${explicitTopic}" to generate quiz without PDF context`
          );

          const enhancedPrompt = `
You are a Biology Quiz Agent. Create a quiz about ${explicitTopic}.

Include various types of questions (multiple-choice, short answer, fill-in-the-blank, etc.) 
and reference relevant sections from the A-Level biology textbook where possible.

Format the quiz following the standard format with an answer key.
          `;

          const result = await llm.invoke([new HumanMessage(enhancedPrompt)]);
          const quizResponse = result.content.toString();

          console.log('Generated quiz for explicit topic without PDF context');

          // Restore original query before returning
          if (originalQuery) {
            state.query = originalQuery;
          }

          return {
            quizResponse,
            messages: [],
            conversationContext: updatedContext,
          };
        }

        // If there's no explicit topic but there is context, try to use that
        if (
          hasContextualReference &&
          updatedContext &&
          (updatedContext.recentTopics.length > 0 || updatedContext.lastTopic)
        ) {
          // Use the last topic as the basis for the quiz
          const topic =
            updatedContext.lastTopic || updatedContext.recentTopics[0];
          console.log(
            `Using conversation context to create quiz about: ${topic}`
          );

          const enhancedPrompt = `
You are a Biology Quiz Agent. Create a quiz about ${topic}.

Include various types of questions (multiple-choice, short answer, fill-in-the-blank, etc.) 
and reference relevant sections from the A-Level biology textbook where possible.

Format the quiz following the standard format with an answer key.
          `;

          const result = await llm.invoke([new HumanMessage(enhancedPrompt)]);
          const quizResponse = result.content.toString();

          console.log('Generated contextual quiz without PDF context');

          // Restore original query before returning
          if (originalQuery) {
            state.query = originalQuery;
          }

          return {
            quizResponse,
            messages: [],
            conversationContext: updatedContext,
          };
        }

        // If we can't determine a topic, return the default response
        console.log('Could not determine a topic for quiz generation');

        // Restore original query before returning
        if (originalQuery) {
          state.query = originalQuery;
        }

        return {
          quizResponse: noContextResponse,
          messages: [],
          conversationContext: updatedContext,
        };
      }

      // Format the prompt with context and query
      let promptValue = quizPrompt;

      // Use explicit topic information in the prompt if available
      if (explicitTopic && hasContextualReference) {
        console.log(
          `Using explicit topic "${explicitTopic}" from contextual reference in quiz prompt`
        );
        promptValue = promptValue.replace(
          '{{query}}',
          `Create a quiz about ${explicitTopic}`
        );
      } else {
        console.log(`Using original query in quiz prompt: "${state.query}"`);
        promptValue = promptValue.replace('{{query}}', state.query);
      }

      promptValue = promptValue.replace('{{context}}', context);
      promptValue = promptValue.replace(
        '{{conversationContext}}',
        conversationContextText
      );

      // Generate a quiz using the LLM
      const result = await llm.invoke([new HumanMessage(promptValue)]);
      const quizResponse = result.content.toString();

      console.log('Quiz Agent response generated successfully');

      // Restore original query before returning
      if (originalQuery) {
        state.query = originalQuery;
      }

      // Return updated state components
      return {
        quizResponse,
        messages: [], // This will be added to existing messages in graph/index.js
        conversationContext: updatedContext,
      };
    } catch (error) {
      console.error('Error generating quiz:', error);
      // Make sure we save any context updates even when there's an error

      // Use updated context if available, or fall back to existing context
      const errorContext = state.conversationContext || {
        recentTopics: [],
        keyEntities: {},
        lastTopic: '',
      };
      console.log(
        `Error occurred but preserving context: ${JSON.stringify(errorContext)}`
      );

      const errorMessage =
        'Sorry, I encountered an error while generating a Quiz Agent response. Please try again.';

      // Restore original query before returning
      if (originalQuery) {
        state.query = originalQuery;
      }

      return {
        quizResponse: errorMessage,
        messages: [],
        conversationContext: errorContext,
      };
    } finally {
      // Log the context that will be returned - don't use state.conversationContext
      // since we may have updated it and it's in a different scope
      console.log('Quiz Agent completed execution');

      // Log any explicit topic that was extracted
      if (explicitTopic) {
        console.log(
          `Used explicit topic "${explicitTopic}" from conversation context`
        );
      }

      // Log detailed context info for debugging
      if (state.conversationContext) {
        console.log('Final conversation context state:');
        console.log(
          `- Last topic: ${state.conversationContext.lastTopic || 'none'}`
        );
        console.log(
          `- Recent topics: [${
            state.conversationContext.recentTopics?.join(', ') || 'none'
          }]`
        );
        console.log(
          `- Key entities count: ${
            Object.keys(state.conversationContext.keyEntities || {}).length
          }`
        );

        if (hasContextualReference) {
          console.log('Contextual reference handling complete');
        }
      }

      // Ensure original query is restored
      if (originalQuery && state.query !== originalQuery) {
        console.log(`Restored original query: "${originalQuery}"`);
        state.query = originalQuery;
      }
    }
  };
};

export default quizNode;
