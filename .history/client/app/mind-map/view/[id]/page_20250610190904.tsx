"use client"
import type React from "react"
import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiService } from "@/lib/api"
import { FloatingDock } from "@/components/ui/floating-dock"
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
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
  IconPlus,
  IconMinus,
  IconX,
  IconLoader2,
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

// Custom node component for expandable/collapsible behavior
const CustomNode = ({ data, id }: NodeProps) => {
  const { setNodes, getNodes, setCenter, getZoom } = useReactFlow()
  const nodeData = data as CustomNodeData

  // Function to handle expand/collapse
  const toggleExpanded = useCallback(() => {
    const targetNodeId = id

    setNodes((nds) => {
      return nds.map((node) => {
        // Toggle the expanded state of clicked node
        if (node.id === targetNodeId) {
          return {
            ...node,
            data: { ...node.data, expanded: !node.data.expanded },
          }
        }

        // Show/hide child nodes based on parent's expanded state
        if (node.data.parentNode === targetNodeId) {
          const parentNode = nds.find((n) => n.id === targetNodeId)
          const newHidden = parentNode ? !parentNode.data.expanded : true
          return {
            ...node,
            hidden: newHidden,
          }
        }
        return node
      })
    })

    // Center view on the expanded area after a slight delay
    setTimeout(() => {
      const updatedNodes = getNodes()
      const expandedNode = updatedNodes.find((n) => n.id === targetNodeId)

      if (expandedNode && expandedNode.data.expanded) {
        const childNodes = updatedNodes.filter((n) => n.data.parentNode === targetNodeId && !n.hidden)

        if (childNodes.length > 0) {
          const childPositions = childNodes.map((n) => ({ x: n.position.x, y: n.position.y }))
          const avgX = childPositions.reduce((sum, pos) => sum + pos.x, 0) / childPositions.length
          const avgY = childPositions.reduce((sum, pos) => sum + pos.y, 0) / childPositions.length

          setCenter(avgX, avgY, { zoom: getZoom(), duration: 800 })
        } else {
          setCenter(expandedNode.position.x, expandedNode.position.y, { zoom: getZoom(), duration: 800 })
        }
      }
    }, 100)
  }, [id, setNodes, getNodes, setCenter, getZoom])

  // Function to toggle read status
  const toggleReadStatus = useCallback(() => {
    if (nodeData.isRoot) return

    if (nodeData.onToggleReadStatus) {
      nodeData.onToggleReadStatus(id)
    }
  }, [nodeData, id])

  // Function to handle node click for selection
  const handleNodeClick = useCallback(() => {
    if (nodeData.onNodeClick) {
      nodeData.onNodeClick(id)
    }
  }, [nodeData, id])

  // Determine border color based on read status and selection
  const getBorderColor = () => {
    if (nodeData.isSelected) return "border-white border-2"
    if (nodeData.isRoot) return "border-blue-500"
    return nodeData.isRead ? "border-green-500" : "border-neutral-700"
  }

  // Determine background color
  const getBackgroundColor = () => {
    if (nodeData.isRoot) return "bg-neutral-900"
    return nodeData.isRead ? "bg-neutral-800" : "bg-neutral-900"
  }

  return (
    <>
      {/* Expandable button for nodes with children */}
      {data.hasChildren && (
        <div
          className="absolute -left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center cursor-pointer"
          onClick={toggleExpanded}
          style={{ zIndex: 10 }}
        >
          {data.expanded ? <IconMinus className="h-3 w-3 text-white" /> : <IconPlus className="h-3 w-3 text-white" />}
        </div>
      )}

      {/* Main node container */}
      <div
        className={cn(
          "px-4 py-2 min-w-32 rounded-md flex items-center justify-center border cursor-pointer",
          getBorderColor(),
          getBackgroundColor(),
          nodeData.isRoot ? "font-semibold" : "font-normal",
        )}
        onClick={handleNodeClick}
      >
        {/* Read status indicator/toggle button for non-root nodes */}
        {!nodeData.isRoot && (
          <div
            className={cn(
              "absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/4 w-3 h-3 rounded-full flex items-center justify-center cursor-pointer",
              nodeData.isRead ? "bg-green-500" : "bg-neutral-700",
              "hover:opacity-80 transition-opacity border border-black",
            )}
            onClick={(e) => {
              e.stopPropagation()
              toggleReadStatus()
            }}
            title={nodeData.isRead ? "Mark as unread" : "Mark as read"}
            style={{ zIndex: 5 }}
          >
            {nodeData.isRead && <div className="h-1.5 w-1.5 bg-white rounded-full"></div>}
          </div>
        )}

        <div className="text-sm text-white">{nodeData.label}</div>
      </div>

      {/* Connection points */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-1 h-1 border-0 bg-transparent"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-1 h-1 border-0 bg-transparent"
        style={{ opacity: 0 }}
      />
    </>
  )
}

// Define the node types
const nodeTypes = {
  customNode: CustomNode,
}

export default function MindMapView() {
  const router = useRouter()
  const params = useParams()
  const { user, loading, isAuthenticated, logout } = useAuth()
  const { toast } = useToast()

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

// Separate component that uses ReactFlow hooks
function MindMapContent({ mindMapId }: { mindMapId: string }) {
  const router = useRouter()
  const { logout } = useAuth()
  const { toast } = useToast()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { getNodes, setCenter, getZoom } = useReactFlow()

  // Mind map data state
  const [mindMapData, setMindMapData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Track selected/focused node
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Track sidebar width for resizing
  const [sidebarWidth, setSidebarWidth] = useState(480)

  // Track chat messages for AI interaction
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string
      type: "user" | "ai"
      content: string
      timestamp: Date
    }>
  >([])
  const [isAiTyping, setIsAiTyping] = useState(false)

  // Track topic/subtopic read status
  const [topicsReadStatus, setTopicsReadStatus] = useState<Record<string, boolean>>({})

  // Load mind map data
  useEffect(() => {
    loadMindMapData()
  }, [mindMapId])

  const loadMindMapData = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.getMindMap(mindMapId)

      if (response.success && response.mindMap) {
        const mindMap = response.mindMap
        setMindMapData(mindMap.mindmap_data)

        // Initialize read status for all nodes
        const initialReadStatus: Record<string, boolean> = {}
        if (mindMap.mindmap_data?.nodes) {
          mindMap.mindmap_data.nodes.forEach((node: any) => {
            initialReadStatus[node.id] = false
          })
        }
        setTopicsReadStatus(initialReadStatus)

        toast({
          title: "Mind Map Loaded",
          description: "Your AI-generated mind map is ready for exploration!",
        })
      }
    } catch (error) {
      console.error("Error loading mind map:", error)
      toast({
        title: "Error",
        description: "Failed to load mind map. Please try again.",
        variant: "destructive",
      })
      router.push("/mind-map")
    } finally {
      setIsLoading(false)
    }
  }

  // Function to toggle read status of a node
  const handleToggleReadStatus = useCallback((nodeId: string) => {
    setTopicsReadStatus((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }))
  }, [])

  // Handle node click for selection and centering
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId)

      const nodes = getNodes()
      const selectedNodeData = nodes.find((node) => node.id === nodeId)
      if (selectedNodeData && !selectedNodeData.hidden) {
        setCenter(selectedNodeData.position.x, selectedNodeData.position.y, { zoom: getZoom(), duration: 800 })
      }
    },
    [getNodes, setCenter, getZoom],
  )

  // Create initial nodes and edges for React Flow from mind map data
  const initialNodes = useMemo(() => {
    if (!mindMapData?.nodes) return []

    const flowNodes: Node[] = []

    mindMapData.nodes.forEach((node: any) => {
      flowNodes.push({
        id: node.id,
        type: "customNode",
        position: node.position || { x: 0, y: 0 },
        data: {
          label: node.label,
          expanded: node.type === "root" ? true : false,
          hasChildren: node.children && node.children.length > 0,
          isRoot: node.type === "root",
          isRead: topicsReadStatus[node.id] || false,
          parentNode: node.parent,
          isSelected: selectedNode === node.id,
          content: node.content,
          onToggleReadStatus: handleToggleReadStatus,
          onNodeClick: handleNodeClick,
        },
        hidden: node.type === "root" ? false : true, // Initially hide non-root nodes
        draggable: true,
      })
    })

    return flowNodes
  }, [mindMapData, selectedNode, topicsReadStatus, handleToggleReadStatus, handleNodeClick])

  // Create initial edges from the mindMapData structure
  const initialEdges = useMemo(() => {
    if (!mindMapData?.edges) return []

    const flowEdges: Edge[] = []

    mindMapData.edges.forEach((edge: any) => {
      flowEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "bezier",
        animated: false,
        style: {
          stroke: "#333",
          strokeWidth: 1,
        },
        markerEnd: undefined,
        markerStart: undefined,
      })
    })

    return flowEdges
  }, [mindMapData])

  // Set up state hooks for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "bezier",
            animated: false,
            style: {
              stroke: "#333",
              strokeWidth: 1,
            },
            markerEnd: undefined,
            markerStart: undefined,
          },
          eds,
        ),
      )
    },
    [setEdges],
  )

  // Function to handle AI chat submission using Groq
  const handleChatSubmit = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return

      // Add user message to chat
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
        // Get context about the selected node
        const selectedNodeData = mindMapData?.nodes?.find((node: any) => node.id === selectedNode)
        const context = selectedNodeData
          ? `Current topic: ${selectedNodeData.label}\nTopic content: ${selectedNodeData.content || "No specific content available"}`
          : ""

        // Call backend API for Groq chat response
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

  // Function to get topic-specific placeholders for AI chat
  const getTopicPlaceholders = useCallback(
    (nodeId: string | null) => {
      if (!nodeId || !mindMapData?.nodes)
        return [
          "Tell me more about this topic",
          "What are the key concepts here?",
          "Can you explain this in simple terms?",
          "What should I focus on learning?",
          "How does this relate to the main subject?",
        ]

      const node = mindMapData.nodes.find((n: any) => n.id === nodeId)
      if (!node) return []

      return [
        `Explain ${node.label} in detail`,
        `What are the key points about ${node.label}?`,
        `How does ${node.label} work?`,
        `Give me examples of ${node.label}`,
        `What should I remember about ${node.label}?`,
      ]
    },
    [mindMapData],
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
      {/* Main content area with Mind Map visualization */}
      <div className="flex-1 h-full">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-neutral-700">
            <h1 className="text-2xl font-bold text-white">{mindMapData.title || "Mind Map"}</h1>
            <p className="text-neutral-400 mt-1">AI-powered interactive learning visualization</p>
          </div>

          {/* ReactFlow component */}
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              nodeTypes={nodeTypes}
              className="bg-black"
              nodesDraggable={true}
              zoomOnScroll={true}
              panOnScroll={true}
              defaultEdgeOptions={{
                type: "bezier",
                animated: false,
                style: { strokeWidth: 1, stroke: "#333" },
                markerEnd: undefined,
                markerStart: undefined,
              }}
            >
              <Controls className="bg-neutral-800 text-white border-neutral-700" />
              <Background color="#333" gap={16} size={1} />
            </ReactFlow>
          </div>
        </div>
      </div>

      {/* Right sidebar for detailed content */}
      {selectedNode && (
        <div
          className="h-full bg-neutral-900 border-l border-neutral-700 flex shadow-2xl relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Sidebar content */}
          <div className="flex-1 flex flex-col">
            {/* Content header */}
            <div className="p-6 border-b border-neutral-700 bg-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-white">Topic Details</h2>
                <Button
                  onClick={() => setSelectedNode(null)}
                  variant="ghost"
                  size="sm"
                  className="text-neutral-400 hover:text-white"
                >
                  <IconX className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-neutral-400 bg-neutral-700 px-3 py-1 rounded-full inline-block">
                {selectedNode}
              </p>
            </div>

            {/* Content area */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col">
              {/* Topic Content Section */}
              <div className="text-neutral-300 leading-relaxed space-y-4">
                {mindMapData.nodes?.find((node: any) => node.id === selectedNode)?.content ? (
                  <div className="bg-neutral-800 border border-neutral-600 rounded-lg p-4">
                    <p className="whitespace-pre-wrap">
                      {mindMapData.nodes.find((node: any) => node.id === selectedNode)?.content}
                    </p>
                  </div>
                ) : (
                  <div className="bg-neutral-800 border border-neutral-600 rounded-lg p-4">
                    <p className="text-neutral-400 italic">
                      No detailed content available for this topic. Ask the AI assistant below for more information.
                    </p>
                  </div>
                )}

                {/* Chat Messages */}
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`${
                      message.type === "user"
                        ? "bg-orange-900/30 border-orange-600/30"
                        : "bg-neutral-800 border-neutral-600"
                    } border rounded-lg p-4`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-medium ${
                          message.type === "user" ? "text-orange-400" : "text-blue-400"
                        }`}
                      >
                        {message.type === "user" ? "You" : "AI Assistant"}
                      </span>
                      <span className="text-xs text-neutral-400">{message.timestamp.toLocaleTimeString()}</span>
                    </div>
                    {message.type === "ai" ? (
                      <TextGenerateEffect words={message.content} />
                    ) : (
                      <p className="text-neutral-300">{message.content}</p>
                    )}
                  </div>
                ))}

                {/* AI Typing Indicator */}
                {isAiTyping && (
                  <div className="bg-neutral-800 border border-neutral-600 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-xs text-neutral-400">AI is generating response...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Input at bottom */}
              <div className="mt-6">
                <PlaceholdersAndVanishInput
                  placeholders={getTopicPlaceholders(selectedNode)}
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
