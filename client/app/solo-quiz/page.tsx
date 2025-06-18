"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import {
  IconArrowLeft,
  IconClock,
  IconTrophy,
  IconBrain,
  IconCheck,
  IconX,
  IconRefresh,
  IconPray,
  IconBook,
  IconTarget,
  IconFlame,
  IconStar,
  IconBolt,
  IconAward,
  IconChevronRight,
  IconTie,
  IconMedal,
  IconSparkles,
  IconBulb
} from "@tabler/icons-react";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizData {
  questions: Question[];
  subject: string;
  difficulty: string;
  duration: string;
}

// Subject and topic options with enhanced icons
const SUBJECTS = {
  "Science": {
    icon: "🧪",
    color: "from-blue-500 to-cyan-500",
    categories: {
      "Physics": ["Mechanics", "Thermodynamics", "Electricity", "Optics", "Modern Physics"],
      "Chemistry": ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Analytical Chemistry"],
      "Biology": ["Cell Biology", "Genetics", "Ecology", "Human Anatomy", "Evolution"],
      "Mathematics": ["Algebra", "Calculus", "Geometry", "Statistics", "Trigonometry"]
    }
  },
  "Technology": {
    icon: "💻",
    color: "from-purple-500 to-pink-500",
    categories: {
      "Programming": ["JavaScript", "Python", "Java", "C++", "React", "Node.js"],
      "Web Development": ["HTML/CSS", "Frontend", "Backend", "Full Stack", "UI/UX"],
      "Data Science": ["Machine Learning", "Data Analysis", "Statistics", "Python", "R"],
      "Cybersecurity": ["Network Security", "Ethical Hacking", "Cryptography", "Security Auditing"]
    }
  },
  "Humanities": {
    icon: "📚",
    color: "from-orange-500 to-red-500",
    categories: {
      "History": ["Ancient History", "Modern History", "World Wars", "Indian History"],
      "Literature": ["English Literature", "Poetry", "Drama", "Fiction", "Literary Analysis"],
      "Philosophy": ["Ethics", "Logic", "Metaphysics", "Political Philosophy"],
      "Geography": ["Physical Geography", "Human Geography", "Climate", "World Geography"]
    }
  },
  "Business": {
    icon: "💼",
    color: "from-green-500 to-emerald-500",
    categories: {
      "Management": ["Strategic Management", "HR Management", "Operations", "Leadership"],
      "Marketing": ["Digital Marketing", "Brand Management", "Consumer Behavior", "Sales"],
      "Finance": ["Investment", "Banking", "Accounting", "Economics"],
      "Entrepreneurship": ["Startup", "Business Planning", "Innovation", "Venture Capital"]
    }
  }
};

const DIFFICULTY_CONFIG = {
  easy: { color: "from-green-400 to-emerald-500", icon: "🌱", description: "Perfect for beginners" },
  medium: { color: "from-yellow-400 to-orange-500", icon: "🔥", description: "Challenge yourself" },
  hard: { color: "from-red-400 to-pink-500", icon: "⚡", description: "For the brave" }
};

