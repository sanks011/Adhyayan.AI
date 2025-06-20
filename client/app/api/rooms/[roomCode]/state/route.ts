import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const { roomCode } = params;

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
        // Don't send the correct answer to clients
        response.currentQuestion = {
          id: currentQuestion.id,
          question: currentQuestion.question,
          options: currentQuestion.options,
          questionNumber: room.currentQuestionIndex + 1
        };
        
        // Calculate time left (assuming 30 seconds per question)
        const timePerQuestion = room.settings?.timePerQuestion || 30;
        response.timeLeft = timePerQuestion; // You can implement proper timing logic here
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