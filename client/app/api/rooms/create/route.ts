import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateQuizQuestions } from '@/lib/gemini';

interface Participant {
  userId: string;
  userName: string;
  joinedAt: Date;
  score: number;
  correctAnswers: number;
  averageResponseTime: number;
  isReady: boolean;
}

interface Room {
  roomCode: string;
  roomName: string;
  subject: string;
  topic: string;
  difficulty: string;
  hostId: string;
  hostName: string;
  maxParticipants: number;
  entryFee: number;
  prizePool: number;
  status: 'waiting' | 'active' | 'completed';
  questions: any[];
  participants: Participant[];
  currentQuestionIndex: number;
  createdAt: any;
  settings: {
    questionCount: number;
    timePerQuestion: number;
    showExplanations: boolean;
  };
  participantAnswers: Record<string, Record<string, any>>;
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE ROOM API CALLED ===');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const {
      roomName,
      subject,
      topic,
      difficulty = 'medium',
      questionCount = 10,
      maxParticipants = 8,
      hostId,
      hostName,
      timePerQuestion = 30
    } = body;

    // Validate required fields
    if (!roomName || !subject || !topic || !hostId || !hostName) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: roomName, subject, topic, hostId, hostName' },
        { status: 400 }
      );
    }

    // Validate question count
    if (questionCount < 5 || questionCount > 20) {
      return NextResponse.json(
        { error: 'Question count must be between 5 and 20' },
        { status: 400 }
      );
    }

    // Generate room code
    const roomCode = generateRoomCode();
    console.log('Generated room code:', roomCode);

    // Generate quiz questions using Gemini AI
    console.log('Generating questions with Gemini AI...');
    let questions;
    try {
      questions = await generateQuizQuestions({
        subject,
        topic,
        difficulty,
        questionCount
      });
      console.log('Generated questions:', questions.length);
      
      // Ensure all questions have explanations
      questions = questions.map((q, index) => ({
        ...q,
        id: q.id || `q_${roomCode}_${index}`,
        explanation: q.explanation || `This is the correct answer for question ${index + 1}.`
      }));
      
    } catch (error) {
      console.error('Error generating questions:', error);
      return NextResponse.json(
        { error: 'Failed to generate quiz questions. Please try again.' },
        { status: 500 }
      );
    }

    // Create host participant
    const hostParticipant: Participant = {
      userId: hostId,
      userName: hostName,
      joinedAt: new Date(),
      score: 0,
      correctAnswers: 0,
      averageResponseTime: 0,
      isReady: true
    };

    // Create room object
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
      createdAt: serverTimestamp(),
      settings: {
        questionCount,
        timePerQuestion: timePerQuestion || (difficulty === 'easy' ? 30 : difficulty === 'medium' ? 25 : 20),
        showExplanations: true
      },
      participantAnswers: {}
    };

    // Store room in Firebase Firestore
    const roomRef = doc(db, 'quiz-rooms', roomCode);
    await setDoc(roomRef, room);
    
    console.log('Room created successfully in Firebase');

    return NextResponse.json({
      success: true,
      roomCode,
      message: 'Room created successfully with AI-generated questions'
    }, { status: 201 });

  } catch (error) {
    console.error('=== API ERROR ===', error);
    return NextResponse.json(
      { error: 'Server error: ' + (error instanceof Error ? error.message : 'Unknown') },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Create room API is working',
    timestamp: new Date().toISOString()
  });
}