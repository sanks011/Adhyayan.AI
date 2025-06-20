"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import { subscribeToRoom } from '@/lib/room-storage';
import { Room, Participant } from '@/lib/types';
import {
  IconArrowLeft,
  IconUsers,
  IconCopy,
  IconCheck,
  IconClock,
  IconBrain,
  IconPray,
  IconRefresh,
  IconAlertCircle,
  IconPlay
} from "@tabler/icons-react";

export default function QuizRoomPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomCode = params.roomCode as string;
  
  const [room, setRoom] = useState<Room | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);

  const isHost = room && user && room.hostId === user.uid;
  const isParticipant = room && user && room.participants.some(p => p.userId === user.uid);
  const currentParticipant = room && user ? room.participants.find(p => p.userId === user.uid) : null;
  const canStartQuiz = isHost && 
    room && 
    room.participants.length >= 2 && 
    room.participants.every(p => p.isReady || p.userId === room.hostId) &&
    room.status === 'waiting';

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Update local ready state when room data changes
  useEffect(() => {
    if (currentParticipant) {
      setIsReady(currentParticipant.isReady);
    }
  }, [currentParticipant]);

  // Subscribe to real-time room updates
  useEffect(() => {
    if (!roomCode || !isAuthenticated) return;

    console.log('Setting up room subscription for:', roomCode);
    
    const unsubscribe = subscribeToRoom(roomCode, (updatedRoom) => {
      console.log('Room updated:', updatedRoom);
      
      if (updatedRoom) {
        setRoom(updatedRoom);
        
        // If quiz has started, redirect to quiz page
        if (updatedRoom.status === 'active' && isParticipant) {
          router.push(`/quiz-room/${roomCode}/quiz`);
        }
      } else {
        setError('Room not found');
        setTimeout(() => router.push('/create-room'), 2000);
      }
      
      setLoadingRoom(false);
    });

    return () => {
      console.log('Cleaning up room subscription');
      unsubscribe();
    };
  }, [roomCode, isAuthenticated, isParticipant, router]);

  // Handle ready status toggle
  const handleReadyToggle = async () => {
    if (!user || !room) return;

    const newReadyState = !isReady;
    setIsReady(newReadyState); // Optimistic update
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          isReady: newReadyState
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setIsReady(!newReadyState);
        const errorData = await response.json().catch(() => ({ error: 'Failed to update ready status' }));
        setError(errorData.error || 'Failed to update ready status');
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsReady(!newReadyState);
      console.error('Error updating ready status:', error);
      setError('Network error. Please try again.');
    }
  };

  // Handle starting quiz
  const handleStartQuiz = async () => {
    if (!canStartQuiz) return;

    setIsStartingQuiz(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // The real-time listener will handle the navigation
        console.log('Quiz started successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start quiz' }));
        setError(errorData.error || 'Failed to start quiz');
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsStartingQuiz(false);
    }
  };

  // Handle copying room link
  const copyRoomLink = async () => {
    try {
      const roomLink = `${window.location.origin}/join-room?code=${roomCode}`;
      await navigator.clipboard.writeText(roomLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      setError('Failed to copy link to clipboard');
    }
  };

  // Loading states
  if (loading || loadingRoom) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BlackHoleLoader />
      </div>
    );
  }

  // Authentication check
  if (!isAuthenticated || !user) {
    router.push('/');
    return null;
  }

  // Room not found
  if (!room && !loadingRoom) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <IconAlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl mb-4">Room not found</h2>
          <p className="text-neutral-400 mb-6">The room you're looking for doesn't exist or has been deleted.</p>
          <button 
            onClick={() => router.push('/create-room')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        {/* Fixed Header Elements */}
        <div className="fixed top-4 right-4 z-50">
          <GyanPointsDisplay />
        </div>
        
        <div className="fixed top-4 left-4 z-50">
          <button 
            onClick={() => router.push('/create-room')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <IconAlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-2xl p-8 w-full max-w-4xl">
          
          {/* Room Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{room.roomName}</h1>
            <p className="text-neutral-400 mb-4">Room Code: <span className="font-mono text-lg text-white">{room.roomCode}</span></p>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${
                room.status === 'waiting' ? 'bg-yellow-500' : 
                room.status === 'active' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-neutral-400 capitalize">{room.status === 'waiting' ? 'Waiting for players' : room.status.replace('-', ' ')}</span>
            </div>
            
            <button
              onClick={copyRoomLink}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mx-auto transition-all duration-200"
            >
              {copySuccess ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
              {copySuccess ? 'Copied!' : 'Copy Invite Link'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Quiz Settings */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <IconBrain className="h-5 w-5" />
                Quiz Settings
              </h3>
              <div className="space-y-3">
                <div className="bg-white/10 rounded-lg p-3 flex justify-between">
                  <span className="text-neutral-300">Subject:</span>
                  <span className="text-white font-medium">{room.subject}</span>
                </div>
                <div className="bg-white/10 rounded-lg p-3 flex justify-between">
                  <span className="text-neutral-300">Topic:</span>
                  <span className="text-white font-medium">{room.topic}</span>
                </div>
                <div className="bg-white/10 rounded-lg p-3 flex justify-between">
                  <span className="text-neutral-300">Difficulty:</span>
                  <span className="text-white font-medium capitalize">{room.difficulty}</span>
                </div>
                <div className="bg-white/10 rounded-lg p-3 flex justify-between">
                  <span className="text-neutral-300 flex items-center gap-1">
                    <IconClock className="h-4 w-4" />
                    Duration:
                  </span>
                  <span className="text-white font-medium">{room.settings.timePerQuestion}s per question</span>
                </div>
                <div className="bg-white/10 rounded-lg p-3 flex justify-between">
                  <span className="text-neutral-300">Questions:</span>
                  <span className="text-white font-medium">{room.settings.questionCount}</span>
                </div>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 flex justify-between">
                  <span className="text-green-400">Prize Pool:</span>
                  <span className="text-green-400 font-bold">{room.prizePool} Gyan Points</span>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <IconUsers className="h-5 w-5" />
                Participants ({room.participants.length}/{room.maxParticipants})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {room.participants.length === 0 ? (
                  <div className="text-center text-neutral-400 py-8">
                    <IconUsers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No participants yet</p>
                  </div>
                ) : (
                  room.participants.map((participant) => (
                    <div
                      key={participant.userId}
                      className="bg-white/10 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          participant.isReady ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="text-white">
                          {participant.userName}
                          {participant.userId === room.hostId && (
                            <span className="ml-2 text-blue-400 text-sm">(Host)</span>
                          )}
                          {participant.userId === user?.uid && (
                            <span className="ml-2 text-yellow-400 text-sm">(You)</span>
                          )}
                        </span>
                      </div>
                      <span className={`text-sm ${
                        participant.isReady ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {participant.isReady ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 text-center space-y-4">
            {/* Ready Toggle Button (for participants, not host) */}
            {isParticipant && !isHost && room.status === 'waiting' && (
              <button
                onClick={handleReadyToggle}
                className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isReady
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isReady ? 'Not Ready' : 'Ready'}
              </button>
            )}

            {/* Start Quiz Button (Host Only) */}
            {isHost && room.status === 'waiting' && (
              <div className="space-y-2">
                <button
                  onClick={handleStartQuiz}
                  disabled={!canStartQuiz || isStartingQuiz}
                  className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                    !canStartQuiz || isStartingQuiz
                      ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <IconPlay className="h-4 w-4 inline mr-2" />
                  {isStartingQuiz ? 'Starting Quiz...' : 'Start Quiz'}
                </button>
                
                {!canStartQuiz && (
                  <p className="text-neutral-400 text-sm">
                    {room.participants.length < 2 
                      ? 'Need at least 2 participants to start'
                      : 'All participants must be ready to start'
                    }
                  </p>
                )}
              </div>
            )}

            {/* Quiz In Progress Message */}
            {room.status === 'active' && (
              <div className="text-center">
                <div className="text-green-400 mb-2">
                  <IconClock className="h-6 w-6 inline mr-2" />
                  Quiz in Progress
                </div>
                {isParticipant && (
                  <button
                    onClick={() => router.push(`/quiz-room/${roomCode}/quiz`)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Join Quiz
                  </button>
                )}
              </div>
            )}

            {/* Quiz Completed Message */}
            {room.status === 'completed' && (
              <div className="text-center">
                <div className="text-blue-400 mb-2">
                  Quiz Completed
                </div>
                {room.winner && (
                  <p className="text-green-400">
                    Winner: {room.winner}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </WavyBackground>
    </div>
  );
}