import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectToDatabase } from '@/lib/mongodb';
import crypto from 'crypto';

// Use environment variable for API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  let subject: string | undefined;
  let difficulty: string | undefined;
  let duration: string | undefined;
  let questionCount: number = 10;
  let userId: string | undefined;
  
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('Gemini API key not configured');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    ({ subject, difficulty, duration, questionCount = 10, userId } = body);

    if (!subject || !difficulty || !duration) {
      return NextResponse.json(
        { error: 'Subject, difficulty, and duration are required' },
        { status: 400 }
      );
    }

    // Validate questionCount
    const validQuestionCounts = [5, 10, 15, 20, 25];
    if (!validQuestionCounts.includes(questionCount)) {
      return NextResponse.json(
        { error: 'Invalid question count. Must be 5, 10, 15, 20, or 25' },
        { status: 400 }
      );
    }

    console.log(`Generating quiz for: ${subject}, difficulty: ${difficulty}, duration: ${duration}, questions: ${questionCount}`);

    // Get previously generated questions to avoid duplicates
    const previousQuestions = await getPreviousQuestions(subject, difficulty, userId);
    const questionHashes: string[] = previousQuestions.map((q: any) => q.questionHash);

    // Generate unique session ID for this quiz
    const sessionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const randomSeed = Math.floor(Math.random() * 1000000);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Enhanced prompt with strict anti-duplication measures
    const prompt = `CRITICAL INSTRUCTIONS - ABSOLUTELY NO DUPLICATES ALLOWED:
You are generating quiz questions for a learning platform. NEVER generate questions that are similar or identical to previous questions.

SESSION DETAILS:
- Session ID: ${sessionId}
- Timestamp: ${timestamp}
- Random Seed: ${randomSeed}
- Subject: "${subject}"
- Difficulty: "${difficulty}"
- Required Questions: ${questionCount}

STRICT ANTI-DUPLICATION RULES:
1. Each question MUST be completely unique and original
2. NEVER repeat question patterns or structures
3. NEVER use similar wording or phrasing
4. Each question must explore DIFFERENT aspects of the topic
5. Use varied question types: definitions, applications, analysis, synthesis, evaluation, comparison
6. Cover DIFFERENT subtopics within the subject area
7. Use DIFFERENT cognitive levels (remembering, understanding, applying, analyzing, evaluating, creating)
8. FORBIDDEN: Any question that resembles "What is..." if you've already used that pattern
9. FORBIDDEN: Repetitive option structures or similar answer choices
10. Each question must have a UNIQUE perspective or angle

QUESTION GENERATION STRATEGY:
- Question 1: Focus on fundamental concepts
- Question 2: Application-based scenarios  
- Question 3: Analytical/comparison questions
- Question 4: Problem-solving scenarios
- Question 5: Evaluation/judgment questions
- Question 6: Synthesis/creation scenarios
- Question 7: Historical/contextual questions
- Question 8: Practical implementation
- Question 9: Advanced concepts/theories
- Question 10: Future implications/trends
- Continue alternating between different cognitive levels and subtopics

CONTENT REQUIREMENTS:
- Subject: "${subject}"
- Difficulty: "${difficulty}" level
- Generate exactly ${questionCount} questions
- Each question must have exactly 4 options (A, B, C, D)
- correctAnswer must be index (0-3) of correct option
- Explanations under 150 characters
- Options must be plausible but clearly distinguishable
- Test real understanding, not memorization

UNIQUENESS VERIFICATION:
Before generating each question, ensure it:
- Uses different question stems/beginnings
- Explores different aspects of the topic
- Has different cognitive requirements
- Uses varied vocabulary and phrasing
- Covers different subtopics or applications

EXAMPLE QUESTION VARIETY (DO NOT COPY - JUST FOR REFERENCE):
- "How would you apply [concept] in [scenario]?"
- "Which factor most significantly influences [process]?"
- "Compare the effectiveness of [method A] versus [method B]"
- "What would be the consequence if [condition] occurred?"
- "Analyze the relationship between [element 1] and [element 2]"
- "Evaluate the best approach for [situation]"
- "Design a solution for [problem]"

FORMAT REQUIREMENTS:
Return ONLY a valid JSON array with exactly ${questionCount} unique questions:
[
  {
    "question": "Unique question about ${subject}?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation",
    "questionHash": "unique-identifier-${sessionId}-1"
  }
]

FINAL VERIFICATION:
Before submitting, verify that:
1. All ${questionCount} questions are completely different
2. No two questions test the same specific knowledge point
3. Question structures are varied
4. Vocabulary and phrasing are diverse
5. Each question approaches the subject from a different angle

GENERATE EXACTLY ${questionCount} COMPLETELY UNIQUE QUESTIONS NOW:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Raw AI response length:', text.length);

    try {
      // Clean the response text to extract JSON
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonText = match[1];
        }
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonText = match[1];
        }
      }

      const questions = JSON.parse(jsonText);

      // Validate and enhance questions with unique identifiers
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }

      // Add unique hashes and validate uniqueness
      const validatedQuestions = questions.slice(0, questionCount).map((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3 ||
            !q.explanation) {
          console.warn(`Question ${index} has invalid structure, using fallback`);
          return generateUniqueTopicSpecificFallback(subject || 'General', index, sessionId, previousQuestions);
        }
        
        // Generate unique hash for this question
        const questionHash = crypto.createHash('md5')
          .update(`${q.question}-${q.options.join('-')}-${sessionId}-${index}`)
          .digest('hex');
        
        return {
          ...q,
          questionHash,
          sessionId,
          generatedAt: new Date(),
          subject,
          difficulty
        };
      });

      // Check for duplicates against previous questions
      const filteredQuestions = validatedQuestions.filter(q => 
        !questionHashes.includes(q.questionHash) && 
        !isDuplicateQuestion(q, previousQuestions)
      );

      // If we filtered out duplicates, generate more unique questions
      while (filteredQuestions.length < questionCount) {
        const index = filteredQuestions.length;
        const newQuestion = generateUniqueTopicSpecificFallback(
          subject, 
          index, 
          sessionId, 
          [...previousQuestions, ...filteredQuestions]
        );
        
        if (!isDuplicateQuestion(newQuestion, [...previousQuestions, ...filteredQuestions])) {
          filteredQuestions.push(newQuestion);
        }
      }

      // Store generated questions to prevent future duplicates
      await storeGeneratedQuestions(filteredQuestions, userId);

      console.log(`Successfully generated ${filteredQuestions.length} unique questions`);

      return NextResponse.json({
        success: true,
        questions: filteredQuestions.slice(0, questionCount),
        subject,
        difficulty,
        duration,
        questionCount: Math.min(filteredQuestions.length, questionCount),
        sessionId
      });

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      // Generate unique fallback questions
      const fallbackQuestions = generateUniqueFallbackQuestions(
        subject || 'General', 
        difficulty || 'medium', 
        questionCount, 
        sessionId,
        previousQuestions
      );
      
      await storeGeneratedQuestions(fallbackQuestions, userId);
      
      return NextResponse.json({
        success: true,
        questions: fallbackQuestions,
        subject: subject || 'General',
        difficulty: difficulty || 'medium',
        duration: duration || '15',
        questionCount: fallbackQuestions.length,
        fallback: true,
        sessionId
      });
    }

  } catch (error) {
    console.error('Error generating quiz:', error);
    
    const sessionId = crypto.randomUUID();
    const fallbackQuestions = generateUniqueFallbackQuestions(
      subject || 'General', 
      difficulty || 'medium', 
      questionCount, 
      sessionId,
      []
    );
    
    return NextResponse.json({
      success: true,
      questions: fallbackQuestions,
      subject: subject || 'General',
      difficulty: difficulty || 'medium',
      duration: duration || '15',
      questionCount: fallbackQuestions.length,
      fallback: true,
      sessionId
    });
  }
}

// Helper function to get previously generated questions
async function getPreviousQuestions(subject: string, difficulty: string, userId?: string) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('generatedQuestions');
    
    const query: any = { subject, difficulty };
    if (userId) {
      query.userId = userId;
    }
    
    const questions = await collection
      .find(query)
      .sort({ generatedAt: -1 })
      .limit(100) // Get last 100 questions to avoid duplicates
      .toArray();
    
    return questions;
  } catch (error) {
    console.error('Error fetching previous questions:', error);
    return [];
  }
}

// Helper function to store generated questions
async function storeGeneratedQuestions(questions: any[], userId?: string) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('generatedQuestions');
    
    const questionsToStore = questions.map(q => ({
      ...q,
      userId: userId || 'anonymous',
      storedAt: new Date()
    }));
    
    await collection.insertMany(questionsToStore);
    console.log(`Stored ${questionsToStore.length} questions to prevent duplicates`);
  } catch (error) {
    console.error('Error storing questions:', error);
  }
}

// Helper function to check if a question is duplicate
function isDuplicateQuestion(newQuestion: any, existingQuestions: any[]) {
  return existingQuestions.some(existing => {
    // Check for similar question text (using Levenshtein distance or simple similarity)
    const similarity = calculateSimilarity(newQuestion.question, existing.question);
    return similarity > 0.8; // 80% similarity threshold
  });
}

// Simple similarity calculation
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = Math.max(words1.length, words2.length);
  
  return commonWords.length / totalWords;
}

function generateUniqueTopicSpecificFallback(subject: string, index: number, sessionId: string, previousQuestions: any[]) {
  const uniqueQuestionTemplates = [
    {
      question: `How would you implement ${subject} in a real-world scenario?`,
      options: [
        `Through systematic planning and execution`,
        `By ignoring best practices`,
        `Using outdated methods only`,
        `Without any structured approach`
      ],
      correctAnswer: 0,
      explanation: `Systematic planning and execution are key to implementing ${subject} effectively.`
    },
    {
      question: `What distinguishes advanced ${subject} from basic concepts?`,
      options: [
        `Greater complexity and depth of understanding`,
        `Simpler terminology and concepts`,
        `Less practical application`,
        `Reduced theoretical foundation`
      ],
      correctAnswer: 0,
      explanation: `Advanced ${subject} requires greater complexity and depth of understanding.`
    },
    {
      question: `Which skill combination is most valuable for mastering ${subject}?`,
      options: [
        `Analytical thinking and practical application`,
        `Memorization and repetition only`,
        `Theoretical knowledge without practice`,
        `Avoiding challenging concepts`
      ],
      correctAnswer: 0,
      explanation: `Combining analytical thinking with practical application leads to mastery of ${subject}.`
    },
    {
      question: `How does ${subject} evolve with technological advancement?`,
      options: [
        `It adapts and incorporates new methods`,
        `It remains completely unchanged`,
        `It becomes obsolete immediately`,
        `It rejects all innovations`
      ],
      correctAnswer: 0,
      explanation: `${subject} evolves by adapting and incorporating new technological methods.`
    },
    {
      question: `What role does critical thinking play in ${subject}?`,
      options: [
        `Essential for problem-solving and analysis`,
        `Completely unnecessary`,
        `Only needed for basic concepts`,
        `Harmful to understanding`
      ],
      correctAnswer: 0,
      explanation: `Critical thinking is essential for effective problem-solving and analysis in ${subject}.`
    }
  ];

  // Generate unique question based on index and session
  const templateIndex = (index + sessionId.length) % uniqueQuestionTemplates.length;
  const template = uniqueQuestionTemplates[templateIndex];
  
  const questionHash = crypto.createHash('md5')
    .update(`${template.question}-${sessionId}-${index}-fallback`)
    .digest('hex');
  
  return {
    ...template,
    question: `${template.question} (Unique ID: ${index + 1})`,
    questionHash,
    sessionId,
    generatedAt: new Date(),
    subject,
    isFallback: true
  };
}

function generateUniqueFallbackQuestions(subject: string, difficulty: string, questionCount: number, sessionId: string, previousQuestions: any[]) {
  const questions = [];
  
  const uniqueTemplates = [
    `Analyze the impact of ${subject} on modern practices`,
    `Evaluate the effectiveness of different ${subject} approaches`,
    `Compare traditional vs. contemporary ${subject} methods`,
    `Assess the challenges in implementing ${subject}`,
    `Examine the relationship between ${subject} and innovation`,
    `Investigate the role of ${subject} in problem-solving`,
    `Study the evolution of ${subject} over time`,
    `Explore applications of ${subject} in various fields`,
    `Determine optimal strategies for ${subject} implementation`,
    `Review the significance of ${subject} in current contexts`,
    `Analyze emerging trends in ${subject}`,
    `Evaluate best practices for ${subject}`,
    `Compare different schools of thought in ${subject}`,
    `Assess the future implications of ${subject}`,
    `Examine interdisciplinary connections with ${subject}`
  ];

  for (let i = 0; i < questionCount; i++) {
    const templateIndex = i % uniqueTemplates.length;
    const baseQuestion = uniqueTemplates[templateIndex];
    
    const questionHash = crypto.createHash('md5')
      .update(`${baseQuestion}-${sessionId}-${i}-${Date.now()}`)
      .digest('hex');
    
    questions.push({
      question: `${baseQuestion}? (${difficulty} level)`,
      options: [
        `Comprehensive understanding is required`,
        `Surface-level knowledge is sufficient`,
        `No prior knowledge needed`,
        `Impossible to understand`
      ],
      correctAnswer: 0,
      explanation: `${subject} requires comprehensive understanding for effective application.`,
      questionHash,
      sessionId,
      generatedAt: new Date(),
      subject,
      difficulty,
      isFallback: true
    });
  }

  return questions;
}