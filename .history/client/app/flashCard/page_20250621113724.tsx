"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardBody, Button, Input, Chip } from "@heroui/react"
import { WavyBackground } from "@/components/ui/wavy-background"
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay"
import toast from "react-hot-toast"
import {
  IconArrowLeft,
  IconBrain,
  IconHistory,
  IconTrash,
  IconEye,
  IconPlus,
  IconCards,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"

interface Flashcard {
  id: string
  question: string
  answer: string
}

interface FlashcardSet {
  id: string
  topic: string
  flashcards: Flashcard[]
  createdAt: string
  count: number
}

export default function FlashcardPage() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [count, setCount] = useState(15)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentFlashcards, setCurrentFlashcards] = useState<Flashcard[]>([])
  const [history, setHistory] = useState<FlashcardSet[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null)

  // Load history from localStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHistory = localStorage.getItem("flashcard-history")
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory))
        } catch (error) {
          console.error("Error loading flashcard history:", error)
        }
      }
    }
  }, [])

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && history.length > 0) {
      localStorage.setItem("flashcard-history", JSON.stringify(history))
    }
  }, [history])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <div
            className="absolute inset-0 w-20 h-20 border-4 border-pink-500/30 border-b-pink-500 rounded-full animate-spin"
            style={{ animationDirection: "reverse" }}
          ></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    router.push("/")
    return null
  }

  const generateFlashcards = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-flashcard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: topic.trim(), count }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate flashcards")
      }

      const newFlashcardSet: FlashcardSet = {
        id: `set-${Date.now()}`,
        topic: topic.trim(),
        flashcards: data.flashcards,
        createdAt: new Date().toISOString(),
        count: data.flashcards.length,
      }

      setCurrentFlashcards(data.flashcards)
      setHistory((prev) => [newFlashcardSet, ...prev])
      toast.success(`Generated ${data.flashcards.length} flashcards!`)
    } catch (error) {
      console.error("Error generating flashcards:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate flashcards")
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteFromHistory = (setId: string) => {
    setHistory((prev) => prev.filter((set) => set.id !== setId))
    if (selectedSet?.id === setId) {
      setSelectedSet(null)
      setCurrentFlashcards([])
    }
    toast.success("Flashcard set deleted")
  }

  const viewFlashcardSet = (set: FlashcardSet) => {
    setSelectedSet(set)
    setCurrentFlashcards(set.flashcards)
    setShowHistory(false)
  }

  const clearAllHistory = () => {
    if (confirm("Are you sure you want to clear all flashcard history?")) {
      setHistory([])
      setCurrentFlashcards([])
      setSelectedSet(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("flashcard-history")
      }
      toast.success("History cleared")
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <WavyBackground className="min-h-screen">
        {/* Gyan Points Display */}
        <div className="fixed top-6 right-6 z-50">
          <GyanPointsDisplay />
        </div>

        {/* Main Container - Much Larger */}
        <div className="container mx-auto px-6 py-8 max-w-[1600px] relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-6">
              <Button
                isIconOnly
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                className="text-white hover:bg-white/10 transition-all duration-200 hover:scale-105"
                size="lg"
              >
                <IconArrowLeft className="w-6 h-6" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl backdrop-blur-sm border border-white/10">
                  <IconCards className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Flashcards
                  </h1>
                  <p className="text-white/70 text-lg mt-1">AI-powered learning cards</p>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                variant={showHistory ? "solid" : "ghost"}
                onClick={() => setShowHistory(!showHistory)}
                className={
                  showHistory
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                    : "text-white hover:bg-white/10 border border-white/20"
                }
                startContent={<IconHistory className="w-5 h-5" />}
                size="lg"
              >
                History ({history.length})
              </Button>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={clearAllHistory}
                  className="text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-all duration-200"
                  startContent={<IconTrash className="w-5 h-5" />}
                  size="lg"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Main Content */}
          {showHistory ? (
            <HistoryView history={history} onView={viewFlashcardSet} onDelete={deleteFromHistory} />
          ) : (
            <div className="grid xl:grid-cols-5 gap-12">
              {/* Generation Panel - 2 columns */}
              <div className="xl:col-span-2">
                <Card className="bg-black/30 backdrop-blur-2xl border border-white/10 shadow-2xl h-fit">
                  <CardBody className="p-10">
                    <h2 className="text-3xl font-bold text-white mb-10 flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
                        <IconBrain className="w-8 h-8" />
                      </div>
                      Generate Flashcards
                    </h2>

                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-white/90 text-lg font-medium block">Topic</label>
                        <Input
                          placeholder="Enter a topic (e.g., Photosynthesis, World War 2)"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          classNames={{
                            input: "text-white text-lg bg-transparent placeholder:text-white/40",
                            inputWrapper:
                              "border-2 border-white/20 hover:border-white/40 focus-within:border-purple-500/60 bg-white/5 backdrop-blur-sm h-14 rounded-xl",
                          }}
                          size="lg"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-white/90 text-lg font-medium block">Number of Cards</label>
                        <Input
                          type="number"
                          min="15"
                          max="25"
                          value={count.toString()}
                          onChange={(e) => setCount(Math.max(15, Math.min(25, Number.parseInt(e.target.value) || 15)))}
                          classNames={{
                            input: "text-white text-lg bg-transparent",
                            inputWrapper:
                              "border-2 border-white/20 hover:border-white/40 focus-within:border-purple-500/60 bg-white/5 backdrop-blur-sm h-14 rounded-xl",
                          }}
                          size="lg"
                        />
                        <p className="text-white/50 text-sm">Choose between 15-25 cards</p>
                      </div>

                      <Button
                        onClick={generateFlashcards}
                        isLoading={isGenerating}
                        disabled={!topic.trim() || isGenerating}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-xl hover:shadow-purple-500/25 transition-all duration-200 hover:scale-[1.02] h-16 text-lg"
                        size="lg"
                        startContent={!isGenerating && <IconPlus className="w-6 h-6" />}
                      >
                        {isGenerating ? "Generating..." : "Generate Flashcards"}
                      </Button>
                    </div>

                    {selectedSet && (
                      <div className="mt-10 p-8 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-2xl border border-green-500/20 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-semibold text-xl">{selectedSet.topic}</h3>
                            <p className="text-white/60 text-base mt-1">
                              {selectedSet.count} cards • Created {new Date(selectedSet.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Chip color="success" variant="flat" size="lg" className="text-base px-4 py-2">
                            Current Set
                          </Chip>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>

              {/* Flashcard Display - 3 columns */}
              <div className="xl:col-span-3">
                {currentFlashcards.length > 0 ? (
                  <FlashcardViewer flashcards={currentFlashcards} />
                ) : (
                  <Card className="bg-black/30 backdrop-blur-2xl border border-white/10 h-full shadow-2xl min-h-[600px]">
                    <CardBody className="flex items-center justify-center p-16">
                      <div className="text-center">
                        <div className="p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full w-fit mx-auto mb-8">
                          <IconCards className="w-20 h-20 text-white/30" />
                        </div>
                        <h3 className="text-3xl font-semibold text-white mb-4">No Flashcards Yet</h3>
                        <p className="text-white/60 text-xl max-w-md">
                          Generate flashcards or select from history to get started
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </WavyBackground>
    </div>
  )
}

// History View Component
function HistoryView({
  history,
  onView,
  onDelete,
}: {
  history: FlashcardSet[]
  onView: (set: FlashcardSet) => void
  onDelete: (setId: string) => void
}) {
  if (history.length === 0) {
    return (
      <Card className="bg-black/30 backdrop-blur-2xl border border-white/10 shadow-2xl">
        <CardBody className="flex items-center justify-center p-20">
          <div className="text-center">
            <div className="p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full w-fit mx-auto mb-8">
              <IconHistory className="w-20 h-20 text-white/30" />
            </div>
            <h3 className="text-3xl font-semibold text-white mb-4">No History Yet</h3>
            <p className="text-white/60 text-xl">Generate some flashcards to see them here</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {history.map((set, index) => (
        <Card
          key={set.id}
          className="bg-black/30 backdrop-blur-2xl border border-white/10 hover:bg-black/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <CardBody className="p-8">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-white font-semibold text-xl truncate pr-2">{set.topic}</h3>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onClick={() => onDelete(set.id)}
                className="text-red-400 hover:bg-red-500/10 min-w-unit-8 w-8 h-8 hover:scale-110 transition-all duration-200"
              >
                <IconTrash className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2">
                <Chip size="lg" color="primary" variant="flat" className="font-semibold text-base px-4 py-2">
                  {set.count} cards
                </Chip>
              </div>
              <p className="text-white/60 text-base">
                Created:{" "}
                {new Date(set.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <Button
              onClick={() => onView(set)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-200 hover:scale-[1.02] h-12 text-base"
              startContent={<IconEye className="w-5 h-5" />}
              size="lg"
            >
              View Cards
            </Button>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

// Flashcard Viewer Component with perfect 3D flip animation and fixed text rendering
function FlashcardViewer({ flashcards }: { flashcards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length)
    setIsFlipped(false)
  }

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
    setIsFlipped(false)
  }

  const currentCard = flashcards[currentIndex]

  // Clean text function to fix encoding issues
  const cleanText = (text: string) => {
    return text
      .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, "") // Remove non-printable characters
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim()
  }

  return (
    <div className="space-y-8">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-white/90 text-2xl font-semibold">
            Card {currentIndex + 1} of {flashcards.length}
          </span>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => {
              setCurrentIndex(0)
              setIsFlipped(false)
            }}
            className="text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200"
            startContent={<IconRefresh className="w-5 h-5" />}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden backdrop-blur-sm">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500 ease-out shadow-lg"
          style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
        />
      </div>

      {/* Flashcard with 3D Flip Animation - Much Larger */}
      <div className="relative h-[500px] w-full" style={{ perspective: "1200px" }}>
        <div
          className={`absolute inset-0 w-full h-full transition-transform duration-700 ease-in-out cursor-pointer`}
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front (Question) */}
          <Card
            className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-pink-500/20 backdrop-blur-2xl border-2 border-purple-500/30 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300"
            style={{ backfaceVisibility: "hidden" }}
          >
            <CardBody className="flex items-center justify-center p-12 text-center h-full">
              <div className="space-y-8 max-w-4xl">
                <div className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full w-fit mx-auto">
                  <IconBrain className="w-12 h-12 text-purple-300" />
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white leading-relaxed">
                  {cleanText(currentCard.question)}
                </h3>
                <div className="flex items-center justify-center gap-3 text-white/60">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  <p className="text-xl">Click to reveal answer</p>
                  <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Back (Answer) */}
          <Card
            className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-blue-600/10 to-green-500/20 backdrop-blur-2xl border-2 border-blue-500/30 shadow-2xl hover:shadow-blue-500/20 transition-all duration-300"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <CardBody className="flex items-center justify-center p-12 text-center h-full">
              <div className="space-y-8 max-w-4xl">
                <div className="p-4 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-full w-fit mx-auto">
                  <IconEye className="w-12 h-12 text-blue-300" />
                </div>
                <div className="space-y-6">
                  <h4 className="text-2xl font-semibold text-blue-200">Answer:</h4>
                  <div className="bg-white/5 rounded-2xl p-8 backdrop-blur-sm border border-white/10">
                    <p className="text-white text-xl md:text-2xl leading-relaxed font-medium">
                      {cleanText(currentCard.answer)}
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center gap-6">
        <Button
          onClick={prevCard}
          disabled={flashcards.length <= 1}
          variant="ghost"
          className="text-white hover:bg-white/10 border-2 border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 h-14 px-8 text-lg"
          startContent={<IconChevronLeft className="w-6 h-6" />}
          size="lg"
        >
          Previous
        </Button>

        <Button
          onClick={() => setIsFlipped(!isFlipped)}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white hover:from-purple-500/30 hover:to-pink-500/30 border-2 border-purple-500/30 hover:border-purple-500/50 backdrop-blur-sm transition-all duration-200 hover:scale-105 h-14 px-8 text-lg font-semibold"
          size="lg"
        >
          {isFlipped ? "Show Question" : "Show Answer"}
        </Button>

        <Button
          onClick={nextCard}
          disabled={flashcards.length <= 1}
          variant="ghost"
          className="text-white hover:bg-white/10 border-2 border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 h-14 px-8 text-lg"
          endContent={<IconChevronRight className="w-6 h-6" />}
          size="lg"
        >
          Next
        </Button>
      </div>

      {/* Card Navigation Dots */}
      <div className="flex justify-center gap-3 mt-8">
        {flashcards.slice(0, Math.min(10, flashcards.length)).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index)
              setIsFlipped(false)
            }}
            className={`w-4 h-4 rounded-full transition-all duration-200 hover:scale-125 ${
              index === currentIndex
                ? "bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg"
                : "bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
        {flashcards.length > 10 && (
          <span className="text-white/40 text-base self-center ml-3">+{flashcards.length - 10} more</span>
        )}
      </div>
    </div>
  )
}
