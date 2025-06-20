import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;

    // Get room from Firebase
    const roomRef = doc(db, 'quiz-rooms', roomCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const room = roomSnap.data();
    
    // Return room state with current question if quiz is active
    const response: any = {
      room,
      participants: room.participants
    };

    if (room.status === 'active' && room.questions && room.questions.length > 0) {
      const currentQuestion = room.questions[room.currentQuestionIndex];
      if (currentQuestion) {
        // Don't send the correct answer to clients during the quiz
        response.currentQuestion = {
          id: currentQuestion.id,
          question: currentQuestion.question,
          options: currentQuestion.options,
          questionNumber: room.currentQuestionIndex + 1,
          // Only include correct answer and explanation after question is completed
          ...(room.status === 'completed' && {
            correctAnswer: currentQuestion.correctAnswer,
            explanation: currentQuestion.explanation
          })
        };
        
        // Calculate time left based on question start time
        if (room.questionStartTime) {
          const timePerQuestion = room.settings?.timePerQuestion || 30;
          const questionStartTime = new Date(room.questionStartTime.seconds * 1000 || room.questionStartTime);
          const timeElapsed = Math.floor((Date.now() - questionStartTime.getTime()) / 1000);
          response.timeLeft = Math.max(0, timePerQuestion - timeElapsed);
        } else {
          response.timeLeft = room.settings?.timePerQuestion || 30;
        }
      }
    }

    if (room.status === 'completed' && room.results) {
      response.results = room.results;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting room state:', error);
    return NextResponse.json(
      { error: 'Failed to get room state' },
      { status: 500 }
    );
  }
}