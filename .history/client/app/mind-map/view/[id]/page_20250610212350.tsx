"use client"
import type React from "react"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiService } from "@/lib/api"
import { FloatingDock } from "@/components/ui/floating-dock"
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type NodeProps,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconX,
  IconLoader2,
  IconChevronRight,
  IconChevronDown,
  IconCircle,
  IconCircleCheck,
  IconPlayerPlay,
  IconPlayerPause,
} from "@tabler/icons-react"

// Define the data structure for the custom node
type CustomNodeData = {
  label: string
  expanded?: boolean
  hasChildren?: boolean
  isRoot?: boolean
  isRead?: boolean
  parentNode?: string
  isSelected?: boolean
  content?: string
  onToggleReadStatus?: (nodeId: string) => void
  onNodeClick?: (nodeId: string) => void
}

// Custom node component
const CustomNode = ({ data, id }: NodeProps) => {
  const { setNodes, getNodes, setCenter, getZoom } = useReactFlow()
  const nodeData = data as CustomNodeData

  const handleNodeClick = useCallback(() => {
    if (nodeData.onNodeClick) {
      nodeData.onNodeClick(id)
    }
  }, [nodeData, id])

  const getNodeStyle = () => {
    if (nodeData.isRoot) {
      return "bg-blue-600 border-blue-500 text-white font-semibold"
    }
    if (nodeData.isSelected) {
      return "bg-orange-600 border-orange-500 text-white font-medium"
    }
    return "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
  }

  return (
    <div
      className={cn(
        "px-4 py-2 rounded-lg border-2 cursor-pointer transition-all duration-200 min-w-32 text-center",
        getNodeStyle(),
      )}
      onClick={handleNodeClick}
    >
      <div className="text-sm">{nodeData.label}</div>
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-gray-400" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-gray-400" />
    </div>
  )
}

const nodeTypes = {
  customNode: CustomNode,
}

// Topic Tree Item Component
interface TopicTreeItemProps {
  node: any
  level: number
  isExpanded: boolean
  isRead: boolean
  onToggleExpand: (nodeId: string) => void
  onToggleRead: (nodeId: string) => void
  onSelectNode: (nodeId: string) => void
  selectedNode: string | null
  children?: any[]
}

