"use client";
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { FloatingDock } from "@/components/ui/floating-dock";
import { MindMapSidebar } from "@/components/custom/MindMapSidebar";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { cn } from "@/lib/utils";
import Head from 'next/head';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Node, 
  Edge, 
  Connection,
  MarkerType,
  NodeProps,
  Handle,
  Position,
  NodeToolbar,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconChevronRight,
  IconPlus,
  IconMinus,
  IconHeadphones,
  IconPlayerPlay,
  IconLoader2,
} from "@tabler/icons-react";

// Define the data structure for the custom node
type CustomNodeData = {
  label: string;
  expanded?: boolean;
  hasChildren?: boolean;
  isRoot?: boolean;
  isRead?: boolean;
  parentNode?: string;
  isSelected?: boolean;
  onToggleReadStatus?: (nodeId: string) => void;
  onNodeClick?: (nodeId: string) => void;
}

// Custom node component for expandable/collapsible behavior
const CustomNode = ({ data, id }: NodeProps) => {
  const { setNodes, getNodes, setCenter, getZoom } = useReactFlow();
  const nodeData = data as CustomNodeData;
  
  // Function to handle expand/collapse
  const toggleExpanded = useCallback(() => {
    const targetNodeId = id;
    
    setNodes((nds) => {
      return nds.map((node) => {
        // Toggle the expanded state of clicked node
        if (node.id === targetNodeId) {
          return {
            ...node,
            data: { ...node.data, expanded: !node.data.expanded }
          };
        }
        
        // Show/hide child nodes based on parent's expanded state
        if (node.data.parentNode === targetNodeId) {
          const parentNode = nds.find(n => n.id === targetNodeId);
          const newHidden = parentNode ? !parentNode.data.expanded : true;
          return {
            ...node,
            hidden: newHidden,
          };
        }
        return node;
      });
    });    // Center view on the expanded area after a slight delay to allow for node updates
    setTimeout(() => {
      const updatedNodes = getNodes();
      const expandedNode = updatedNodes.find(n => n.id === targetNodeId);
      
      if (expandedNode && expandedNode.data.expanded) {
        // Find all child nodes of the expanded node
        const childNodes = updatedNodes.filter(n => 
          n.data.parentNode === targetNodeId && !n.hidden
        );
        
        if (childNodes.length > 0) {
          // Calculate the center point of the child nodes area
          const childPositions = childNodes.map(n => ({ x: n.position.x, y: n.position.y }));
          const avgX = childPositions.reduce((sum, pos) => sum + pos.x, 0) / childPositions.length;
          const avgY = childPositions.reduce((sum, pos) => sum + pos.y, 0) / childPositions.length;
          
          // Center the view on the child nodes area with smooth animation
          setCenter(avgX, avgY, { zoom: getZoom(), duration: 800 });
        } else {
          // Fallback: center on the parent node if no child nodes found
          setCenter(expandedNode.position.x, expandedNode.position.y, { zoom: getZoom(), duration: 800 });
        }
      }
    }, 100);
  }, [id, setNodes, getNodes, setCenter, getZoom]);
  // Function to toggle read status
  const toggleReadStatus = useCallback(() => {
    if (nodeData.isRoot) return; // Don't toggle for root node
    
    // Call the onToggleReadStatus function from data
    if (nodeData.onToggleReadStatus) {
      nodeData.onToggleReadStatus(id);
    }
  }, [nodeData, id]);

  // Function to handle node click for selection
  const handleNodeClick = useCallback(() => {
    if (nodeData.onNodeClick) {
      nodeData.onNodeClick(id);
    }
  }, [nodeData, id]);
  
  // Determine border color based on read status and selection
  const getBorderColor = () => {
    if (nodeData.isSelected) return "border-white border-2"; // White border for selected nodes
    if (nodeData.isRoot) return "border-blue-500";
    return nodeData.isRead ? "border-green-500" : "border-neutral-700";
  };
  
  // Determine background color
  const getBackgroundColor = () => {
    if (nodeData.isRoot) return "bg-neutral-900";
    return nodeData.isRead ? "bg-neutral-800" : "bg-neutral-900";
  };

  return (
    <>
      {/* Expandable button for nodes with children */}
      {data.hasChildren && (
        <div 
          className="absolute -left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center cursor-pointer"
          onClick={toggleExpanded}
          style={{ zIndex: 10 }}
        >
          {data.expanded ? (
            <IconMinus className="h-3 w-3 text-white" />
          ) : (
            <IconPlus className="h-3 w-3 text-white" />
          )}
        </div>
      )}      {/* Main node container */}
      <div 
        className={cn(
          "px-4 py-2 min-w-32 rounded-md flex items-center justify-center border cursor-pointer",
          getBorderColor(),
          getBackgroundColor(),
          nodeData.isRoot ? "font-semibold" : "font-normal"
        )}
        onClick={handleNodeClick}
      >
        {/* Read status indicator/toggle button for non-root nodes - more subtle design */}
        {!nodeData.isRoot && (
          <div 
            className={cn(
              "absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/4 w-3 h-3 rounded-full flex items-center justify-center cursor-pointer",
              nodeData.isRead ? "bg-green-500" : "bg-neutral-700",
              "hover:opacity-80 transition-opacity border border-black"
            )}
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering other node events
              toggleReadStatus();
            }}
            title={nodeData.isRead ? "Mark as unread" : "Mark as read"}
            style={{ zIndex: 5 }}
          >
            {nodeData.isRead && (
              <div className="h-1.5 w-1.5 bg-white rounded-full"></div>
            )}
          </div>
        )}
        
        <div className="text-sm text-white">{nodeData.label}</div>
      </div>
        {/* Connection points - making them nearly invisible */}
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
  );
};

