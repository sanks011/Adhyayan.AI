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
  Background,
  useNodesState,
  useEdgesState,
  type NodeProps,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  MiniMap,
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
  IconPlayerPause,
  IconMicrophone,
  IconHeadphones,
  IconPlus,
  IconZoomIn,
  IconZoomOut,
  IconArrowsMaximize,
  IconEye,
  IconEyeOff,
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
  childrenCount?: number
  onToggleExpand?: (nodeId: string) => void
  onNodeClick?: (nodeId: string) => void
  nodeType?: string
}

// Custom node component with modern design
const CustomNode = ({ data, id }: NodeProps) => {
  const { setNodes, getNodes, setCenter, getZoom } = useReactFlow()
  const nodeData = data as CustomNodeData

  const handleNodeClick = useCallback(() => {
    if (nodeData.onNodeClick) {
      nodeData.onNodeClick(id)
    }
  }, [nodeData, id])

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (nodeData.onToggleExpand) {
        nodeData.onToggleExpand(id)
      }
    },
    [nodeData, id],
  )

  const getNodeStyle = () => {
    if (nodeData.isRoot) {
      return "bg-[#1a1a2e] border-[#0f3460] text-white shadow-[0_0_10px_rgba(15,52,96,0.6)]"
    }
    if (nodeData.nodeType === "overview") {
      return "bg-[#1a1a2e] border-[#16a34a] text-white shadow-[0_0_10px_rgba(22,163,74,0.5)]"
    }
    if (nodeData.nodeType === "factors") {
      return "bg-[#1a1a2e] border-[#6b7280] text-white shadow-[0_0_8px_rgba(107,114,128,0.4)]"
    }
    if (nodeData.nodeType === "products") {
      return "bg-[#1a1a2e] border-[#16a34a] text-white shadow-[0_0_10px_rgba(22,163,74,0.5)]"
    }
    if (nodeData.nodeType === "reactions") {
      return "bg-[#1a1a2e] border-[#6b7280] text-white shadow-[0_0_8px_rgba(107,114,128,0.4)]"
    }
    if (nodeData.isSelected) {
      return "bg-[#1a1a2e] border-[#16a34a] text-white shadow-[0_0_10px_rgba(22,163,74,0.5)]"
    }
    return "bg-[#1a1a2e] border-[#6b7280] text-white shadow-[0_0_8px_rgba(107,114,128,0.4)]"
  }

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-md border-2 cursor-pointer transition-all duration-200 min-w-40 flex items-center justify-between",
        getNodeStyle(),
      )}
      onClick={handleNodeClick}
    >
      <div className="text-sm font-medium truncate max-w-[80%]">{nodeData.label}</div>
      {nodeData.childrenCount && nodeData.childrenCount > 0 ? (
        <button
          onClick={handleToggleExpand}
          className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center transition-colors",
            "bg-white/10 hover:bg-white/20",
          )}
        >
          <IconPlus className="w-3 h-3 text-white" />
        </button>
      ) : null}

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
          isSelected ? "bg-green-600/20 border border-green-600/30" : "hover:bg-gray-800/50",
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
            isSelected ? "text-green-300 font-medium" : "text-gray-300",
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
  const { getNodes, setCenter, getZoom, fitView, zoomIn, zoomOut } = useReactFlow()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Mind map data state
  const [mindMapData, setMindMapData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // UI state
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]))
  const [topicsReadStatus, setTopicsReadStatus] = useState<Record<string, boolean>>({})
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set(["root"]))
  const [showMiniMap, setShowMiniMap] = useState(true)

  // Audio state - Track audio per node
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioCache, setAudioCache] = useState<Record<string, string>>({}) // nodeId -> audioUrl

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
      // Clean up all cached audio URLs
      Object.values(audioCache).forEach((url) => {
        URL.revokeObjectURL(url)
      })
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [audioCache])

  // Clean up audio when switching nodes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
    }
  }, [selectedNode])

  // Assign node types based on content or position
  const assignNodeTypes = (nodes: any[]) => {
    if (!nodes) return []

    // Find the root node
    const rootNode = nodes.find((node) => node.type === "root" || node.id === "root")
    if (!rootNode) return nodes

    // Create a map of node types
    const nodeTypeMap: Record<string, string> = {
      [rootNode.id]: "root",
    }

    // Assign types to first level children
    const firstLevelChildren = nodes.filter((node) => node.parent === rootNode.id)

    firstLevelChildren.forEach((node, index) => {
      if (node.label.toLowerCase().includes("overview")) {
        nodeTypeMap[node.id] = "overview"
      } else if (node.label.toLowerCase().includes("factor")) {
        nodeTypeMap[node.id] = "factors"
      } else if (node.label.toLowerCase().includes("product")) {
        nodeTypeMap[node.id] = "products"
      } else if (node.label.toLowerCase().includes("reaction")) {
        nodeTypeMap[node.id] = "reactions"
      } else if (index % 3 === 0) {
        nodeTypeMap[node.id] = "overview"
      } else if (index % 3 === 1) {
        nodeTypeMap[node.id] = "factors"
      } else {
        nodeTypeMap[node.id] = "products"
      }

      // Assign types to second level children
      const secondLevelChildren = nodes.filter((n) => n.parent === node.id)
      secondLevelChildren.forEach((childNode) => {
        nodeTypeMap[childNode.id] = nodeTypeMap[node.id]
      })
    })

    return nodes.map((node) => ({
      ...node,
      nodeType: nodeTypeMap[node.id] || "default",
    }))
  }

  const loadMindMapData = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.getMindMap(mindMapId)

      if (response.success && response.mindMap) {
        const mindMap = response.mindMap

        // Process the mind map data to assign node types
        const processedData = {
          ...mindMap.mindmap_data,
          nodes: assignNodeTypes(mindMap.mindmap_data.nodes),
        }

        setMindMapData(processedData)

        // Initialize read status
        const initialReadStatus: Record<string, boolean> = {}
        if (processedData?.nodes) {
          processedData.nodes.forEach((node: any) => {
            initialReadStatus[node.id] = false
          })
        }
        setTopicsReadStatus(initialReadStatus)

        // Auto-select root node
        setSelectedNode("root")
        setVisibleNodes(new Set(["root"]))

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

  // Handle podcast-style audio generation
  const handleGenerateAudio = useCallback(async () => {
    if (!selectedNode || !mindMapData?.nodes) return

    const selectedNodeData = mindMapData.nodes.find((node: any) => node.id === selectedNode)
    if (!selectedNodeData?.content) {
      toast.error("No Content", {
        description: "No content available for podcast generation",
      })
      return
    }

    try {
      setIsGeneratingAudio(true)

      toast.info("Creating Podcast", {
        description: "Generating podcast-style audio for this topic...",
        duration: 5000,
      })

      // Generate podcast-style audio using enhanced API
      const audioBlob = await apiService.generateAudio(
        selectedNodeData.content,
        "21m00Tcm4TlvDq8ikWAM", // Rachel voice - great for podcasts
        selectedNodeData.label, // Pass topic title for better script generation
      )

      // Create object URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob)

      // Cache the audio URL for this node
      setAudioCache((prev) => ({
        ...prev,
        [selectedNode]: audioUrl,
      }))

      toast.success("Podcast Ready! 🎧", {
        description: "Your personalized learning podcast is ready to play!",
        duration: 4000,
      })
    } catch (error) {
      console.error("Error generating podcast audio:", error)
      toast.error("Podcast Generation Failed", {
        description: error instanceof Error ? error.message : "Failed to generate podcast audio",
      })
    } finally {
      setIsGeneratingAudio(false)
    }
  }, [selectedNode, mindMapData])

  // Handle audio play/pause
  const handleToggleAudio = useCallback(() => {
    if (!selectedNode) return

    const currentAudioUrl = audioCache[selectedNode]

    // If no audio exists for this node, generate it
    if (!currentAudioUrl) {
      handleGenerateAudio()
      return
    }

    // If audio is currently playing, pause it
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause()
      return
    }

    // If we have audio but no audio element, or the audio element has a different source, create new one
    if (!audioRef.current || audioRef.current.src !== currentAudioUrl) {
      // Clean up previous audio element
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      // Create new audio element
      const audio = new Audio(currentAudioUrl)
      audioRef.current = audio

      audio.onplay = () => {
        setIsPlayingAudio(true)
        toast.success("🎧 Podcast Playing", {
          description: "Enjoy your personalized learning experience!",
          duration: 2000,
        })
      }

      audio.onpause = () => {
        setIsPlayingAudio(false)
      }

      audio.onended = () => {
        setIsPlayingAudio(false)
        toast.info("Podcast Complete", {
          description: "Ready to explore the next topic?",
          duration: 3000,
        })
      }

      audio.onerror = (e) => {
        console.error("Audio playback error:", e)
        toast.error("Playback Error", {
          description: "Failed to play podcast. Please try regenerating.",
        })
        setIsPlayingAudio(false)
      }
    }

    // Play the audio
    audioRef.current.play().catch((error) => {
      console.error("Audio play error:", error)
      toast.error("Playback Error", {
        description: "Failed to play podcast. Please try again.",
      })
    })
  }, [selectedNode, audioCache, isPlayingAudio, handleGenerateAudio])

  // Get children for a node
  const getChildrenForNode = useCallback(
    (nodeId: string) => {
      if (!mindMapData?.nodes) return []

      return mindMapData.nodes.filter((node: any) => node.parent === nodeId)
    },
    [mindMapData],
  )

  // Handle node expansion
  const handleToggleExpand = useCallback(
    (nodeId: string) => {
      // Toggle expanded state
      setExpandedNodes((prev) => {
        const newSet = new Set(prev)
        const wasExpanded = newSet.has(nodeId)

        if (wasExpanded) {
          newSet.delete(nodeId)

          // When collapsing, remove all children from visible nodes
          const childrenToHide = getChildrenForNode(nodeId).map((node) => node.id)
          setVisibleNodes((prev) => {
            const newVisible = new Set(prev)
            childrenToHide.forEach((id) => newVisible.delete(id))
            return newVisible
          })
        } else {
          newSet.add(nodeId)

          // When expanding, add direct children to visible nodes
          const childrenToShow = getChildrenForNode(nodeId).map((node) => node.id)
          setVisibleNodes((prev) => {
            const newVisible = new Set(prev)
            childrenToShow.forEach((id) => newVisible.add(id))
            return newVisible
          })
        }

        return newSet
      })
    },
    [getChildrenForNode],
  )

  // Handle node selection
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId)

      const nodes = getNodes()
      const selectedNodeData = nodes.find((node) => node.id === nodeId)
      if (selectedNodeData) {
        setCenter(selectedNodeData.position.x, selectedNodeData.position.y, { zoom: getZoom(), duration: 800 })
      }
    },
    [getNodes, setCenter, getZoom],
  )

  // Handle read status toggle
  const handleToggleReadStatus = useCallback((nodeId: string) => {
    setTopicsReadStatus((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }))
  }, [])

  // Create a horizontal tree layout
  const createHorizontalTreeLayout = useCallback((nodes: any[]) => {
    if (!nodes || nodes.length === 0) return nodes

    // Find the root node
    const rootNode = nodes.find((node) => node.type === "root" || node.id === "root")
    if (!rootNode) return nodes

    // Set root position
    rootNode.position = { x: 150, y: 300 }

    // Create a map for quick node lookup
    const nodeMap = new Map()
    nodes.forEach((node) => nodeMap.set(node.id, node))

    // Get direct children of root
    const firstLevelChildren = nodes.filter((node) => node.parent === rootNode.id)

    // Position first level children
    const levelSpacing = 250 // horizontal spacing between levels
    const nodeSpacing = 100 // vertical spacing between nodes

    firstLevelChildren.forEach((node, index) => {
      const yPos = 150 + index * nodeSpacing
      node.position = {
        x: rootNode.position.x + levelSpacing,
        y: yPos,
      }

      // Position second level children
      const secondLevelChildren = nodes.filter((n) => n.parent === node.id)
      secondLevelChildren.forEach((childNode, childIndex) => {
        childNode.position = {
          x: node.position.x + levelSpacing,
          y: yPos - ((secondLevelChildren.length - 1) * nodeSpacing) / 2 + childIndex * nodeSpacing,
        }
      })
    })

    return nodes
  }, [])

  // Create nodes for ReactFlow with horizontal tree layout
  const flowNodes = useMemo(() => {
    if (!mindMapData?.nodes) return []

    // Apply horizontal tree layout
    const layoutedNodes = createHorizontalTreeLayout([...mindMapData.nodes])

    return layoutedNodes
      .filter((node: any) => visibleNodes.has(node.id))
      .map((node: any) => {
        // Get children count for this node
        const childrenCount = mindMapData.nodes.filter((n: any) => n.parent === node.id).length

        return {
          id: node.id,
          type: "customNode",
          position: node.position || { x: 400, y: 300 },
          data: {
            label: node.label,
            isRoot: node.type === "root",
            isSelected: selectedNode === node.id,
            content: node.content,
            childrenCount: childrenCount,
            expanded: expandedNodes.has(node.id),
            isRead: topicsReadStatus[node.id] || false,
            onNodeClick: handleNodeClick,
            onToggleExpand: handleToggleExpand,
            nodeType: node.nodeType || "default",
          },
          hidden: !visibleNodes.has(node.id),
        }
      })
  }, [
    mindMapData,
    selectedNode,
    handleNodeClick,
    handleToggleExpand,
    visibleNodes,
    expandedNodes,
    topicsReadStatus,
    createHorizontalTreeLayout,
  ])

  // Create edges for ReactFlow with curved connections
  const flowEdges = useMemo(() => {
    if (!mindMapData?.edges) return []

    // Only show edges between visible nodes
    return mindMapData.edges
      .filter((edge) => visibleNodes.has(edge.source) && visibleNodes.has(edge.target))
      .map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: selectedNode === edge.source || selectedNode === edge.target,
        style: {
          stroke:
            selectedNode === edge.source || selectedNode === edge.target
              ? "#16a34a" // green-600
              : "#6b7280", // gray-500
          strokeWidth: selectedNode === edge.source || selectedNode === edge.target ? 2 : 1,
        },
        markerEnd: {
          type: "arrowclosed",
          color:
            selectedNode === edge.source || selectedNode === edge.target
              ? "#16a34a" // green-600
              : "#6b7280", // gray-500
        },
      }))
  }, [mindMapData, visibleNodes, selectedNode])

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges)

  // Update nodes when data changes
  useEffect(() => {
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [flowNodes, flowEdges, setNodes, setEdges])

  Auto-fit view when nodes load
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

  // Get current audio state for selected node
  const currentAudioUrl = selectedNode ? audioCache[selectedNode] : null
  const hasAudioForCurrentNode = !!currentAudioUrl

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
          <p className="text-gray-400 mt-1">Interactive learning visualization with podcast-style audio</p>
        </div>

        {/* ReactFlow */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            className="bg-black"
            fitView
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { strokeWidth: 1, stroke: "#6b7280" },
              markerEnd: { type: "arrowclosed", color: "#6b7280" },
            }}
          >
            <Background color="#1a1a2e" gap={20} size={1} variant="dots" />

            {showMiniMap && (
              <MiniMap
                nodeColor={(node) => {
                  if (node.data?.isRoot) return "#0f3460"
                  if (node.data?.nodeType === "overview") return "#16a34a"
                  if (node.data?.isSelected) return "#16a34a"
                  return "#4b5563"
                }}
                maskColor="rgba(0, 0, 0, 0.7)"
                className="bg-gray-900/80 border border-gray-700 rounded-lg"
              />
            )}

            <Panel position="top-right" className="flex flex-col gap-2">
              <div className="bg-gray-800/90 backdrop-blur-sm p-1 rounded-lg border border-gray-700 flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
                  onClick={() => zoomIn()}
                >
                  <IconZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
                  onClick={() => zoomOut()}
                >
                  <IconZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
                  onClick={() => fitView({ padding: 50, duration: 800 })}
                >
                  <IconArrowsMaximize className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
                  onClick={() => setShowMiniMap(!showMiniMap)}
                >
                  {showMiniMap ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                </Button>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Right Sidebar - Topic Details */}
      {selectedNode && (
        <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Learning Podcast</h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleToggleAudio}
                variant="outline"
                size="sm"
                className={cn(
                  "text-gray-300 hover:text-white transition-colors",
                  isPlayingAudio && "bg-green-600/20 border-green-500 text-green-400",
                  isGeneratingAudio && "bg-blue-600/20 border-blue-500 text-blue-400",
                )}
                disabled={isGeneratingAudio}
              >
                {isGeneratingAudio ? (
                  <>
                    <IconMicrophone className="h-4 w-4 animate-pulse mr-2" />
                    Creating Podcast...
                  </>
                ) : isPlayingAudio ? (
                  <>
                    <IconPlayerPause className="h-4 w-4 mr-2" />
                    Pause Podcast
                  </>
                ) : hasAudioForCurrentNode ? (
                  <>
                    <IconHeadphones className="h-4 w-4 mr-2" />
                    Play Podcast
                  </>
                ) : (
                  <>
                    <IconMicrophone className="h-4 w-4 mr-2" />
                    Generate Podcast
                  </>
                )}
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
            {hasAudioForCurrentNode && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                  <IconHeadphones className="h-3 w-3" />
                  Podcast Ready
                </span>
                {isPlayingAudio && (
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Playing
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Topic Content */}
              {mindMapData.nodes?.find((node: any) => node.id === selectedNode)?.content ? (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <IconMicrophone className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">Podcast Content</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {mindMapData.nodes.find((node: any) => node.id === selectedNode)?.content}
                  </p>
                  <div className="mt-3 p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                    <p className="text-xs text-blue-300">
                      💡 This content will be transformed into an engaging, conversational podcast when you generate
                      audio!
                    </p>
                  </div>
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
                    message.type === "user" ? "bg-green-900/30 border-green-600/30" : "bg-gray-800 border-gray-600"
                  } border rounded-lg p-4`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-medium ${message.type === "user" ? "text-green-400" : "text-blue-400"}`}
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
              placeholders={["Ask about this topic...", "How can I apply this?", "Can you explain more?"]}
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