const TopicTreeItem: React.FC<TopicTreeItemProps> = ({
  node,
  level,
  isExpanded,
  isRead,
  onToggleExpand,
  onToggleRead,
  onSelectNode,
  selectedNode,
  children = [],
}) => {
  const hasChildren = children.length > 0
  const isSelected = selectedNode === node.id

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 group",
          isSelected ? "bg-orange-600/20 border border-orange-600/30" : "hover:bg-gray-800/50",
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelectNode(node.id)}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.id)
            }}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            {isExpanded ? (
              <IconChevronDown className="h-3 w-3 text-gray-400" />
            ) : (
              <IconChevronRight className="h-3 w-3 text-gray-400" />
            )}
          </button>
        )}

        {/* Read Status Indicator */}
        {!node.isRoot && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleRead(node.id)
            }}
            className="transition-colors"
          >
            {isRead ? (
              <IconCircleCheck className="h-4 w-4 text-green-500" />
            ) : (
              <IconCircle className="h-4 w-4 text-gray-500 hover:text-gray-400" />
            )}
          </button>
        )}

        {/* Node Label */}
        <span
          className={cn(
            "text-sm flex-1 truncate",
            isSelected ? "text-orange-300 font-medium" : "text-gray-300",
            node.isRoot && "font-semibold text-blue-300",
          )}
        >
          {node.label}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-2">
          {children.map((child) => (
            <TopicTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              isExpanded={isExpanded}
              isRead={isRead}
              onToggleExpand={onToggleExpand}
              onToggleRead={onToggleRead}
              onSelectNode={onSelectNode}
              selectedNode={selectedNode}
              children={[]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MindMapView() {
  const router = useRouter()
  const params = useParams()
  const { user, loading, isAuthenticated, logout } = useAuth()

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

  return (
    <ReactFlowProvider>
      <MindMapContent mindMapId={params.id as string} />
    </ReactFlowProvider>
  )
}

function MindMapContent({ mindMapId }: { mindMapId: string }) {
  const router = useRouter()
  const { logout } = useAuth()
  const { getNodes, setCenter, getZoom, fitView } = useReactFlow()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Mind map data state
  const [mindMapData, setMindMapData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // UI state
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]))
  const [topicsReadStatus, setTopicsReadStatus] = useState<Record<string, boolean>>({})

  // Audio state
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string
      type: "user" | "ai"
      content: string
      timestamp: Date
    }>
  >([])
  const [isAiTyping, setIsAiTyping] = useState(false)

  // Load mind map data
  useEffect(() => {
    loadMindMapData()
  }, [mindMapId])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [currentAudioUrl])

  const loadMindMapData = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.getMindMap(mindMapId)

      if (response.success && response.mindMap) {
        const mindMap = response.mindMap
        setMindMapData(mindMap.mindmap_data)

        // Initialize read status
        const initialReadStatus: Record<string, boolean> = {}
        if (mindMap.mindmap_data?.nodes) {
          mindMap.mindmap_data.nodes.forEach((node: any) => {
            initialReadStatus[node.id] = false
          })
        }
        setTopicsReadStatus(initialReadStatus)

        // Auto-select root node
        setSelectedNode("root")

        toast.success("Mind Map Loaded", {
          description: "Your AI-generated mind map is ready for exploration!",
        })
      }
    } catch (error) {
      console.error("Error loading mind map:", error)
      toast.error("Error", {
        description: "Failed to load mind map. Please try again.",
      })
      router.push("/mind-map")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle audio generation and playback
  const handleGenerateAudio = useCallback(async () => {
    if (!selectedNode || !mindMapData?.nodes) return

    const selectedNodeData = mindMapData.nodes.find((node: any) => node.id === selectedNode)
    if (!selectedNodeData?.content) {
      toast.error("No Content", {
        description: "No content available for audio generation",
      })
      return
    }

    try {
      setIsGeneratingAudio(true)

      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause()
        setIsPlayingAudio(false)
      }

      // Clean up previous audio URL
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl)
        setCurrentAudioUrl(null)
      }

      toast.info("Generating Audio", {
        description: "Creating audio for the selected topic...",
      })

      // Generate audio using ElevenLabs
      const audioBlob = await apiService.generateAudio(selectedNodeData.content)

      // Create object URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob)
      setCurrentAudioUrl(audioUrl)

      // Create and setup audio element
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onloadeddata = () => {
        toast.success("Audio Ready", {
          description: "Audio generated successfully! Click play to listen.",
        })
      }

      audio.onplay = () => {
        setIsPlayingAudio(true)
      }

      audio.onpause = () => {
        setIsPlayingAudio(false)
      }

      audio.onended = () => {
        setIsPlayingAudio(false)
      }

      audio.onerror = (e) => {
        console.error("Audio playback error:", e)
        toast.error("Playback Error", {
          description: "Failed to play audio. Please try again.",
        })
        setIsPlayingAudio(false)
      }

      // Auto-play the audio
      audio.play().catch((error) => {
        console.error("Auto-play failed:", error)
        toast.info("Audio Ready", {
          description: "Audio is ready. Click the play button to listen.",
        })
      })
    } catch (error) {
      console.error("Error generating audio:", error)
      toast.error("Audio Generation Failed", {
        description: error instanceof Error ? error.message : "Failed to generate audio",
      })
    } finally {
      setIsGeneratingAudio(false)
    }
  }, [selectedNode, mindMapData, currentAudioUrl])

  // Handle audio play/pause
  const handleToggleAudio = useCallback(() => {
    if (!audioRef.current) {
      handleGenerateAudio()
      return
    }

    if (isPlayingAudio) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((error) => {
        console.error("Audio play error:", error)
        toast.error("Playback Error", {
          description: "Failed to play audio. Please try again.",
        })
      })
    }
  }, [isPlayingAudio, handleGenerateAudio])

  // Handle node selection
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId)

      // Stop current audio when switching nodes
      if (audioRef.current) {
        audioRef.current.pause()
        setIsPlayingAudio(false)
      }

      const nodes = getNodes()
      const selectedNodeData = nodes.find((node) => node.id === nodeId)
      if (selectedNodeData) {
        setCenter(selectedNodeData.position.x, selectedNodeData.position.y, { zoom: getZoom(), duration: 800 })
      }
    },
    [getNodes, setCenter, getZoom],
  )

  // Handle expand/collapse
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  // Handle read status toggle
  const handleToggleReadStatus = useCallback((nodeId: string) => {
    setTopicsReadStatus((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }))
  }, [])

  // Create nodes for ReactFlow
  const flowNodes = useMemo(() => {
    if (!mindMapData?.nodes) return []

    return mindMapData.nodes.map((node: any, index: number) => ({
      id: node.id,
      type: "customNode",
      position: node.position || {
        x: index === 0 ? 400 : 200 + (index % 3) * 200,
        y: index === 0 ? 300 : 200 + Math.floor(index / 3) * 150,
      },
      data: {
        label: node.label,
        isRoot: node.type === "root",
        isSelected: selectedNode === node.id,
        content: node.content,
        onNodeClick: handleNodeClick,
      },
      hidden: false, // Show all nodes
    }))
  }, [mindMapData, selectedNode, handleNodeClick])

  // Create edges for ReactFlow
  const flowEdges = useMemo(() => {
    if (!mindMapData?.edges) return []

    return mindMapData.edges.map((edge: any) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      style: { stroke: "#6b7280", strokeWidth: 2 },
      markerEnd: { type: "arrowclosed", color: "#6b7280" },
    }))
  }, [mindMapData])

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges)

  // Update nodes when data changes
  useEffect(() => {
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [flowNodes, flowEdges, setNodes, setEdges])

  // Auto-fit view when nodes load
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 50, duration: 1000 })
      }, 500)
    }
  }, [nodes.length, fitView])

  // Calculate progress
  const totalTopics = mindMapData?.nodes?.filter((node: any) => node.type !== "root").length || 0
  const completedTopics = Object.values(topicsReadStatus).filter(Boolean).length
  const progressPercentage = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0

  // Build hierarchical tree structure
  const buildTreeStructure = useCallback(() => {
    if (!mindMapData?.nodes) return []

    const nodeMap = new Map()
    mindMapData.nodes.forEach((node: any) => {
      nodeMap.set(node.id, { ...node, children: [] })
    })

    const rootNodes: any[] = []
    mindMapData.nodes.forEach((node: any) => {
      if (node.parent && nodeMap.has(node.parent)) {
        nodeMap.get(node.parent).children.push(nodeMap.get(node.id))
      } else {
        rootNodes.push(nodeMap.get(node.id))
      }
    })

    return rootNodes
  }, [mindMapData])

  const treeStructure = buildTreeStructure()

  // Handle AI chat
  const handleChatSubmit = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return

      const userMsgId = Date.now().toString()
      setChatMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          type: "user",
          content: userMessage,
          timestamp: new Date(),
        },
      ])

      setIsAiTyping(true)

      try {
        const selectedNodeData = mindMapData?.nodes?.find((node: any) => node.id === selectedNode)
        const context = selectedNodeData
          ? `Current topic: ${selectedNodeData.label}\nTopic content: ${selectedNodeData.content || "No specific content available"}`
          : ""

        const response = await apiService.chatWithGroq(userMessage, context, mindMapData?.title || "Learning Topic")

        const aiMsgId = (Date.now() + 1).toString()
        setChatMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            type: "ai",
            content: response.response,
            timestamp: new Date(),
          },
        ])
      } catch (error) {
        console.error("Error generating AI response:", error)
        const errorMsgId = (Date.now() + 1).toString()
        setChatMessages((prev) => [
          ...prev,
          {
            id: errorMsgId,
            type: "ai",
            content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
            timestamp: new Date(),
          },
        ])
      } finally {
        setIsAiTyping(false)
      }
    },
    [selectedNode, mindMapData],
  )

  const handleSignOut = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 text-white animate-spin" />
          <div className="text-white text-xl">Loading your AI-generated mind map...</div>
        </div>
      </div>
    )
  }

  if (!mindMapData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Mind map not found</div>
          <Button onClick={() => router.push("/mind-map")}>Back to Mind Maps</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black flex">
      {/* Left Sidebar - Topic Tree */}
      <div className="w-80 bg-gray-900 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <span className="text-white font-medium">Mind Map Topics</span>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Learning Progress</span>
              <span className="text-white">
                {completedTopics} of {totalTopics} topics
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        {/* Topic Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {treeStructure.map((rootNode) => (
            <TopicTreeItem
              key={rootNode.id}
              node={rootNode}
              level={0}
              isExpanded={expandedNodes.has(rootNode.id)}
              isRead={topicsReadStatus[rootNode.id] || false}
              onToggleExpand={handleToggleExpand}
              onToggleRead={handleToggleReadStatus}
              onSelectNode={handleNodeClick}
              selectedNode={selectedNode}
              children={rootNode.children || []}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-gray-900/50">
          <h1 className="text-2xl font-bold text-white">{mindMapData.title || "Mind Map"}</h1>
          <p className="text-gray-400 mt-1">Interactive learning visualization</p>
        </div>

        {/* ReactFlow */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            className="bg-black"
            fitView
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { strokeWidth: 2, stroke: "#6b7280" },
              markerEnd: { type: "arrowclosed", color: "#6b7280" },
            }}
          >
            <Controls className="bg-gray-800 text-white border-gray-700" />
            <Background color="#374151" gap={20} size={1} variant="dots" />
          </ReactFlow>
        </div>
      </div>

      {/* Right Sidebar - Topic Details */}
      {selectedNode && (
        <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Topic Details</h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleToggleAudio}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
                disabled={isGeneratingAudio}
              >
                {isGeneratingAudio ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                ) : isPlayingAudio ? (
                  <IconPlayerPause className="h-4 w-4" />
                ) : (
                  <IconPlayerPlay className="h-4 w-4" />
                )}
                <span className="ml-2">{isGeneratingAudio ? "Generating..." : isPlayingAudio ? "Pause" : "Audio"}</span>
              </Button>
              <Button
                onClick={() => setSelectedNode(null)}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Selected Node Info */}
          <div className="p-4 border-b border-gray-700">
            <div className="bg-gray-800 px-3 py-1 rounded-full inline-block">
              <span className="text-sm text-gray-300">{selectedNode}</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Topic Content */}
              {mindMapData.nodes?.find((node: any) => node.id === selectedNode)?.content ? (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {mindMapData.nodes.find((node: any) => node.id === selectedNode)?.content}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2"></div>
                  </div>
                  <p className="text-gray-500 text-sm mt-3 italic">
                    Detailed content for this topic will be loaded here from the backend...
                  </p>
                </div>
              )}

              {/* Chat Messages */}
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`${
                    message.type === "user" ? "bg-orange-900/30 border-orange-600/30" : "bg-gray-800 border-gray-600"
                  } border rounded-lg p-4`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-medium ${message.type === "user" ? "text-orange-400" : "text-blue-400"}`}
                    >
                      {message.type === "user" ? "You" : "AI Assistant"}
                    </span>
                    <span className="text-xs text-gray-400">{message.timestamp.toLocaleTimeString()}</span>
                  </div>
                  {message.type === "ai" ? (
                    <TextGenerateEffect words={message.content} />
                  ) : (
                    <p className="text-gray-300">{message.content}</p>
                  )}
                </div>
              ))}

              {/* AI Typing Indicator */}
              {isAiTyping && (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400">AI is generating response...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Input */}
          <div className="p-4 border-t border-gray-700">
            <PlaceholdersAndVanishInput
              placeholders={["What should I focus on learning?", "Explain this topic in detail", "How does this work?"]}
              onChange={() => {}}
              onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault()
                const form = e.currentTarget
                const input = form.querySelector("input") as HTMLInputElement
                const message = input?.value
                if (message?.trim()) {
                  handleChatSubmit(message)
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Floating Dock */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <FloatingDock mobileClassName="translate-y-20" items={dockLinks} activeItem="/mind-map" />
      </div>
    </div>
  )
}
