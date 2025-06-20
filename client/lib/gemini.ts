import { GoogleGenerativeAI } from '@google/generative-ai';
import { QuizQuestion } from '../lib/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface QuestionGenerationParams {
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
}

export async function generateQuizQuestions(params: QuestionGenerationParams): Promise<QuizQuestion[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Generate exactly ${params.questionCount} competitive quiz questions about "${params.topic}" in the subject of "${params.subject}" with ${params.difficulty} difficulty level.

Requirements:
- Each question should be challenging and suitable for competitive quiz
- Provide exactly 4 multiple choice options for each question
- Include a detailed explanation for the correct answer
- Questions should test deep understanding, not just memorization
- Vary question types (factual, analytical, application-based)

Format your response as a valid JSON array with this exact structure:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation of why this answer is correct"
  }
]

Subject: ${params.subject}
Topic: ${params.topic}
Difficulty: ${params.difficulty}
Number of questions: ${params.questionCount}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const questionsData = JSON.parse(jsonMatch[0]);
    
    // Validate and transform the data
    const questions: QuizQuestion[] = questionsData.map((q: any, index: number) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
          typeof q.correctAnswer !== 'number' || !q.explanation) {
        throw new Error(`Invalid question format at index ${index}`);
      }

      return {
        id: `q_${Date.now()}_${index}`,
        question: q.question.trim(),
        options: q.options.map((opt: string) => opt.trim()),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation.trim(),
        timeLimit: getTimeLimit(params.difficulty)
      };
    });

    if (questions.length !== params.questionCount) {
      throw new Error(`Expected ${params.questionCount} questions, got ${questions.length}`);
    }

    return questions;
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw new Error('Failed to generate quiz questions. Please try again.');
  }
}

function getTimeLimit(difficulty: string): number {
  switch (difficulty) {
    case 'easy': return 30;
    case 'medium': return 25;
    case 'hard': return 20;
    default: return 30;
  }
}

export async function validateAnswer(question: QuizQuestion, selectedAnswer: number): Promise<{
  isCorrect: boolean;
  explanation: string;
  score: number;
}> {
  const isCorrect = selectedAnswer === question.correctAnswer;
  
  return {
    isCorrect,
    explanation: question.explanation,
    score: isCorrect ? 100 : 0
  };
}