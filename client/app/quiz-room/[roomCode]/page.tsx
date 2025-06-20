"use client";
import React, { useState, useEffect } from 'react';
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
  IconCheck
} from "@tabler/icons-react";

export default function QuizRoom({ params }: { params: { roomCode: string } }) {
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

  useEffect(() => {
    if (isAuthenticated && params.roomCode) {
      fetchRoomState();
      const interval = setInterval(fetchRoomState, 2000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, params.roomCode]);

  useEffect(() => {
    if (timeLeft > 0 && quizPhase === 'quiz' && !answered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quizPhase === 'quiz' && currentQuestion && !answered) {
      submitAnswer();
    }
  }, [timeLeft, quizPhase, answered]);

  const fetchRoomState = async () => {
    try {
      const response = await fetch(`/api/rooms/${params.roomCode}/state`);
      if (response.ok) {
        const data = await response.json();
        setRoomState(data.room);
        
        if (data.room.status === 'active' && data.currentQuestion) {
          setCurrentQuestion(data.currentQuestion);
          setQuizPhase('quiz');
          if (data.timeLeft) setTimeLeft(data.timeLeft);
          
          // Reset answered state for new question
          if (data.currentQuestion.id !== currentQuestion?.id) {
            setAnswered(false);
            setSelectedAnswer(-1);
            setShowExplanation(false);
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
      const response = await fetch(`/api/rooms/${params.roomCode}/start`, {
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

  const submitAnswer = async () => {
    if (!currentQuestion || answered) return;
    
    setAnswered(true);
    
    try {
      const response = await fetch(`/api/rooms/${params.roomCode}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          questionId: currentQuestion.id,
          answer: selectedAnswer,
          timeSpent: (roomState.settings?.timePerQuestion || 30) - timeLeft,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.showExplanation) {
          setShowExplanation(true);
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/join-room/${params.roomCode}`;
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
                    <div>Subject: {roomState.subject}</div>
                    <div>Topic: {roomState.topic}</div>
                    <div>Difficulty: {roomState.difficulty}</div>
                    <div>Questions: {roomState.settings?.questionCount}</div>
                    <div>Time Limit: {roomState.settings?.timePerQuestion}s per question</div>
                    <div>Prize Pool: {roomState.prizePool} coins</div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-lg font-mono text-white">{params.roomCode}</div>
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
                      className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
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
                  {roomState.participants.map((participant: any, index: number) => (
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
                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm text-neutral-400">
                    Question {currentQuestion.questionNumber} of {roomState.settings?.questionCount}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-neutral-400">
                      Score: {currentUserParticipant?.score || 0}
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <IconClock className="h-4 w-4" />
                      <span className="font-mono">{timeLeft}s</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-white mb-6">
                  {currentQuestion.question}
                </h3>

                <div className="space-y-3 mb-6">
                  {currentQuestion.options.map((option: string, index: number) => {
                    let buttonClass = "w-full text-left p-4 rounded-lg border transition-all duration-300 ";
                    
                    if (selectedAnswer === index) {
                      buttonClass += "bg-white/20 border-white/40 text-white";
                    } else {
                      buttonClass += "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10";
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => !answered && setSelectedAnswer(index)}
                        disabled={answered}
                        className={buttonClass}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={submitAnswer}
                  disabled={selectedAnswer === -1 || answered}
                  className="w-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-300"
                >
                  {answered ? 'Answer Submitted' : 'Submit Answer'}
                </button>
              </div>
            </div>
          )}

          {quizPhase === 'results' && results && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                  Quiz Results
                </h2>

                <div className="space-y-4 mb-6">
                  {results.leaderboard.map((participant: any, index: number) => (
                    <div
                      key={participant.userId}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        index === 0 
                          ? 'bg-yellow-500/20 border border-yellow-500/30' 
                          : index === 1
                          ? 'bg-gray-400/20 border border-gray-400/30'
                          : index === 2
                          ? 'bg-orange-500/20 border border-orange-500/30'
                          : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="text-white font-bold text-lg">#{index + 1}</div>
                          {index === 0 && <IconTrophy className="h-5 w-5 text-yellow-400" />}
                          {index === 1 && <IconMedal className="h-5 w-5 text-gray-400" />}
                          {index === 2 && <IconMedal className="h-5 w-5 text-orange-400" />}
                        </div>
                        <div className="text-white">{participant.userName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{participant.score} points</div>
                        <div className="text-sm text-neutral-400">
                          {participant.correctAnswers}/{roomState.settings?.questionCount} correct
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {results.winner && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
                    <p className="text-green-200 text-center">
                      {results.winner.userName} wins {results.totalPrize} Gyan Coins!
                    </p>
                  </div>
                )}

                <button
                  onClick={() => router.push('/create-room')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300"
                >
                  Back to Rooms
                </button>
              </div>
            </div>
          )}
        </div>
      </WavyBackground>
    </div>
  );
}