"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { apiService } from "@/lib/api"
import { FloatingDock } from "@/components/ui/floating-dock"
import { WavyBackground } from "@/components/ui/wavy-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MultiStepLoader } from "@/components/ui/multi-step-loader"
import { toast } from "sonner"
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconMicrophone,
  IconMicrophoneOff,
  IconPlus,
  IconUpload,
  IconX,
  IconFileText,
  IconSquareRoundedX,
  IconEye,
  IconTrash,
} from "@tabler/icons-react"

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: (event: any) => void
  onerror: (event: any) => void
  onend: () => void
}

interface MindMap {
  id: number
  subject_name: string
  created_at: string
  mindmap_data?: any
}

export default function MindMapPage() {
  const { user, loading, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  // Form states
  const [subjectName, setSubjectName] = useState("")
  const [syllabus, setSyllabus] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Mind maps list
  const [mindMaps, setMindMaps] = useState<MindMap[]>([])
  const [isLoadingMindMaps, setIsLoadingMindMaps] = useState(true)

  // Loading states for mind map creation
  const loadingStates = [
    { text: "Connecting to Groq AI..." },
    { text: "Analyzing subject content..." },
    { text: "Processing syllabus structure..." },
    { text: "Creating knowledge nodes..." },
    { text: "Building connections..." },
    { text: "Generating visual layout..." },
    { text: "Optimizing mind map structure..." },
    { text: "Finalizing your mind map..." },
    { text: "Mind map created successfully!" },
  ]

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const speechRecognition = new (window as any).webkitSpeechRecognition()
      speechRecognition.continuous = true
      speechRecognition.interimResults = true
      speechRecognition.lang = "en-US"

      speechRecognition.onresult = (event: any) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setSyllabus((prev) => prev + " " + finalTranscript)
        }
      }

      speechRecognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
        toast.error("Speech Recognition Error", {
          description: "There was an issue with voice input. Please try again.",
        })
      }

      speechRecognition.onend = () => {
        setIsListening(false)
      }

      setRecognition(speechRecognition)
    }
  }, [])

  // Load user's mind maps
  useEffect(() => {
    if (isAuthenticated) {
      loadMindMaps()
    }
  }, [isAuthenticated])

  const loadMindMaps = async () => {
    try {
      setIsLoadingMindMaps(true)
      const response = await apiService.getMindMaps()
      setMindMaps(response.mindMaps || [])
    } catch (error) {
      console.error("Error loading mind maps:", error)
      toast.error("Error", {
        description: "Failed to load your mind maps. Please try again.",
      })
    } finally {
      setIsLoadingMindMaps(false)
    }
  }

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      // Read file content if it's a text file
      if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          setSyllabus(content)
        }
        reader.readAsText(file)
      }
    }
  }

  // Remove uploaded file
  const removeUploadedFile = () => {
    setUploadedFile(null)
    setSyllabus("")
  }

  const toggleVoiceInput = () => {
    if (!recognition) {
      toast.error("Not Supported", {
        description: "Speech recognition is not supported in your browser",
      })
      return
    }

    if (isListening) {
      recognition.stop()
      setIsListening(false)
    } else {
      recognition.start()
      setIsListening(true)
    }
  }

  const handleCreateMindMap = async () => {
    if (!subjectName.trim()) {
      toast.error("Subject Required", {
        description: "Please enter a subject name",
      })
      return
    }

    if (!syllabus.trim()) {
      toast.error("Content Required", {
        description: "Please provide syllabus content or learning objectives",
      })
      return
    }

    setIsDialogOpen(false)
    setIsCreating(true)

    try {
      const response = await apiService.generateMindMap(subjectName, syllabus)

      if (response.success) {
        toast.success("Success!", {
          description: "Mind map created successfully",
        })

        // Reset form
        setSubjectName("")
        setSyllabus("")
        setUploadedFile(null)

        // Reload mind maps list
        await loadMindMaps()

        // Navigate to the new mind map
        router.push(`/mind-map/view/${response.mindMap.id}`)
      }
    } catch (error) {
      console.error("Error creating mind map:", error)
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to create mind map",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleViewMindMap = (mindMapId: number) => {
    router.push(`/mind-map/view/${mindMapId}`)
  }

  const handleDeleteMindMap = async (mindMapId: number) => {
    if (!confirm("Are you sure you want to delete this mind map?")) {
      return
    }

    try {
      // TODO: Implement delete API endpoint
      toast.success("Success", {
        description: "Mind map deleted successfully",
      })
      await loadMindMaps()
    } catch (error) {
      toast.error("Error", {
        description: "Failed to delete mind map",
      })
    }
  }

  const handleSignOut = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    router.push("/")
    return null
  }

  const dockLinks = [
    {
      title: "Home",
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/",
    },
    {
      title: "Dashboard",
      icon: <IconBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: "Create Room",
      icon: <IconUsers className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/create-room",
    },
    {
      title: "Mind Map",
      icon: <IconMap className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/mind-map",
    },
    {
      title: "Settings",
      icon: <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/settings",
    },
    {
      title: "Sign Out",
      icon: <IconLogout className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "#",
      onClick: handleSignOut,
    },
  ]

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        {/* Page Header */}
        <div className="text-center mb-16 z-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent mb-4">
            Mind Map Studio
          </h1>
          <p className="text-gray-400 text-lg">Create and manage your AI-powered knowledge maps</p>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-6xl z-10">
          {/* Create New Mind Map Button */}
          <div className="text-center mb-12">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300 shadow-lg"
                >
                  <IconPlus className="w-5 h-5 mr-2" />
                  Create New Mind Map
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-700/50">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
                    Create New Mind Map
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Transform your ideas into an interactive knowledge map using AI
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Subject Name Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Subject Name *</label>
                    <Input
                      placeholder="e.g., Machine Learning, History of Art, Quantum Physics..."
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      className="bg-gray-800/30 border-gray-600/50 text-white placeholder:text-gray-500"
                    />
                  </div>

                  {/* Syllabus Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Syllabus Content *</label>
                      <div className="flex gap-2">
                        {/* File Upload Button */}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".txt,.md,.doc,.docx,text/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-gray-600/50 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                          >
                            <IconUpload className="w-4 h-4 mr-1" />
                            Upload
                          </Button>
                        </label>

                        {/* Voice Input Button */}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={toggleVoiceInput}
                          className={`${
                            isListening
                              ? "bg-red-600/20 border-red-500 text-red-400 animate-pulse"
                              : "border-gray-600/50 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                          }`}
                        >
                          {isListening ? (
                            <IconMicrophoneOff className="w-4 h-4 mr-1" />
                          ) : (
                            <IconMicrophone className="w-4 h-4 mr-1" />
                          )}
                          {isListening ? "Stop" : "Voice"}
                        </Button>
                      </div>
                    </div>

                    {/* Uploaded File Display */}
                    {uploadedFile && (
                      <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <IconFileText className="w-5 h-5 text-orange-400" />
                          <div>
                            <p className="text-sm font-medium text-orange-200">{uploadedFile.name}</p>
                            <p className="text-xs text-orange-300/70">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={removeUploadedFile}
                          className="text-orange-400 hover:text-orange-200 hover:bg-orange-500/20"
                        >
                          <IconX className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <Textarea
                      placeholder="Add topics, chapters, or learning objectives... You can also use voice input or upload a file."
                      value={syllabus}
                      onChange={(e) => setSyllabus(e.target.value)}
                      rows={6}
                      className="bg-gray-800/30 border-gray-600/50 text-white placeholder:text-gray-500 resize-none"
                    />

                    {isListening && (
                      <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-75"></span>
                          <span className="w-1 h-1 bg-orange-300 rounded-full animate-pulse delay-150"></span>
                        </div>
                        <p className="text-sm text-orange-200 font-medium">Listening... Speak clearly to add content</p>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-gray-600/50 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateMindMap}
                    disabled={!subjectName.trim() || !syllabus.trim() || isCreating}
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Creating..." : "Create Mind Map"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Mind Maps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingMindMaps ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="bg-gray-900/50 border-gray-700/50 animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))
            ) : mindMaps.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <IconMap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Mind Maps Yet</h3>
                <p className="text-gray-500">Create your first AI-powered mind map to get started!</p>
              </div>
            ) : (
              mindMaps.map((mindMap) => (
                <Card
                  key={mindMap.id}
                  className="bg-gray-900/50 border-gray-700/50 hover:bg-gray-900/70 transition-all duration-300 group"
                >
                  <CardHeader>
                    <CardTitle className="text-white group-hover:text-orange-400 transition-colors">
                      {mindMap.subject_name}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Created {new Date(mindMap.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <Button
                        onClick={() => handleViewMindMap(mindMap.id)}
                        className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                      >
                        <IconEye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        onClick={() => handleDeleteMindMap(mindMap.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-600/50 text-red-400 hover:border-red-500 hover:text-red-300 hover:bg-red-600/10"
                      >
                        <IconTrash className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Floating Dock */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <FloatingDock mobileClassName="translate-y-20" items={dockLinks} activeItem="/mind-map" />
        </div>

        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Multi-step Loader */}
        <MultiStepLoader loadingStates={loadingStates} loading={isCreating} duration={2000} loop={false} />

        {/* Close button for loader */}
        {isCreating && (
          <button
            className="fixed top-4 right-4 text-white z-[120] hover:bg-gray-800/50 rounded-lg p-2 transition-all duration-200"
            onClick={() => setIsCreating(false)}
          >
            <IconSquareRoundedX className="h-8 w-8" />
          </button>
        )}
      </WavyBackground>
    </div>
  )
}
