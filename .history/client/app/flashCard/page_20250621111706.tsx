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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
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
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen p-4 md:p-8">
        {/* Gyan Points Display */}
        <div className="fixed top-4 right-4 z-50">
          <GyanPointsDisplay />
        </div>

        {/* Header */}
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                isIconOnly
                variant="ghost"
                onClick={() => router.push("/dashboard")} // Changed back to "/dashboard"
                className="text-white hover:bg-white/10"
              >
                <IconArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <IconCards className="w-8 h-8 text-white" />
                <h1 className="text-3xl font-bold text-white">Flashcards</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={showHistory ? "solid" : "ghost"}
                onClick={() => setShowHistory(!showHistory)}
                className={showHistory ? "bg-white text-black" : "text-white hover:bg-white/10"}
                startContent={<IconHistory className="w-4 h-4" />}
              >
                History ({history.length})
              </Button>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={clearAllHistory}
                  className="text-red-400 hover:bg-red-500/10"
                  startContent={<IconTrash className="w-4 h-4" />}
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
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Generation Panel */}
              <Card className="bg-black/40 backdrop-blur-md border border-white/10">
                <CardBody className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <IconBrain className="w-6 h-6" />
                    Generate Flashcards
                  </h2>

                  <div className="space-y-4">
                    <Input
                      label="Topic"
                      placeholder="Enter a topic (e.g., 'Photosynthesis', 'World War 2')"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="text-white"
                      classNames={{
                        input: "text-white",
                        label: "text-white/70",
                      }}
                    />

                    <Input
                      label="Number of Cards"
                      type="number"
                      min="15"
                      max="25"
                      value={count.toString()}
                      onChange={(e) => setCount(Math.max(15, Math.min(25, Number.parseInt(e.target.value) || 15)))}
                      className="text-white"
                      classNames={{
                        input: "text-white",
                        label: "text-white/70",
                      }}
                    />

                    <Button
                      onClick={generateFlashcards}
                      isLoading={isGenerating}
                      disabled={!topic.trim() || isGenerating}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
                      size="lg"
                      startContent={!isGenerating && <IconPlus className="w-5 h-5" />}
                    >
                      {isGenerating ? "Generating..." : "Generate Flashcards"}
                    </Button>
                  </div>

                  {selectedSet && (
                    <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-semibold">{selectedSet.topic}</h3>
                          <p className="text-white/60 text-sm">
                            {selectedSet.count} cards • {new Date(selectedSet.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Chip color="success" variant="flat">
                          Current
                        </Chip>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Flashcard Display */}
              <div>
                {currentFlashcards.length > 0 ? (
                  <FlashcardViewer flashcards={currentFlashcards} />
                ) : (
                  <Card className="bg-black/40 backdrop-blur-md border border-white/10 h-full">
                    <CardBody className="flex items-center justify-center p-8">
                      <div className="text-center">
                        <IconCards className="w-16 h-16 text-white/30 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Flashcards Yet</h3>
                        <p className="text-white/60">Generate flashcards or select from history to get started</p>
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
      <Card className="bg-black/40 backdrop-blur-md border border-white/10">
        <CardBody className="flex items-center justify-center p-12">
          <div className="text-center">
            <IconHistory className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No History Yet</h3>
            <p className="text-white/60">Generate some flashcards to see them here</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {history.map((set) => (
        <Card
          key={set.id}
          className="bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/50 transition-colors"
        >
          <CardBody className="p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-white font-semibold text-lg truncate">{set.topic}</h3>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onClick={() => onDelete(set.id)}
                className="text-red-400 hover:bg-red-500/10 min-w-unit-8 w-8 h-8"
              >
                <IconTrash className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Chip size="sm" color="primary" variant="flat">
                  {set.count} cards
                </Chip>
              </div>
              <p className="text-white/60 text-sm">Created: {new Date(set.createdAt).toLocaleDateString()}</p>
            </div>

            <Button
              onClick={() => onView(set)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
              startContent={<IconEye className="w-4 h-4" />}
            >
              View Cards
            </Button>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

// Flashcard Viewer Component
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

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-white/60 text-sm">
        <span>
          Card {currentIndex + 1} of {flashcards.length}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCurrentIndex(0)
              setIsFlipped(false)
            }}
            className="text-white/60 hover:bg-white/10"
            startContent={<IconRefresh className="w-4 h-4" />}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div className="relative h-80">
        <div
          className={`absolute inset-0 w-full h-full transition-transform duration-500 transform-style-preserve-3d cursor-pointer ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front (Question) */}
          <Card className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 backface-hidden">
            <CardBody className="flex items-center justify-center p-6 text-center">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">{currentCard.question}</h3>
                <p className="text-white/60">Click to reveal answer</p>
              </div>
            </CardBody>
          </Card>

          {/* Back (Answer) */}
          <Card className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-500/20 to-green-500/20 backdrop-blur-md border border-white/20 backface-hidden rotate-y-180">
            <CardBody className="flex items-center justify-center p-6 text-center">
              <div>
                <h4 className="text-lg font-semibold text-white/80 mb-3">Answer:</h4>
                <p className="text-white text-lg leading-relaxed">{currentCard.answer}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          onClick={prevCard}
          disabled={flashcards.length <= 1}
          variant="ghost"
          className="text-white hover:bg-white/10"
        >
          Previous
        </Button>

        <Button onClick={() => setIsFlipped(!isFlipped)} className="bg-white/10 text-white hover:bg-white/20">
          {isFlipped ? "Show Question" : "Show Answer"}
        </Button>

        <Button
          onClick={nextCard}
          disabled={flashcards.length <= 1}
          variant="ghost"
          className="text-white hover:bg-white/10"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
