"use client";

import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Card, CardBody } from "@heroui/react";
import { IconCheck, IconX, IconBrain, IconClock } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: string;
  explanation: string;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  nodeTitle: string;
  questions: QuizQuestion[];
  passingScore?: number; // Percentage needed to pass (default 67%)
}

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  nodeTitle,
  questions,
  passingScore = 67
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState<{
    score: number;
    passed: boolean;
    answers: { questionIndex: number; selected: string; correct: string; isCorrect: boolean }[];
  } | null>(null);

  // Reset quiz state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentQuestionIndex(0);
      setSelectedAnswers([]);
      setShowResults(false);
      setQuizResults(null);
    }
  }, [isOpen]);

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate results
      calculateResults();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateResults = () => {
    const answers = questions.map((question, index) => ({
      questionIndex: index,
      selected: selectedAnswers[index] || '',
      correct: question.correct,
      isCorrect: selectedAnswers[index] === question.correct
    }));

    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const score = Math.round((correctAnswers / questions.length) * 100);
    const passed = score >= passingScore;

    setQuizResults({
      score,
      passed,
      answers
    });
    setShowResults(true);
  };

  const handleRetryQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setQuizResults(null);
  };

  const handleMarkAsRead = () => {
    onSuccess();
    onClose();
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasSelectedAnswer = selectedAnswers[currentQuestionIndex];

  if (!isOpen || questions.length === 0) {
    return null;
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="2xl"
      placement="center"
      backdrop="blur"
      classNames={{
        base: "bg-neutral-900 border border-neutral-700",
        header: "border-b border-neutral-700",
        body: "py-6",
        footer: "border-t border-neutral-700"
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <IconBrain className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="text-xl font-semibold text-white">Knowledge Check</h3>
              <p className="text-sm text-neutral-400">
                {showResults ? 'Quiz Results' : `${nodeTitle} - Question ${currentQuestionIndex + 1} of ${questions.length}`}
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          {!showResults ? (
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="w-full bg-neutral-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <Card className="bg-neutral-800 border-neutral-600">
                <CardBody className="p-6">
                  <h4 className="text-lg font-medium text-white mb-6">
                    {currentQuestion.question}
                  </h4>

                  {/* Answer options */}
                  <div className="space-y-3">
                    {Object.entries(currentQuestion.options).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => handleAnswerSelect(key)}
                        className={cn(
                          "w-full text-left p-4 rounded-lg border-2 transition-all duration-200",
                          "hover:border-blue-500 hover:bg-neutral-700",
                          selectedAnswers[currentQuestionIndex] === key
                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                            : "border-neutral-600 bg-neutral-700 text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                            selectedAnswers[currentQuestionIndex] === key
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-neutral-400 text-neutral-400"
                          )}>
                            {key}
                          </span>
                          <span>{value}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Score display */}
              <div className={cn(
                "text-center p-6 rounded-lg",
                quizResults?.passed ? "bg-green-500/10 border border-green-500" : "bg-red-500/10 border border-red-500"
              )}>
                <div className={cn(
                  "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                  quizResults?.passed ? "bg-green-500" : "bg-red-500"
                )}>
                  {quizResults?.passed ? (
                    <IconCheck className="w-8 h-8 text-white" />
                  ) : (
                    <IconX className="w-8 h-8 text-white" />
                  )}
                </div>
                <h3 className={cn(
                  "text-2xl font-bold mb-2",
                  quizResults?.passed ? "text-green-400" : "text-red-400"
                )}>
                  {quizResults?.passed ? "Congratulations!" : "Not quite there yet"}
                </h3>
                <p className="text-white text-lg">
                  You scored {quizResults?.score}% ({quizResults?.answers.filter(a => a.isCorrect).length} out of {questions.length} correct)
                </p>
                <p className="text-neutral-400 text-sm mt-2">
                  {quizResults?.passed 
                    ? "You can now mark this topic as read!" 
                    : `You need ${passingScore}% to pass. Please review the material and try again.`
                  }
                </p>
              </div>

              {/* Detailed results */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Review Your Answers:</h4>
                {questions.map((question, index) => {
                  const result = quizResults?.answers[index];
                  return (
                    <Card key={index} className="bg-neutral-800 border-neutral-600">
                      <CardBody className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-1",
                            result?.isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                          )}>
                            {result?.isCorrect ? <IconCheck className="w-3 h-3" /> : <IconX className="w-3 h-3" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium mb-2">{question.question}</p>
                            <div className="space-y-1 text-sm">
                              <p className="text-neutral-400">
                                Your answer: <span className={cn(
                                  "font-medium",
                                  result?.isCorrect ? "text-green-400" : "text-red-400"
                                )}>
                                  {result?.selected} - {question.options[result?.selected as keyof typeof question.options] || 'No answer'}
                                </span>
                              </p>
                              {!result?.isCorrect && (
                                <p className="text-neutral-400">
                                  Correct answer: <span className="text-green-400 font-medium">
                                    {question.correct} - {question.options[question.correct as keyof typeof question.options]}
                                  </span>
                                </p>
                              )}
                              <p className="text-neutral-300 mt-2 italic">{question.explanation}</p>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          {!showResults ? (
            <div className="flex justify-between w-full">
              <Button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                variant="flat"
                className="bg-neutral-700 text-white"
              >
                Previous
              </Button>
              <Button
                onClick={handleNextQuestion}
                disabled={!hasSelectedAnswer}
                className="bg-blue-600 text-white"
              >
                {isLastQuestion ? 'Finish Quiz' : 'Next'}
              </Button>
            </div>
          ) : (
            <div className="flex justify-between w-full">
              {!quizResults?.passed ? (
                <>
                  <Button
                    onClick={onClose}
                    variant="flat"
                    className="bg-neutral-700 text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRetryQuiz}
                    className="bg-blue-600 text-white"
                  >
                    Try Again
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={onClose}
                    variant="flat"
                    className="bg-neutral-700 text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleMarkAsRead}
                    className="bg-green-600 text-white"
                  >
                    Mark as Read
                  </Button>
                </>
              )}
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
