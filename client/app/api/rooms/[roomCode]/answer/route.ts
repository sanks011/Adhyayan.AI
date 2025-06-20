import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const { userId, questionId, answer, responseTime } = await request.json();

    if (!userId || !questionId || typeof answer !== 'number' || typeof responseTime !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure data consistency
    const result = await runTransaction(db, async (transaction) => {
      const roomRef = doc(db, 'quiz-rooms', roomCode);
      const roomSnap = await transaction.get(roomRef);

      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const room = roomSnap.data();

      if (room.status !== 'active') {
        throw new Error('Quiz is not active');
      }

      // Find the current question
      const currentQuestion = room.questions[room.currentQuestionIndex];
      if (!currentQuestion || currentQuestion.id !== questionId) {
        throw new Error('Invalid question');
      }

      // Check if user already answered this question
      const participantAnswers = room.participantAnswers || {};
      const questionAnswers = participantAnswers[questionId] || {};
      
      if (questionAnswers[userId]) {
        throw new Error('Already answered this question');
      }

      // Calculate score
      const isCorrect = answer === currentQuestion.correctAnswer;
      const baseScore = isCorrect ? 100 : 0;
      const timeBonus = isCorrect ? Math.max(0, (room.settings.timePerQuestion - responseTime) * 2) : 0;
      const totalScore = baseScore + timeBonus;

      // Update participant's score and stats
      const updatedParticipants = room.participants.map((p: any) => {
        if (p.userId === userId) {
          const newCorrectAnswers = (p.correctAnswers || 0) + (isCorrect ? 1 : 0);
          const totalAnswers = (room.currentQuestionIndex + 1);
          const newAverageResponseTime = p.averageResponseTime 
            ? ((p.averageResponseTime * (totalAnswers - 1)) + responseTime) / totalAnswers
            : responseTime;

          return {
            ...p,
            score: (p.score || 0) + totalScore,
            correctAnswers: newCorrectAnswers,
            averageResponseTime: newAverageResponseTime
          };
        }
        return p;
      });

      // Record this answer
      const updatedParticipantAnswers = {
        ...participantAnswers,
        [questionId]: {
          ...questionAnswers,
          [userId]: {
            answer,
            responseTime,
            isCorrect,
            score: totalScore,
            timestamp: new Date()
          }
        }
      };

      // Check if all participants have answered
      const totalParticipants = room.participants.length;
      const answeredCount = Object.keys(updatedParticipantAnswers[questionId] || {}).length;
      const allAnswered = answeredCount === totalParticipants;

      let updateData: any = {
        participants: updatedParticipants,
        participantAnswers: updatedParticipantAnswers
      };

      // Move to next question or finish quiz
      if (allAnswered) {
        if (room.currentQuestionIndex >= room.questions.length - 1) {
          // Quiz finished - calculate final results
          const sortedParticipants = updatedParticipants.sort((a: any, b: any) => {
            // First sort by score (descending)
            if (b.score !== a.score) {
              return b.score - a.score;
            }
            // If scores are equal, sort by average response time (ascending - faster is better)
            return a.averageResponseTime - b.averageResponseTime;
          });

          updateData.status = 'completed';
          updateData.results = {
            leaderboard: sortedParticipants,
            winner: sortedParticipants[0],
            totalPrize: room.prizePool,
            completedAt: new Date()
          };
        } else {
          // Move to next question
          updateData.currentQuestionIndex = room.currentQuestionIndex + 1;
          updateData.questionStartTime = new Date();
        }
      }

      transaction.update(roomRef, updateData);

      return {
        success: true,
        isCorrect,
        score: totalScore,
        explanation: currentQuestion.explanation,
        showExplanation: allAnswered,
        allAnswered,
        nextQuestion: allAnswered && room.currentQuestionIndex < room.questions.length - 1
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit answer' },
      { status: 500 }
    );
  }
}