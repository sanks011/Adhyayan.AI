import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoom } from '@/lib/room-storage';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const { roomCode } = params;

    const room = await getRoom(roomCode);
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    if (room.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Room is not in waiting state' },
        { status: 400 }
      );
    }

    if (room.participants.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 participants to start' },
        { status: 400 }
      );
    }

    const allReady = room.participants.every(p => p.isReady || p.userId === room.hostId);
    if (!allReady) {
      return NextResponse.json(
        { error: 'All participants must be ready to start' },
        { status: 400 }
      );
    }

    // Start the quiz
    const updatedRoom = await updateRoom(roomCode, {
      status: 'active',
      questionStartTime: new Date()
    });

    return NextResponse.json({
      message: 'Quiz started successfully',
      room: updatedRoom
    });
    
  } catch (error) {
    console.error('Error starting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to start quiz' },
      { status: 500 }
    );
  }
}