// Define the node types
const nodeTypes = {
  customNode: CustomNode,
};

export default function MindMapView() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/');
    return null;
  }

  return (
    <ReactFlowProvider>
      <MindMapContent />
    </ReactFlowProvider>
  );
}

// Separate component that uses ReactFlow hooks
function MindMapContent() {
  const router = useRouter();
  const { logout } = useAuth();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);  // Mind map topics data - structured for both the MindMapSidebar and the mind map visualization
  const mindMapData = [
    {
      id: 'photosynthesis',
      title: 'Photosynthesis Overview',
      isRead: true,
      subtopics: [
        { id: 'light-dependent', title: 'Light-Dependent Reactions', isRead: true },
        { id: 'light-independent', title: 'Light-Independent Reactions (Calvin Cycle)', isRead: false },
        { id: 'factors', title: 'Factors Affecting Photosynthesis', isRead: false },
      ]
    },
    {
      id: 'factors-affecting',
      title: 'Factors Affecting Photosynthesis',
      isRead: false,
      subtopics: [
        { id: 'light-intensity', title: 'Light Intensity', isRead: false },
        { id: 'temperature', title: 'Temperature', isRead: false },
        { id: 'carbon-dioxide', title: 'CO2 Concentration', isRead: false },
        { id: 'water-availability', title: 'Water Availability', isRead: false },
      ]
    },
    {
      id: 'products-reactants',
      title: 'Products and Reactants',
      isRead: true,
      subtopics: [
        { id: 'glucose', title: 'Glucose Production', isRead: true },
        { id: 'oxygen', title: 'Oxygen Release', isRead: true },
        { id: 'water-consumption', title: 'Water Consumption', isRead: false },
        { id: 'co2-absorption', title: 'CO2 Absorption', isRead: false },
      ]
    },
    {
      id: 'photosynthesis-equation',
      title: 'Chemical Equation',
      isRead: false,
      subtopics: []
    },
  ];
  
  // Track expanded topics in the mind map
  const [expandedTopics, setExpandedTopics] = useState<string[]>(['central']);
    // Track selected/focused node
  const [selectedNode, setSelectedNode] = useState<string | null>(null);  // Track podcast generation state
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [generatedPodcastUrl, setGeneratedPodcastUrl] = useState<string | null>(null);
  
  // Track sidebar width for resizing
  const [sidebarWidth, setSidebarWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  
  // Track chat messages for AI interaction
  const [chatMessages, setChatMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string, timestamp: Date}>>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  // React Flow instance ref for controlling view
  const { getNodes, setCenter, getZoom } = useReactFlow();
  // Reset podcast state when switching between nodes
  useEffect(() => {
    setIsGeneratingPodcast(false);
    setGeneratedPodcastUrl(null);
    setChatMessages([]); // Reset chat when switching nodes
  }, [selectedNode]);

  // Handle sidebar resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 320 && newWidth <= 800) { // Min 320px, Max 800px
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);
    // Handle topic selection from sidebar
  const handleTopicSelect = (topicId: string) => {
    console.log('Topic selected:', topicId);
    
    // Set the selected node
    setSelectedNode(topicId);
    
    // Find the node in the mind map and center on it
    const nodes = getNodes();
    const selectedNodeData = nodes.find(node => node.id === topicId);
    if (selectedNodeData) {
      // Center the view on the selected node with smooth animation
      setCenter(selectedNodeData.position.x, selectedNodeData.position.y, { zoom: getZoom(), duration: 800 });
    }
  };
    // Handle subtopic selection from sidebar
  const handleSubtopicSelect = (topicId: string, subtopicId: string) => {
    console.log('Subtopic selected:', topicId, subtopicId);
    
    // Set the selected node
    setSelectedNode(subtopicId);
    
    // First ensure parent topic is expanded
    setNodes((nds) => {
      return nds.map((node) => {
        // Expand the parent node
        if (node.id === topicId) {
          return {
            ...node,
            data: { ...node.data, expanded: true }
          };
        }
        
        // Show this subtopic and other subtopics of the parent
        if (node.data.parentNode === topicId) {
          return {
            ...node,
            hidden: false,
          };
        }
        return node;
      });
    });
    
    // Add parent to expanded topics
    if (!expandedTopics.includes(topicId)) {
      setExpandedTopics(prev => [...prev, topicId]);
    }
    
    // Focus on the selected subtopic after a short delay to ensure nodes are rendered
    setTimeout(() => {
      const nodes = getNodes();
      const selectedNodeData = nodes.find(node => node.id === subtopicId);
      if (selectedNodeData && !selectedNodeData.hidden) {
        setCenter(selectedNodeData.position.x, selectedNodeData.position.y, { zoom: getZoom(), duration: 800 });
      }
    }, 100);
  };

  // Handle node click for selection and centering
  const handleNodeClick = useCallback((nodeId: string) => {
    console.log('Node clicked:', nodeId);
    
    // Set the selected node
    setSelectedNode(nodeId);
    
    // Find the node in the mind map and center on it
    const nodes = getNodes();
    const selectedNodeData = nodes.find(node => node.id === nodeId);
    if (selectedNodeData && !selectedNodeData.hidden) {
      // Center the view on the selected node with smooth animation
      setCenter(selectedNodeData.position.x, selectedNodeData.position.y, { zoom: getZoom(), duration: 800 });
    }
  }, [getNodes, setCenter, getZoom]);

  // State for the actual mind map data (to allow updating read status)
  const [localMindMapData, setLocalMindMapData] = useState(mindMapData);
  
  // State for tracking topic/subtopic read status
  const [topicsReadStatus, setTopicsReadStatus] = useState(() => {
    // Initialize from mindMapData
    const initialStatus: Record<string, boolean> = {};
    
    // Add main topics
    mindMapData.forEach(topic => {
      initialStatus[topic.id] = topic.isRead;
      
      // Add subtopics
      topic.subtopics.forEach(subtopic => {
        initialStatus[subtopic.id] = subtopic.isRead;
      });
    });
    
    return initialStatus;
  });
  
  // Function to toggle read status of a node
  const handleToggleReadStatus = useCallback((nodeId: string) => {
    // Update the read status in state
    setTopicsReadStatus(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
    
    // Update the mindMapData state too (for sidebar)
    setLocalMindMapData(prevData => {
      return prevData.map(topic => {
        // Check if this is the topic being updated
        if (topic.id === nodeId) {
          return {
            ...topic,
            isRead: !topicsReadStatus[nodeId]
          };
        }
        
        // Check if one of this topic's subtopics is being updated
        if (topic.subtopics.some(sub => sub.id === nodeId)) {
          return {
            ...topic,
            subtopics: topic.subtopics.map(subtopic => {
              if (subtopic.id === nodeId) {
                return {
                  ...subtopic,
                  isRead: !topicsReadStatus[nodeId]
                };
              }
              return subtopic;
            })
          };
        }
        
        return topic;
      });
    });
  }, [topicsReadStatus]);
  // Function to generate podcast for selected topic
  const handleGeneratePodcast = useCallback(async () => {
    if (!selectedNode) return;
    
    setIsGeneratingPodcast(true);
    setGeneratedPodcastUrl(null);
    
    try {
      // TODO: Replace with actual API call to backend
      // const response = await fetch('/api/generate-podcast', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ topicId: selectedNode })
      // });
      // const data = await response.json();
      // setGeneratedPodcastUrl(data.podcastUrl);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 3000));
      setGeneratedPodcastUrl(`/podcasts/${selectedNode}-podcast.mp3`);
    } catch (error) {
      console.error('Error generating podcast:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsGeneratingPodcast(false);
    }
  }, [selectedNode]);

  // Function to get topic-specific placeholders for AI chat
  const getTopicPlaceholders = useCallback((nodeId: string | null) => {
    if (!nodeId) return [];
    
    // TODO: Replace with API call to get topic-specific questions
    const topicQuestions: Record<string, string[]> = {
      'photosynthesis': [
        "What is the chemical equation for photosynthesis?",
        "How does light affect the rate of photosynthesis?",
        "What are the two main stages of photosynthesis?",
        "Why is photosynthesis important for life on Earth?",
        "What factors can limit photosynthesis?"
      ],
      'light-dependent': [
        "Where do light-dependent reactions occur?",
        "What is the role of chlorophyll in light reactions?",
        "How is ATP produced in light-dependent reactions?",
        "What happens to water molecules during light reactions?",
        "What is photolysis?"
      ],
      'light-independent': [
        "What is the Calvin Cycle?",
        "Where do light-independent reactions take place?",
        "How is CO2 fixed in the Calvin Cycle?",
        "What is RuBisCO and what does it do?",
        "How many CO2 molecules are needed to make glucose?"
      ],
      'factors-affecting': [
        "How does temperature affect photosynthesis?",
        "What is the optimal light intensity for photosynthesis?",
        "How does CO2 concentration impact photosynthesis?",
        "What is a limiting factor in photosynthesis?",
        "How do plants adapt to low light conditions?"
      ],
      'central': [
        "What is photosynthesis in simple terms?",
        "Why do plants need sunlight to grow?",
        "How do plants make their own food?",
        "What gas do plants take in during photosynthesis?",
        "What do plants release as a byproduct?"
      ]
    };
    
    return topicQuestions[nodeId] || [
      "Tell me more about this topic",
      "What are the key concepts here?",
      "How does this relate to photosynthesis?",
      "Can you explain this in simple terms?",
      "What should I focus on learning?"
    ];
  }, []);
  // Function to handle AI chat submission
  const handleChatSubmit = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || !selectedNode) return;
    
    setIsAiTyping(true);
    
    try {
      // TODO: Replace with actual API call to your AI backend
      // const response = await fetch('/api/chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ 
      //     message: userMessage, 
      //     topic: selectedNode,
      //     chatHistory: chatMessages 
      //   })
      // });
      // const data = await response.json();
      
      // Simulate AI response for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const aiResponses: Record<string, string[]> = {
        'photosynthesis': [
          "Photosynthesis is the process by which plants convert light energy into chemical energy (glucose) using carbon dioxide and water.",
          "This process is fundamental to life on Earth as it produces oxygen and forms the base of most food chains.",
          "The process involves two main stages: light-dependent reactions and light-independent reactions (Calvin Cycle)."
        ],
        'light-dependent': [
          "Light-dependent reactions occur in the thylakoid membranes of chloroplasts where chlorophyll absorbs light energy.",
          "These reactions produce ATP and NADPH, which are energy carriers used in the Calvin Cycle.",
          "Water molecules are split (photolysis) to replace electrons lost by chlorophyll, releasing oxygen as a byproduct."
        ],
        'light-independent': [
          "The Calvin Cycle takes place in the stroma of chloroplasts and doesn't directly require light.",
          "CO2 is fixed by the enzyme RuBisCO and through a series of reactions, glucose is produced.",
          "This cycle requires the ATP and NADPH produced during light-dependent reactions."
        ]
      };
      
      const responses = aiResponses[selectedNode] || [
        "That's an interesting question about this topic! Let me help you understand it better.",
        "This concept is important for understanding how photosynthesis works.",
        "I'd be happy to explain more about this aspect of the topic."
      ];
      
      const aiMsgId = (Date.now() + 1).toString();
      setChatMessages(prev => [...prev, {
        id: aiMsgId,
        type: 'ai',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      }]);
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMsgId = (Date.now() + 1).toString();
      setChatMessages(prev => [...prev, {
        id: errorMsgId,
        type: 'ai',
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsAiTyping(false);
    }
  }, [selectedNode, chatMessages]);
  // Create initial nodes and edges for React Flow from mind map data with hierarchical layout
  const initialNodes = useMemo(() => {
    const flowNodes: Node[] = [];

    // Central node for the main topic - root node
    flowNodes.push({
      id: 'central',
      type: 'customNode',
      position: { x: 300, y: 200 },      data: { 
        label: 'Photosynthesis', 
        expanded: true,
        hasChildren: mindMapData.length > 0,
        isRoot: true,
        isSelected: selectedNode === 'central',
        onToggleReadStatus: handleToggleReadStatus,
        onNodeClick: handleNodeClick
      },
      draggable: true,
    });

    // Calculate positions for main topic nodes
    const mainTopicsCount = mindMapData.length;
    const mainTopicYStep = 100;
    const mainTopicStartY = 200 - ((mainTopicsCount - 1) * mainTopicYStep) / 2;
    
    // Create main topic nodes from mindMapData (first level)
    mindMapData.forEach((topic, topicIndex) => {
      // Position topics with even spacing vertically
      const yPos = mainTopicStartY + topicIndex * mainTopicYStep;
        flowNodes.push({
        id: topic.id,
        type: 'customNode',
        position: { x: 600, y: yPos },
        data: { 
          label: topic.title, 
          expanded: false,          hasChildren: topic.subtopics.length > 0,
          parentNode: 'central',
          isRead: topicsReadStatus[topic.id],
          isSelected: selectedNode === topic.id,
          onToggleReadStatus: handleToggleReadStatus,
          onNodeClick: handleNodeClick
        },
        draggable: true,
      });
      
      // Add subtopic nodes for this topic
      if (topic.subtopics.length > 0) {
        const subtopicsCount = topic.subtopics.length;
        const subtopicYStep = 50;
        const subtopicStartY = yPos - ((subtopicsCount - 1) * subtopicYStep) / 2;
        
        topic.subtopics.forEach((subtopic, subtopicIndex) => {
          // Position subtopics with even spacing
          const subYPos = subtopicStartY + subtopicIndex * subtopicYStep;
          
          flowNodes.push({
            id: subtopic.id,
            type: 'customNode',
            position: { x: 900, y: subYPos },
            data: { 
              label: subtopic.title, 
              expanded: false,
              hasChildren: false,
              parentNode: topic.id,
              isRead: topicsReadStatus[subtopic.id],              isSelected: selectedNode === subtopic.id,
              onToggleReadStatus: handleToggleReadStatus,
              onNodeClick: handleNodeClick
            },
            hidden: true, // Initially hidden until parent is expanded
            draggable: true,
          });
        });
      }
    });

    return flowNodes;
  }, [mindMapData, selectedNode, topicsReadStatus, handleToggleReadStatus, handleNodeClick]);
  // Create initial edges from the mindMapData structure
  const initialEdges = useMemo(() => {
    const flowEdges: Edge[] = [];
    
    // Create edges from central node to main topics
    mindMapData.forEach(topic => {
      flowEdges.push({
        id: `central-${topic.id}`,
        source: 'central',
        target: topic.id,
        type: 'bezier',
        animated: false,
        style: { 
          stroke: '#333', 
          strokeWidth: 1,
        },
        markerEnd: undefined, // Remove endpoint markers
        markerStart: undefined, // Remove startpoint markers
        data: {
          curvature: 0.8
        }
      });
        // Create edges from topics to their subtopics
      topic.subtopics.forEach(subtopic => {
        flowEdges.push({
          id: `${topic.id}-${subtopic.id}`,
          source: topic.id,
          target: subtopic.id,
          type: 'bezier',
          animated: false,
          style: { 
            stroke: '#333', 
            strokeWidth: 1,
          },
          markerEnd: undefined, // Remove endpoint markers
          markerStart: undefined, // Remove startpoint markers
          data: {
            curvature: 0.8
          }
        });
      });
    });

    return flowEdges;
  }, []);
  // Set up state hooks for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge({
        ...connection,
        type: 'bezier',
        animated: false,
        style: { 
          stroke: '#333', 
          strokeWidth: 1,
        },
        markerEnd: undefined, // Remove endpoint markers
        markerStart: undefined, // Remove startpoint markers
        data: {
          curvature: 0.8
        }
      }, eds));
    },
    [setEdges]
  );
    // Sync the expanded topics and selected node between sidebar and mind map visualization
  useEffect(() => {
    // Update node expansion state and selection based on expandedTopics and selectedNode
    setNodes(nds => nds.map(node => {
      let updatedNode = { ...node };
        // Update selection state
      updatedNode.data = { 
        ...updatedNode.data, 
        isSelected: selectedNode === node.id,
        onNodeClick: handleNodeClick
      };
      
      // Update expansion state
      if (expandedTopics.includes(node.id)) {
        updatedNode.data = { ...updatedNode.data, expanded: true };
      }
        // Show/hide nodes based on parent expansion
      const nodeData = node.data as CustomNodeData;
      if (nodeData.parentNode && expandedTopics.includes(nodeData.parentNode)) {
        updatedNode.hidden = false;
      }
      
      return updatedNode;
    }));
  }, [expandedTopics, selectedNode, setNodes, handleNodeClick]);
  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
  ];
    return (
    <div className="h-screen bg-black flex">
      {/* Sidebar */}      
      <div className="h-full">
        <MindMapSidebar 
          mindMapData={localMindMapData}
          onTopicSelect={handleTopicSelect}
          onSubtopicSelect={handleSubtopicSelect}
        />
      </div>
      
      {/* Main content area with Mind Map visualization */}
      <div className="flex-1 h-full">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-neutral-700">
            <h1 className="text-2xl font-bold text-white">Photosynthesis Mind Map</h1>
            <p className="text-neutral-400 mt-1">Interactive learning visualization</p>
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
                type: 'bezier',
                animated: false,
                style: { strokeWidth: 1, stroke: '#333' },
                markerEnd: undefined,
                markerStart: undefined,
                data: { curvature: 0.8 }
              }}
            >
              <Controls className="bg-neutral-800 text-white border-neutral-700" />
              <Background color="#333" gap={16} size={1} />
            </ReactFlow>
          </div>
        </div>
      </div>      {/* Right sidebar for detailed content */}
      {selectedNode && (
        <div 
          className="h-full bg-neutral-900 border-l border-neutral-700 flex shadow-2xl relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 bg-neutral-600 hover:bg-neutral-500 cursor-col-resize z-10"
            onMouseDown={handleMouseDown}
          />
          
          {/* Sidebar content */}
          <div className="flex-1 flex flex-col ml-1">
            {/* Content header with integrated podcast controls */}
            <div className="p-6 border-b border-neutral-700 bg-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-white">Topic Details</h2>
                
                {/* Compact podcast controls */}
                <div className="flex items-center gap-2">
                  {!generatedPodcastUrl ? (
                    <button
                      onClick={handleGeneratePodcast}
                      disabled={isGeneratingPodcast}
                      className="bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border border-neutral-600 hover:border-neutral-500 text-sm"
                      title="Generate Audio Learning"
                    >
                      {isGeneratingPodcast ? (
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <IconHeadphones className="h-4 w-4" />
                      )}
                      {isGeneratingPodcast ? 'Generating...' : 'Audio'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-green-400 text-xs">
                        <IconHeadphones className="h-3 w-3" />
                        Ready
                      </div>
                      <button
                        onClick={handleGeneratePodcast}
                        disabled={isGeneratingPodcast}
                        className="bg-neutral-600 hover:bg-neutral-700 text-white px-2 py-1 rounded text-xs transition-colors"
                        title="Regenerate Audio"
                      >
                        ↻
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-neutral-400 bg-neutral-700 px-3 py-1 rounded-full inline-block">
                {selectedNode}
              </p>
              
              {/* Audio player when ready */}
              {generatedPodcastUrl && (
                <div className="mt-4">
                  <audio
                    controls
                    className="w-full h-8"
                    style={{ filter: 'invert(1) sepia(1) saturate(1) hue-rotate(180deg)' }}
                  >
                    <source src={generatedPodcastUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>              {/* Content area - this will be populated by API call later */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col">
              {/* Topic Content Section */}
              <div className="text-neutral-300 leading-relaxed space-y-4">
                <div className="bg-neutral-800 border border-neutral-600 rounded-lg p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-neutral-600 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-neutral-600 rounded w-1/2 mb-3"></div>
                    <div className="h-4 bg-neutral-600 rounded w-5/6"></div>
                  </div>
                  <p className="text-neutral-400 text-sm mt-4 italic">
                    Detailed content for this topic will be loaded here from the backend...
                  </p>
                </div>

                {/* AI Responses - shown inline with content */}
                {chatMessages.map((message) => (
                  message.type === 'ai' && (
                    <div key={message.id} className="bg-neutral-800 border border-neutral-600 rounded-lg p-4">
                      <p className="text-neutral-200">{message.content}</p>
                      <span className="text-xs text-neutral-400 mt-2 block">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  )
                ))}

                {/* AI Typing Indicator */}
                {isAiTyping && (
                  <div className="bg-neutral-800 border border-neutral-600 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                  onChange={() => {}} // No need to handle onChange for this use case
                  onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const message = formData.get('input') as string;
                    if (message?.trim()) {
                      handleChatSubmit(message);
                      e.currentTarget.reset();
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
        <FloatingDock
          mobileClassName="translate-y-20"
          items={dockLinks}
          activeItem="/mind-map"
        />
      </div>
    </div>
  );
}
