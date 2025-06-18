import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Use environment variable for API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  let subject: string | undefined;
  let difficulty: string | undefined;
  let duration: string | undefined;
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('Gemini API key not configured');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    ({ subject, difficulty, duration } = await request.json());

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    console.log(`Generating quiz for: ${subject}, difficulty: ${difficulty}, duration: ${duration}`);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Enhanced prompt with more specific instructions
    const prompt = `Generate exactly 10 multiple choice quiz questions about "${subject}" with "${difficulty}" difficulty level. 

    Requirements:
    - Each question should have exactly 4 options (A, B, C, D)
    - correctAnswer should be the index (0-3) of the correct option
    - Questions should be specific to the topic: "${subject}"
    - Keep explanations concise but informative (under 150 characters)
    - Make questions appropriate for ${difficulty} level
    - Include a variety of question types (definitions, applications, comparisons, problem-solving)
    - Ensure questions test real understanding, not just memorization
    - Make incorrect options plausible but clearly wrong
    
    Format the response as a valid JSON array with this exact structure:
    [
      {
        "question": "Clear and specific question about ${subject}?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Brief explanation of why this answer is correct and others are wrong"
      }
    ]
    
    IMPORTANT: Return ONLY the JSON array, no additional text, markdown, or formatting.
    
    Example for reference:
    [
      {
        "question": "What is the primary purpose of ${subject}?",
        "options": ["Purpose A", "Purpose B", "Purpose C", "Purpose D"],
        "correctAnswer": 1,
        "explanation": "Purpose B is correct because it directly addresses the main goal of ${subject}."
      }
    ]`;

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

      console.log('Cleaned JSON text length:', jsonText.length);

      const questions = JSON.parse(jsonText);

      // Validate the structure
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }

      if (questions.length === 0) {
        throw new Error('No questions generated');
      }

      // Validate each question and fix any issues
      const validatedQuestions = questions.slice(0, 10).map((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3 ||
            !q.explanation) {
          console.warn(`Question ${index} has invalid structure, using fallback`);
          return generateTopicSpecificFallback(subject || 'General', index);
        }
        return q;
      });

      // Ensure we have at least 10 questions
      while (validatedQuestions.length < 10) {
        const index = validatedQuestions.length;
        validatedQuestions.push(generateTopicSpecificFallback(subject, index));
      }

      console.log(`Successfully generated ${validatedQuestions.length} questions`);

      return NextResponse.json({
        success: true,
        questions: validatedQuestions,
        subject,
        difficulty,
        duration
      });

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw response that failed to parse:', text.substring(0, 500));
      
      // Return fallback questions if parsing fails
      const fallbackQuestions = generateFallbackQuestions(subject || 'General', difficulty || 'medium');
      return NextResponse.json({
        success: true,
        questions: fallbackQuestions,
        subject,
        difficulty,
        duration,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Error generating quiz:', error);
    
    // Return fallback questions on any error
    const fallbackQuestions = generateFallbackQuestions(subject || 'General', difficulty || 'medium');
    return NextResponse.json({
      success: true,
      questions: fallbackQuestions,
      subject: subject || 'General',
      difficulty: difficulty || 'medium',
      duration: duration || '15',
      fallback: true
    });
  }
}

function generateTopicSpecificFallback(subject: string, index: number) {
  return {
    question: `What is an important concept in ${subject}? (Question ${index + 1})`,
    options: [
      `Key principle of ${subject}`,
      `Basic theory in ${subject}`,
      `Advanced technique in ${subject}`,
      `Fundamental rule of ${subject}`
    ],
    correctAnswer: 0,
    explanation: `The key principle is fundamental to understanding ${subject}.`
  };
}

function generateFallbackQuestions(subject: string, difficulty: string) {
  const questions = [];
  
  // Extract main subject and topic if formatted as "Subject - Topic"
  const [mainSubject, specificTopic] = subject.includes(' - ') 
    ? subject.split(' - ') 
    : [subject, subject];

  const questionTemplates = [
    {
      question: `What is the fundamental principle of ${specificTopic}?`,
      options: [
        `Basic principle of ${specificTopic}`,
        `Advanced theory in ${specificTopic}`,
        `Complex formula in ${specificTopic}`,
        `Simple rule in ${specificTopic}`
      ],
      correctAnswer: 0,
      explanation: `The basic principle forms the foundation of ${specificTopic}.`
    },
    {
      question: `Which approach is most effective in ${specificTopic}?`,
      options: [
        "Theoretical approach",
        "Practical application",
        "Research methodology",
        "All of the above"
      ],
      correctAnswer: 3,
      explanation: `${specificTopic} benefits from multiple approaches for comprehensive understanding.`
    },
    {
      question: `What is a key characteristic of ${specificTopic}?`,
      options: [
        `Simplicity in ${specificTopic}`,
        `Complexity in ${specificTopic}`,
        `Structured approach in ${specificTopic}`,
        `All of the above`
      ],
      correctAnswer: 2,
      explanation: `A structured approach is essential for mastering ${specificTopic}.`
    },
    {
      question: `How do you best learn ${specificTopic}?`,
      options: [
        "Passive reading only",
        "Active practice and study",
        "Watching videos only",
        "Memorizing facts only"
      ],
      correctAnswer: 1,
      explanation: `Active practice and study lead to better understanding of ${specificTopic}.`
    },
    {
      question: `What makes ${specificTopic} important in ${mainSubject}?`,
      options: [
        `It's fundamental to ${mainSubject}`,
        `It's optional in ${mainSubject}`,
        `It's rarely used in ${mainSubject}`,
        `It's outdated in ${mainSubject}`
      ],
      correctAnswer: 0,
      explanation: `${specificTopic} is fundamental to understanding ${mainSubject}.`
    }
  ];

  // Generate 10 questions by using templates and variations
  for (let i = 0; i < 10; i++) {
    const templateIndex = i % questionTemplates.length;
    const template = questionTemplates[templateIndex];
    
    questions.push({
      ...template,
      question: `${template.question} (${difficulty} level)`
    });
  }

  return questions;
}