function QuizGameContent() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Quiz selection state
  const [showSelection, setShowSelection] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("medium");
  const [selectedDuration, setSelectedDuration] = useState<string>("15");
  
  // Quiz game state
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [gyanDeducted, setGyanDeducted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [answerStreak, setAnswerStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation states
  const [questionAnimation, setQuestionAnimation] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // Check if there are URL parameters for direct quiz start
  useEffect(() => {
    const subject = searchParams.get('subject');
    const difficulty = searchParams.get('difficulty');
    const duration = searchParams.get('duration');
    
    if (subject && difficulty && duration) {
      setSelectedSubject(subject);
      setSelectedDifficulty(difficulty);
      setSelectedDuration(duration);
      setShowSelection(false);
      if (isAuthenticated && user) {
        startQuiz(subject, difficulty, duration);
      }
    }
  }, [searchParams, isAuthenticated, user]);

  // Timer with warning states
  useEffect(() => {
    if (timeLeft > 0 && !quizCompleted && !isLoading) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quizData && !quizCompleted) {
      completeQuiz();
    }
  }, [timeLeft, quizCompleted, quizData, isLoading]);

  const startQuiz = async (subject: string, difficulty: string, duration: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Generating quiz with params:', { subject, difficulty, duration });
      
      // Deduct Gyan Points first
      await deductGyanPoints();
      
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, difficulty, duration }),
      });

      console.log('Quiz API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Quiz API error:', errorData);
        throw new Error(errorData.error || 'Failed to generate quiz');
      }

      const data = await response.json();
      console.log('Quiz data received:', data);
      
      if (data.fallback) {
        console.warn('Using fallback questions due to AI generation issues');
      }
      
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions received from API');
      }
      
      setQuizData(data);
      setTimeLeft(parseInt(duration) * 60);
      setShowSelection(false);
      console.log(`Quiz loaded successfully with ${data.questions.length} questions`);
      
    } catch (error) {
      console.error('Error generating quiz:', error);
      setError(
        `Failed to generate quiz: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      setShowSelection(true);
    } finally {
      setIsLoading(false);
    }
  };

  const deductGyanPoints = async () => {
    if (gyanDeducted || !user) return;
    
    try {
      console.log('Attempting to deduct Gyan Points for user:', user.uid);
      const response = await fetch('/api/deduct-gyan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid, amount: 5 }),
      });

      if (response.ok) {
        setGyanDeducted(true);
        console.log('5 Gyan Points deducted for quiz');
      } else {
        const errorData = await response.json();
        console.error('Failed to deduct Gyan Points:', errorData.error);
        if (errorData.error === 'Insufficient Gyan Points') {
          alert('You need at least 5 Gyan Points to play a quiz!');
          router.back();
          return;
        }
      }
    } catch (error) {
      console.error('Error deducting Gyan Points:', error);
    }
  };

  const handleStartQuiz = () => {
    if (!selectedSubject || !selectedCategory || !selectedTopic) {
      // Enhanced alert with better feedback
      const missingFields = [];
      if (!selectedSubject) missingFields.push('subject');
      if (!selectedCategory) missingFields.push('category');
      if (!selectedTopic) missingFields.push('topic');
      
      alert(`Please select ${missingFields.join(', ')}!`);
      return;
    }
    
    const fullSubject = `${selectedSubject} - ${selectedCategory} - ${selectedTopic}`;
    startQuiz(fullSubject, selectedDifficulty, selectedDuration);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    
    const isCorrect = answerIndex === quizData!.questions[currentQuestion].correctAnswer;
    setAnswerFeedback(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      setScore(score + 1);
      setAnswerStreak(answerStreak + 1);
      if (answerStreak >= 2) {
        setStreak(streak + 1);
        if (streak > 0 && streak % 3 === 0) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }
      }
    } else {
      setAnswerStreak(0);
    }
    
    // Show explanation after a brief delay
    setTimeout(() => {
      setShowExplanation(true);
    }, 1000);
  };

  const nextQuestion = () => {
    setQuestionAnimation(true);
    
    setTimeout(() => {
      if (currentQuestion < quizData!.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setShowExplanation(false);
        setAnswerFeedback(null);
        setQuestionAnimation(false);
      } else {
        completeQuiz();
      }
    }, 300);
  };

  const completeQuiz = () => {
    setQuizCompleted(true);
    if (score >= quizData!.questions.length * 0.8) {
      setShowConfetti(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const restartQuiz = () => {
    setQuizData(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setQuizCompleted(false);
    setShowExplanation(false);
    setGyanDeducted(false);
    setError(null);
    setStreak(0);
    setAnswerStreak(0);
    setShowConfetti(false);
    setAnswerFeedback(null);
    setShowSelection(true);
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

  // Enhanced Subject and Topic Selection Screen
  if (showSelection) {
    return (
      <div className="min-h-screen relative overflow-y-auto">
        <WavyBackground className="min-h-full relative">
          {/* Floating particles effect */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-30">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    fontSize: `${Math.random() * 20 + 10}px`
                  }}
                >
                  ✨⭐🎉
                </div>
              ))}
            </div>
          )}
          
          <div className="fixed top-4 right-4 z-50">
            <GyanPointsDisplay />
          </div>
          
          <div className="fixed top-4 left-4 z-50">
            <button 
              onClick={() => router.push('/dashboard')}
              className="group flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all duration-300 backdrop-blur-sm hover:scale-105"
            >
              <IconArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </button>
          </div>

          {/* Scrollable Content Container with visible scrollbar */}
          <div className="w-full px-4 md:px-8 pt-20 pb-8 min-h-screen overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 w-full shadow-2xl hover:shadow-3xl transition-all duration-500">
                
                {/* Enhanced Header */}
                <div className="text-center mb-8">
                  <div className="relative">
                    <IconBrain className="h-20 w-20 text-blue-400 mx-auto mb-4 animate-pulse" />
                    <div className="absolute -inset-4 bg-blue-400/20 rounded-full blur-xl"></div>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Start Your Quiz Journey
                  </h1>
                  <p className="text-neutral-400 text-lg">Choose your adventure and test your knowledge</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 animate-shake">
                    <div className="flex items-center gap-2">
                      <IconX className="h-5 w-5 text-red-400" />
                      <p className="text-red-400">{error}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  
                  {/* Enhanced Subject Selection */}
                  <div className="space-y-4">
                    <label className="block text-white font-semibold text-lg mb-4">
                      <IconBook className="h-5 w-5 inline mr-2" />
                      Choose Your Subject
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Object.entries(SUBJECTS).map(([subject, config]) => (
                        <button
                          key={subject}
                          onClick={() => {
                            setSelectedSubject(subject);
                            setSelectedCategory("");
                            setSelectedTopic("");
                          }}
                          className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                            selectedSubject === subject
                              ? `border-blue-500 bg-gradient-to-br ${config.color} text-white shadow-lg shadow-blue-500/25`
                              : 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <div className="text-4xl mb-3">{config.icon}</div>
                          <div className="font-semibold text-lg">{subject}</div>
                          <div className="text-sm opacity-75 mt-1">
                            {Object.keys(config.categories).length} categories
                          </div>
                          {selectedSubject === subject && (
                            <div className="absolute -top-2 -right-2">
                              <IconCheck className="h-6 w-6 text-green-400 bg-black rounded-full p-1" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Enhanced Category Selection */}
                  {selectedSubject && (
                    <div className="space-y-4 animate-fadeIn">
                      <label className="block text-white font-semibold text-lg mb-4">
                        <IconTarget className="h-5 w-5 inline mr-2" />
                        Select Category
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.keys(SUBJECTS[selectedSubject as keyof typeof SUBJECTS].categories).map((category) => (
                          <button
                            key={category}
                            onClick={() => {
                              setSelectedCategory(category);
                              setSelectedTopic("");
                            }}
                            className={`group relative p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                              selectedCategory === category
                                ? 'border-green-500 bg-green-500/20 text-green-400 shadow-lg shadow-green-500/25'
                                : 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
                            }`}
                          >
                            <div className="font-medium">{category}</div>
                            <IconChevronRight className={`h-4 w-4 mt-2 transition-transform ${selectedCategory === category ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                            {selectedCategory === category && (
                              <div className="absolute -top-1 -right-1">
                                <div className="h-3 w-3 bg-green-400 rounded-full animate-ping"></div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Topic Selection */}
                  {selectedSubject && selectedCategory && (
                    <div className="space-y-4 animate-fadeIn">
                      <label className="block text-white font-semibold text-lg mb-4">
                        <IconBulb className="h-5 w-5 inline mr-2" />
                        Choose Your Topic
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedSubject && selectedCategory &&
                          (
                            (SUBJECTS[selectedSubject as keyof typeof SUBJECTS].categories as Record<string, string[]>)[selectedCategory]
                          )?.map((topic: string) => (
                          <button
                            key={topic}
                            onClick={() => setSelectedTopic(topic)}
                            className={`group relative p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                              selectedTopic === topic
                                ? 'border-purple-500 bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/25'
                                : 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
                            }`}
                          >
                            <div className="font-medium">{topic}</div>
                            {selectedTopic === topic && (
                              <IconSparkles className="h-4 w-4 absolute top-2 right-2 text-purple-400 animate-spin" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Quiz Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Enhanced Difficulty */}
                    <div className="space-y-3">
                      <label className="block text-white font-semibold text-lg mb-4">
                        <IconFlame className="h-5 w-5 inline mr-2" />
                        Difficulty Level
                      </label>
                      <div className="space-y-3">
                        {Object.entries(DIFFICULTY_CONFIG).map(([level, config]) => (
                          <button
                            key={level}
                            onClick={() => setSelectedDifficulty(level)}
                            className={`w-full p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                              selectedDifficulty === level
                                ? `border-transparent bg-gradient-to-r ${config.color} text-white shadow-lg`
                                : 'border-white/10 bg-white/5 text-white hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{config.icon}</span>
                                <div className="text-left">
                                  <div className="font-semibold capitalize">{level}</div>
                                  <div className="text-sm opacity-75">{config.description}</div>
                                </div>
                              </div>
                              {selectedDifficulty === level && (
                                <IconCheck className="h-5 w-5" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Enhanced Duration */}
                    <div className="space-y-3">
                      <label className="block text-white font-semibold text-lg mb-4">
                        <IconClock className="h-5 w-5 inline mr-2" />
                        Quiz Duration
                      </label>
                      <div className="space-y-3">
                        {[
                          { value: "10", label: "Quick Sprint", desc: "10 minutes", icon: "⚡" },
                          { value: "15", label: "Standard", desc: "15 minutes", icon: "🎯" },
                          { value: "20", label: "Challenge", desc: "20 minutes", icon: "🔥" },
                          { value: "30", label: "Marathon", desc: "30 minutes", icon: "🏆" }
                        ].map((duration) => (
                          <button
                            key={duration.value}
                            onClick={() => setSelectedDuration(duration.value)}
                            className={`w-full p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                              selectedDuration === duration.value
                                ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/25'
                                : 'border-white/10 bg-white/5 text-white hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{duration.icon}</span>
                                <div className="text-left">
                                  <div className="font-semibold">{duration.label}</div>
                                  <div className="text-sm opacity-75">{duration.desc}</div>
                                </div>
                              </div>
                              {selectedDuration === duration.value && (
                                <IconCheck className="h-5 w-5" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Start Quiz Button */}
                  <div className="text-center pt-6">
                    <button
                      onClick={handleStartQuiz}
                      disabled={!selectedSubject || !selectedCategory || !selectedTopic || isLoading}
                      className={`group relative w-full md:w-auto px-12 py-6 rounded-2xl font-bold text-lg transition-all duration-300 transform ${
                        selectedSubject && selectedCategory && selectedTopic && !isLoading
                          ? 'bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 text-white hover:scale-105 shadow-lg hover:shadow-2xl'
                          : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-3">
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            <span>Generating Quiz...</span>
                          </>
                        ) : (
                          <>
                            <IconBolt className="h-6 w-6 group-hover:animate-bounce" />
                            <span>Start Quiz Journey</span>
                            <div className="bg-yellow-400 text-black px-2 py-1 rounded-full text-sm font-bold">
                              5 Gyan
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Animated background effect */}
                      {selectedSubject && selectedCategory && selectedTopic && !isLoading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-blue-400/20 to-purple-400/20 rounded-2xl animate-pulse -z-10"></div>
                      )}
                    </button>
                  </div>

                  {/* Enhanced Preview */}
                  {selectedSubject && selectedCategory && selectedTopic && (
                    <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-2xl p-6 text-center animate-fadeIn">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <IconStar className="h-5 w-5 text-yellow-400 animate-pulse" />
                        <h4 className="text-blue-400 font-bold text-lg">Quiz Preview</h4>
                        <IconStar className="h-5 w-5 text-yellow-400 animate-pulse" />
                      </div>
                      <div className="text-white text-lg font-semibold mb-2">
                        {selectedSubject} → {selectedCategory} → {selectedTopic}
                      </div>
                      <div className="flex items-center justify-center gap-4 text-sm text-neutral-300">
                        <span className="flex items-center gap-1">
                          <span className="text-2xl">{DIFFICULTY_CONFIG[selectedDifficulty as keyof typeof DIFFICULTY_CONFIG].icon}</span>
                          <span className="capitalize">{selectedDifficulty}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <IconClock className="h-4 w-4" />
                          {selectedDuration} minutes
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <IconBrain className="h-4 w-4" />
                          10 questions
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </WavyBackground>
      </div>
    );
  }

  // Enhanced Error State
  if (error && !showSelection) {
    return (
      <div className="min-h-screen relative">
        <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
          <div className="fixed top-4 right-4 z-50">
            <GyanPointsDisplay />
          </div>
          
          <main className="min-h-screen flex flex-col items-center justify-center relative z-10 max-w-2xl w-full">
            <div className="bg-black/40 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 w-full shadow-2xl text-center animate-shake">
              <div className="text-red-400 text-8xl mb-6 animate-bounce">💥</div>
              <h2 className="text-3xl font-bold text-white mb-4">Oops! Something went wrong</h2>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
              <div className="space-y-4">
                <button 
                  onClick={restartQuiz}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
                >
                  <IconRefresh className="h-4 w-4 inline mr-2" />
                  Try Again
                </button>
                <button 
                  onClick={() => setShowSelection(true)}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 border border-white/10"
                >
                  Choose Different Topic
                </button>
              </div>
            </div>
          </main>
        </WavyBackground>
      </div>
    );
  }

  // Enhanced Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen relative">
        <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
          <div className="fixed top-4 right-4 z-50">
            <GyanPointsDisplay />
          </div>
          
          <main className="min-h-screen flex flex-col items-center justify-center relative z-10 max-w-2xl w-full">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 w-full shadow-2xl text-center">
              <BlackHoleLoader />
              <h2 className="text-3xl font-bold text-white mt-8 mb-6">Crafting Your Quiz ✨</h2>
              
              <div className="space-y-3 mb-6">
                <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-neutral-300">Subject:</span>
                  <span className="text-white font-semibold">{selectedSubject}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-neutral-300">Category:</span>
                  <span className="text-white font-semibold">{selectedCategory}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-neutral-300">Topic:</span>
                  <span className="text-white font-semibold">{selectedTopic}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-neutral-300">Difficulty:</span>
                  <span className="text-white font-semibold capitalize">{selectedDifficulty}</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-neutral-300">Duration:</span>
                  <span className="text-white font-semibold">{selectedDuration} minutes</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="animate-pulse text-green-400 text-lg">🧠 Analyzing your preferences...</div>
                <div className="animate-pulse text-blue-400 text-lg">📚 Generating questions...</div>
                <div className="animate-pulse text-purple-400 text-lg">⚡ Preparing your challenge...</div>
              </div>
            </div>
          </main>
        </WavyBackground>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl mb-4">No quiz data available</h2>
          <button 
            onClick={() => setShowSelection(true)}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg"
          >
            Start New Quiz
          </button>
        </div>
      </div>
    );
  }

  // Enhanced Quiz Completion Screen
  if (quizCompleted) {
    const percentage = Math.round((score / quizData.questions.length) * 100);
    const isExcellent = percentage >= 80;
    const isGood = percentage >= 60;
    
    return (
      <div className="min-h-screen relative">
        <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
          {/* Confetti Effect */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-30">
              {[...Array(100)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-bounce text-2xl"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${Math.random() * 3 + 2}s`
                  }}
                >
                  {['🎉', '✨', '🎊', '⭐', '🏆', '🎯'][Math.floor(Math.random() * 6)]}
                </div>
              ))}
            </div>
          )}
          
          <div className="fixed top-4 right-4 z-50">
            <GyanPointsDisplay />
          </div>
          
          <main className="min-h-screen flex flex-col items-center justify-center relative z-10 max-w-3xl w-full">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full shadow-2xl text-center">
              
              {/* Trophy Animation */}
              <div className="relative mb-8">
                <IconTrophy className={`h-24 w-24 mx-auto mb-4 ${
                  isExcellent ? 'text-yellow-400 animate-bounce' : 
                  isGood ? 'text-silver-400 animate-pulse' : 
                  'text-bronze-400'
                }`} />
                {isExcellent && (
                  <div className="absolute -inset-8 bg-yellow-400/20 rounded-full blur-xl animate-pulse"></div>
                )}
              </div>
              
              <h1 className="text-5xl font-bold text-white mb-6">
                {isExcellent ? '🎉 Outstanding!' : 
                 isGood ? '👏 Well Done!' : 
                 '💪 Keep Trying!'}
              </h1>
              
              {/* Score Display */}
              <div className="relative mb-8">
                <div className={`text-8xl font-bold mb-4 bg-gradient-to-r ${
                  isExcellent ? 'from-yellow-400 to-orange-500' :
                  isGood ? 'from-green-400 to-blue-500' :
                  'from-red-400 to-pink-500'
                } bg-clip-text text-transparent`}>
                  {percentage}%
                </div>
                
                {/* Circular Progress */}
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-white/10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
                      className={`${
                        isExcellent ? 'text-yellow-400' :
                        isGood ? 'text-green-400' :
                        'text-red-400'
                      } transition-all duration-1000 ease-out`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              
              {/* Quiz Info */}
              <div className="mb-8 space-y-2">
                <p className="text-xl text-neutral-300">{selectedSubject} • {selectedCategory} • {selectedTopic}</p>
                <p className="text-neutral-400 capitalize">{selectedDifficulty} • {selectedDuration} minutes</p>
                {streak > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <IconFlame className="h-5 w-5 text-orange-400" />
                    <span className="text-orange-400 font-bold">Streak: {streak}</span>
                  </div>
                )}
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <IconCheck className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-400">{score}</div>
                  <div className="text-neutral-400 text-sm">Correct</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <IconX className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-400">{quizData.questions.length - score}</div>
                  <div className="text-neutral-400 text-sm">Incorrect</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <IconTie className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-400">{selectedDuration}</div>
                  <div className="text-neutral-400 text-sm">Minutes</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                  <IconMedal className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-400">
                    {isExcellent ? 'A+' : isGood ? 'B+' : 'C'}
                  </div>
                  <div className="text-neutral-400 text-sm">Grade</div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={restartQuiz}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3"
                >
                  <IconBolt className="h-5 w-5" />
                  Take Another Quiz
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 border border-white/10 hover:border-white/20"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </main>
        </WavyBackground>
      </div>
    );
  }

  const currentQ = quizData.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 relative">
        {/* Enhanced Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to exit the quiz? Your progress will be lost.')) {
                  setShowSelection(true);
                }
              }}
              className="group flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all duration-300"
            >
              <IconArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Exit Quiz
            </button>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-white bg-blue-500/10 px-3 py-1 rounded-lg">
                <IconBrain className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium">{selectedTopic}</span>
              </div>
              
              {/* Enhanced Timer */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all duration-300 ${
                timeLeft < 60 ? 'bg-red-500/20 text-red-400 animate-pulse' : 
                timeLeft < 300 ? 'bg-yellow-500/20 text-yellow-400' : 
                'bg-green-500/10 text-white'
              }`}>
                <IconClock className="h-4 w-4" />
                <span className="font-mono font-bold">
                  {formatTime(timeLeft)}
                </span>
              </div>
              
              {/* Streak Display */}
              {answerStreak > 1 && (
                <div className="flex items-center gap-1 bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg">
                  <IconFlame className="h-4 w-4" />
                  <span className="font-bold">{answerStreak}</span>
                </div>
              )}
              
              <GyanPointsDisplay />
            </div>
          </div>
        </div>

        <main className="min-h-screen flex flex-col items-center justify-center relative z-10 max-w-5xl w-full pt-20">
          
          {/* Enhanced Progress Bar */}
          <div className="w-full mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-400 text-sm">Progress</span>
              <span className="text-white text-sm font-semibold">
                {currentQuestion + 1} / {quizData.questions.length}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
              </div>
            </div>
          </div>

          <div className={`bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 w-full shadow-2xl transition-all duration-300 ${
            questionAnimation ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
          }`}>
            
            {/* Question Counter with Animation */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <IconBrain className="h-4 w-4 text-blue-400" />
                <span className="text-neutral-400">
                  Question {currentQuestion + 1} of {quizData.questions.length}
                </span>
              </div>
            </div>

            {/* Enhanced Question */}
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                {currentQ.question}
              </h2>
            </div>

            {/* Enhanced Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {currentQ.options.map((option, index) => {
                let buttonClass = "group relative w-full p-6 text-left rounded-2xl border-2 transition-all duration-300 transform ";
                
                if (!isAnswered) {
                  buttonClass += "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-white cursor-pointer hover:scale-105 hover:shadow-lg";
                } else {
                  if (index === currentQ.correctAnswer) {
                    buttonClass += "border-green-500 bg-green-500/20 text-green-400 scale-105 shadow-lg shadow-green-500/25";
                  } else if (index === selectedAnswer) {
                    buttonClass += "border-red-500 bg-red-500/20 text-red-400 scale-105 shadow-lg shadow-red-500/25";
                  } else {
                    buttonClass += "border-white/10 bg-white/5 text-neutral-400 opacity-60";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                        !isAnswered ? 'border-current group-hover:scale-110' : 'border-current'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="flex-1 font-medium">{option}</span>
                      <div className="ml-auto">
                        {isAnswered && index === currentQ.correctAnswer && (
                          <div className="flex items-center gap-2">
                            <IconCheck className="h-6 w-6 text-green-400 animate-bounce" />
                            <span className="text-green-400 font-bold text-sm">Correct!</span>
                          </div>
                        )}
                        {isAnswered && index === selectedAnswer && index !== currentQ.correctAnswer && (
                          <div className="flex items-center gap-2">
                            <IconX className="h-6 w-6 text-red-400 animate-pulse" />
                            <span className="text-red-400 font-bold text-sm">Wrong</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hover effect overlay */}
                    {!isAnswered && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 rounded-2xl transition-all duration-300"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Enhanced Answer Feedback */}
            {answerFeedback && (
              <div className={`text-center mb-6 animate-fadeIn ${
                answerFeedback === 'correct' ? 'text-green-400' : 'text-red-400'
              }`}>
                <div className="text-4xl mb-2">
                  {answerFeedback === 'correct' ? '🎉' : '😔'}
                </div>
                <div className="text-xl font-bold">
                  {answerFeedback === 'correct' ? 'Excellent!' : 'Not quite right'}
                </div>
              </div>
            )}

            {/* Enhanced Explanation */}
            {showExplanation && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 mb-8 animate-slideUp">
                <div className="flex items-center gap-2 mb-3">
                  <IconBulb className="h-5 w-5 text-blue-400" />
                  <h4 className="text-blue-400 font-bold text-lg">Explanation</h4>
                </div>
                <p className="text-neutral-300 leading-relaxed">{currentQ.explanation}</p>
              </div>
            )}

            {/* Enhanced Next Button */}
            {isAnswered && (
              <div className="text-center space-y-4">
                <button
                  onClick={nextQuestion}
                  className="group bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 mx-auto"
                >
                  <span>
                    {currentQuestion < quizData.questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
                  </span>
                  <IconChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                
                {/* Progress indicator */}
                <div className="text-sm text-neutral-400">
                  {currentQuestion < quizData.questions.length - 1 
                    ? `${quizData.questions.length - currentQuestion - 1} questions remaining`
                    : 'Last question!'
                  }
                </div>
              </div>
            )}

            {/* Enhanced Score Display */}
            <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-lg">
                <IconAward className="h-4 w-4 text-green-400" />
                <span className="text-white font-bold">Score: {score}/{quizData.questions.length}</span>
              </div>
              
              <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-lg">
                <IconTarget className="h-4 w-4 text-blue-400" />
                <span className="text-white font-bold">
                  {Math.round((score / (currentQuestion + (isAnswered ? 1 : 0))) * 100) || 0}% Accuracy
                </span>
              </div>
            </div>
          </div>
        </main>
      </WavyBackground>
    </div>
  );
}

export default function QuizGame() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BlackHoleLoader />
      </div>
    }>
      <QuizGameContent />
    </Suspense>
  );
}