"use client";
import React, { useState, useEffect, use } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import { 
  IconUsers, 
  IconCrown, 
  IconClock, 
  IconTrophy, 
  IconMedal,
  IconCopy,
  IconCheck,
  IconX
} from "@tabler/icons-react";

interface QuizRoomProps {
  params: Promise<{ roomCode: string }>;
}

export default function QuizRoom({ params }: QuizRoomProps) {
  const resolvedParams = use(params);
  const { roomCode } = resolvedParams;
  
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [roomState, setRoomState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number>(-1);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [quizPhase, setQuizPhase] = useState<'waiting' | 'quiz' | 'results'>('waiting');
  const [answered, setAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  useEffect(() => {
    if (isAuthenticated && roomCode) {
      fetchRoomState();
      const interval = setInterval(fetchRoomState, 2000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, roomCode]);

  useEffect(() => {
    if (timeLeft > 0 && quizPhase === 'quiz' && !answered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quizPhase === 'quiz' && currentQuestion && !answered) {
      // Auto-submit when time runs out
      submitAnswer(-1); // -1 indicates no answer selected
    }
  }, [timeLeft, quizPhase, answered]);

  const fetchRoomState = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}/state`);
      if (response.ok) {
        const data = await response.json();
        setRoomState(data.room);
        
        if (data.room.status === 'active' && data.currentQuestion) {
          // Check if this is a new question
          if (!currentQuestion || data.currentQuestion.id !== currentQuestion.id) {
            setCurrentQuestion(data.currentQuestion);
            setQuizPhase('quiz');
            setTimeLeft(data.room.settings?.timePerQuestion || 30);
            setAnswered(false);
            setSelectedAnswer(-1);
            setShowExplanation(false);
            setQuestionStartTime(Date.now());
          }
        } else if (data.room.status === 'completed') {
          setResults(data.results);
          setQuizPhase('results');
        }
      }
    } catch (error) {
      console.error('Error fetching room state:', error);
    }
  };

  const startQuiz = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        fetchRoomState();
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  };

  const submitAnswer = async (answerIndex: number = selectedAnswer) => {
    if (!currentQuestion || answered) return;
    
    setAnswered(true);
    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
    
    try {
      const response = await fetch(`/api/rooms/${roomCode}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          questionId: currentQuestion.id,
          answer: answerIndex,
          responseTime: responseTime,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.showExplanation) {
          setShowExplanation(true);
          setTimeout(() => {
            setShowExplanation(false);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/join-room/${roomCode}`;
    navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BlackHoleLoader />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/');
    return null;
  }

  if (!roomState) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BlackHoleLoader />
      </div>
    );
  }

  const isHost = roomState.hostId === user.uid;
  const currentUserParticipant = roomState.participants.find((p: any) => p.userId === user.uid);

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="fixed top-4 right-4 z-50">
          <GyanPointsDisplay />
        </div>

        <div className="max-w-4xl w-full mx-auto">
          {quizPhase === 'waiting' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-6 mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    {roomState.roomName}
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-sm text-neutral-400 mb-6">
                    <div>Subject: <span className="text-white">{roomState.subject}</span></div>
                    <div>Topic: <span className="text-white">{roomState.topic}</span></div>
                    <div>Difficulty: <span className="text-white">{roomState.difficulty}</span></div>
                    <div>Questions: <span className="text-white">{roomState.settings?.questionCount}</span></div>
                    <div>Time Limit: <span className="text-white">{roomState.settings?.timePerQuestion}s per question</span></div>
                    <div>Prize Pool: <span className="text-white">{roomState.prizePool} coins</span></div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-lg font-mono text-white">{roomCode}</div>
                      <div className="text-xs text-neutral-400">Room Code</div>
                    </div>
                    <button
                      onClick={copyRoomLink}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all duration-300"
                    >
                      {copied ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Share'}
                    </button>
                  </div>
                </div>

                {isHost && (
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-6">
                    <p className="text-neutral-400 mb-4">
                      AI questions generated and ready. Waiting for participants...
                    </p>
                    <button
                      onClick={startQuiz}
                      disabled={roomState.participants.length < 2}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-300"
                    >
                      Start Quiz
                    </button>
                    {roomState.participants.length < 2 && (
                      <p className="text-sm text-yellow-400 mt-2">
                        Need at least 2 participants to start
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <IconUsers className="h-5 w-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">
                    Participants ({roomState.participants.length})
                  </h3>
                </div>
                
                <div className="space-y-2">
                  {roomState.participants.map((participant: any) => (
                    <div key={participant.userId} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                      {participant.userId === roomState.hostId && (
                        <IconCrown className="h-4 w-4 text-yellow-400" />
                      )}
                      <span className="text-white text-sm">{participant.userName}</span>
                      {participant.isReady && (
                        <span className="text-green-400 text-xs">Ready</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {quizPhase === 'quiz' && currentQuestion && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8">
                {/* Question Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm text-neutral-400">
                    Question {currentQuestion.questionNumber} of {roomState.settings?.questionCount}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-neutral-400">
                      Score: {currentUserParticipant?.score || 0}
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                      timeLeft <= 10 ? 'bg-red-500/20 text-red-400' : 
                      timeLeft <= 30 ? 'bg-yellow-500/20 text-yellow-400' : 
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      <IconClock className="h-4 w-4" />
                      <span className="font-mono font-bold">{timeLeft}s</span>
                    </div>
                  </div>
                </div>

                {/* Question */}
                <h3 className="text-xl font-semibold text-white mb-6">
                  {currentQuestion.question}
                </h3>

                {/* Options */}
                <div className="space-y-3 mb-6">
                  {currentQuestion.options.map((option: string, index: number) => {
                    let buttonClass = "w-full text-left p-4 rounded-lg border-2 transition-all duration-300 ";
                    
                    if (answered) {
                      // Show results after answering
                      if (index === currentQuestion.correctAnswer) {
                        buttonClass += "border-green-500 bg-green-500/20 text-green-400";
                      } else if (index === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer) {
                        buttonClass += "border-red-500 bg-red-500/20 text-red-400";
                      } else {
                        buttonClass += "border-white/10 bg-white/5 text-neutral-400";
                      }
                    } else {
                      // Before answering
                      if (selectedAnswer === index) {
                        buttonClass += "border-blue-500 bg-blue-500/20 text-white";
                      } else {
                        buttonClass += "border-white/20 bg-white/5 text-neutral-300 hover:border-white/40 hover:bg-white/10";
                      }
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => !answered && setSelectedAnswer(index)}
                        disabled={answered}
                        className={buttonClass}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-bold text-sm">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="flex-1">{option}</span>
                          {answered && index === currentQuestion.correctAnswer && (
                            <IconCheck className="h-5 w-5 text-green-400" />
                          )}
                          {answered && index === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer && (
                            <IconX className="h-5 w-5 text-red-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Submit Button */}
                <button
                  onClick={() => submitAnswer()}
                  disabled={selectedAnswer === -1 || answered}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                    selectedAnswer === -1 || answered
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {answered ? 'Answer Submitted' : selectedAnswer === -1 ? 'Select an Answer' : 'Submit Answer'}
                </button>

                {/* Explanation */}
                {showExplanation && currentQuestion.explanation && (
                  <div className="mt-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-blue-400 font-semibold mb-2">Explanation</h4>
                    <p className="text-blue-100 text-sm">{currentQuestion.explanation}</p>
                  </div>
                )}

                {/* Waiting for others */}
                {answered && !showExplanation && (
                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 text-neutral-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Waiting for other players...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {quizPhase === 'results' && results && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8">
                <h2 className="text-3xl font-bold text-white mb-8 text-center">
                  🏆 Quiz Results
                </h2>

                <div className="space-y-4 mb-8">
                  {results.leaderboard.map((participant: any, index: number) => (
                    <div
                      key={participant.userId}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        index === 0 
                          ? 'bg-yellow-500/20 border-yellow-500/50' 
                          : index === 1
                          ? 'bg-gray-400/20 border-gray-400/50'
                          : index === 2
                          ? 'bg-orange-500/20 border-orange-500/50'
                          : 'bg-white/5 border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-orange-400' :
                            'text-white'
                          }`}>
                            #{index + 1}
                          </div>
                          {index === 0 && <IconTrophy className="h-6 w-6 text-yellow-400" />}
                          {index === 1 && <IconMedal className="h-6 w-6 text-gray-400" />}
                          {index === 2 && <IconMedal className="h-6 w-6 text-orange-400" />}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg">{participant.userName}</div>
                          <div className="text-neutral-400 text-sm">
                            Avg Response: {participant.averageResponseTime.toFixed(1)}s
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-xl">{participant.score} pts</div>
                        <div className="text-neutral-400 text-sm">
                          {participant.correctAnswers}/{roomState.settings?.questionCount} correct
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {results.winner && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 mb-6">
                    <p className="text-green-200 text-center text-lg">
                      🎉 <strong>{results.winner.userName}</strong> wins <strong>{results.totalPrize} Gyan Coins!</strong>
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/create-room')}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300"
                  >
                    Back to Rooms
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </WavyBackground>
    </div>
  );
}