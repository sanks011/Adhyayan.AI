import { NextRequest, NextResponse } from 'next/server';
import { generateRoomCode, createRoom } from '@/lib/room-storage';
import { Room, Participant, QuizQuestion } from '@/lib/types';

function generateMockQuestions(count: number, difficulty: string, subject: string, topic: string): QuizQuestion[] {
  const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 25 : 20;
  
  const mockQuestions: QuizQuestion[] = [];
  for (let i = 0; i < count; i++) {
    mockQuestions.push({
      id: `q_${Date.now()}_${i}`,
      question: `${subject} Question ${i + 1}: What is a fundamental concept in ${topic}?`,
      options: [
        `Option A for ${topic}`,
        `Option B for ${topic}`,
        `Option C for ${topic}`,
        `Option D for ${topic}`
      ],
      correctAnswer: Math.floor(Math.random() * 4),
      explanation: `This is the explanation for question ${i + 1} about ${topic} in ${subject}.`,
      timeLimit
    });
  }
  
  return mockQuestions;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      roomName,
      subject,
      topic,
      difficulty,
      questionCount,
      maxParticipants,
      hostId,
      hostName
    } = body;

    // Validate required fields
    if (!roomName || !subject || !topic || !hostId || !hostName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate room code
    const roomCode = generateRoomCode();

    // Generate mock questions (replace with Gemini AI later)
    const questions = generateMockQuestions(questionCount, difficulty, subject, topic);

    // Create host participant
    const hostParticipant: Participant = {
      userId: hostId,
      userName: hostName,
      joinedAt: new Date(),
      score: 0,
      correctAnswers: 0,
      averageResponseTime: 0,
      isReady: true // Host is always ready
    };

    // Create room
    const room: Room = {
      roomCode,
      roomName,
      subject,
      topic,
      difficulty,
      hostId,
      hostName,
      maxParticipants,
      entryFee: 5,
      prizePool: 5, // Host pays entry fee
      status: 'waiting',
      questions,
      participants: [hostParticipant],
      currentQuestionIndex: 0,
      createdAt: new Date(),
      settings: {
        questionCount,
        timePerQuestion: difficulty === 'easy' ? 30 : difficulty === 'medium' ? 25 : 20,
        showExplanations: true
      }
    };

    // Store room in Firebase
    await createRoom(room);

    return NextResponse.json({
      roomCode,
      message: 'Room created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room. Please try again.' },
      { status: 500 }
    );
  }
}