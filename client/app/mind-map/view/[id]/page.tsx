"use client";
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api';
import { FloatingDock } from "@/components/ui/floating-dock";
import { MindMapSidebar } from "@/components/custom/MindMapSidebar";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { ContentFormatter } from "@/components/ui/content-formatter";
import { cn } from "@/lib/utils";
import { convertBackendDataToSidebarFormat, getFallbackData, generateFallbackMindMapData, BackendNode, BackendData, SidebarTopic, SidebarSubtopic } from "@/lib/mind-map-utils";
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
      )}

      {/* Main node container */}
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

export default function MindMapView() {  const router = useRouter();
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
  
  // Debug info for rendering issues
  console.log('Mind map view rendering with:', { 
    authenticated: isAuthenticated, 
    loading: loading, 
    params: useParams(),
    nodes: 0
  });

  return (
    <ReactFlowProvider>
      <MindMapContent />
    </ReactFlowProvider>
  );
}

// Separate component that uses ReactFlow hooks
function MindMapContent() {
  const router = useRouter();
  const params = useParams();
  const { logout } = useAuth();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
    // State for storing loaded backend data to access content
  const [backendData, setBackendData] = useState<BackendData | null>(null);
  
  // State for mind map data
  const [mindMapData, setMindMapData] = useState<SidebarTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mindMapTitle, setMindMapTitle] = useState<string>('Mind Map');

  // Track expanded topics in the mind map
  const [expandedTopics, setExpandedTopics] = useState<string[]>(['central']);
  // Track selected/focused node
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  // Track podcast generation state
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [generatedPodcastUrl, setGeneratedPodcastUrl] = useState<string | null>(null);
  
  // Track sidebar width for resizing
  const [sidebarWidth, setSidebarWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);  // Track chat messages for AI interaction
  const [chatMessages, setChatMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string, timestamp: Date}>>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  // Node descriptions state
  const [nodeDescriptions, setNodeDescriptions] = useState<Record<string, string>>({});
  const [loadingDescription, setLoadingDescription] = useState<string | null>(null);
  
  // React Flow instance ref for controlling view
  const { getNodes, setCenter, getZoom } = useReactFlow();
  // State for the actual mind map data (to allow updating read status)
  const [localMindMapData, setLocalMindMapData] = useState<SidebarTopic[]>([]);
    // Update localMindMapData when mindMapData changes
  useEffect(() => {
    console.log('Setting localMindMapData from mindMapData:', mindMapData);
    if (mindMapData && mindMapData.length > 0) {
      setLocalMindMapData(mindMapData);
      
      // Initialize the read status state from the mindMapData
      const initialStatus: Record<string, boolean> = {};
      
      // Add main topics
      mindMapData.forEach(topic => {
        initialStatus[topic.id] = topic.isRead || false;
        
        // Add subtopics
        topic.subtopics.forEach(subtopic => {
          initialStatus[subtopic.id] = subtopic.isRead || false;
        });
      });
      
      setTopicsReadStatus(initialStatus);
    }
  }, [mindMapData]);
  
  // State for tracking topic/subtopic read status
  const [topicsReadStatus, setTopicsReadStatus] = useState<Record<string, boolean>>(() => {
    // Initialize from mindMapData
    const initialStatus: Record<string, boolean> = {};
    
    // Add main topics
    mindMapData.forEach(topic => {
      initialStatus[topic.id] = topic.isRead || false;
      
      // Add subtopics
      topic.subtopics.forEach(subtopic => {
        initialStatus[subtopic.id] = subtopic.isRead || false;
      });
    });
    
    return initialStatus;
  });
  // Load mind map data from localStorage or API
  useEffect(() => {
    const loadMindMapData = async () => {
      try {
        setIsLoading(true);
        const mindMapId = params?.id as string;
        
        if (!mindMapId) {
          throw new Error('Mind map ID not provided');
        }
        
        console.log(`Loading mind map with ID: ${mindMapId}`);

        // First try to load from localStorage
        let localData;
        try {
          localData = localStorage.getItem(`mindmap_${mindMapId}`);
          if (localData) {
            const parsedData = JSON.parse(localData);
            if (parsedData && parsedData.nodes && parsedData.nodes.length > 0) {
              console.log('Successfully loaded mind map from localStorage with', parsedData.nodes.length, 'nodes');
                // Initialize the nodes data for React Flow
              const reactFlowNodes = parsedData.nodes.map((node: BackendNode) => ({
                id: node.id,
                type: 'customNode',
                position: node.position || { x: 0, y: 0 }, // Provide fallback position
                data: {
                  ...node,
                  label: node.label,
                  isRoot: node.type === 'root' || node.isRoot,
                  expanded: node.type === 'root' || node.isRoot, // Start with root expanded
                  hasChildren: (node.children && node.children.length > 0),
                  isRead: false,
                  onToggleReadStatus: handleToggleReadStatus,
                  onNodeClick: handleNodeClick
                },
                hidden: node.type !== 'root' && !node.isRoot // All non-root nodes hidden initially
              }));
              
              setNodes(reactFlowNodes);
                // Initialize the edges data for React Flow
              if (parsedData.edges) {
                const reactFlowEdges = parsedData.edges.map((edge: any) => ({
                  id: edge.id || `${edge.source}-${edge.target}`,
                  source: edge.source,
                  target: edge.target,
                  type: 'bezier',
                  animated: false,
                  style: { strokeWidth: 1, stroke: '#333' },
                  markerEnd: undefined,
                  markerStart: undefined,
                  data: { curvature: 0.8 }
                }));
                
                setEdges(reactFlowEdges);
              }
                // Store the full backend data for content access
              setBackendData(parsedData);
              
              // Convert the backend format to the sidebar format
              const convertedData = convertBackendDataToSidebarFormat(parsedData);
              setMindMapData(convertedData);
              setMindMapTitle(parsedData.title || parsedData.subject || 'Mind Map');
              setIsLoading(false);
              return;
            } else {
              console.warn('Invalid data format in localStorage, will try API');
            }
          }
        } catch (parseError) {
          console.error('Error parsing localStorage data:', parseError);
        }

        // If not in localStorage or parsing failed, try to fetch from API
        try {
          console.log('Fetching mind map from API...');          const response = await apiService.getMindMap(mindMapId);
          if (response.success && response.mindMap) {
            const mindMapData = response.mindMap.mindmap_data || response.mindMap;
            console.log('Successfully loaded mind map from API');
            
            // Store the full backend data for content access
            setBackendData(mindMapData);
            
            const convertedData = convertBackendDataToSidebarFormat(mindMapData);
            setMindMapData(convertedData);
            setMindMapTitle(mindMapData.title || mindMapData.subject || 'Mind Map');
            
            // Store in localStorage for future use
            localStorage.setItem(`mindmap_${mindMapId}`, JSON.stringify(mindMapData));
            
            // Initialize React Flow nodes and edges
            initializeReactFlowData(mindMapData);
          } else {
            throw new Error('Failed to load mind map from server');
          }        } catch (apiError) {
          console.error('Failed to load from API, using fallback data:', apiError);
          // Use fallback dummy data if both localStorage and API fail
          const fallbackData = generateFallbackMindMapData();
          setBackendData(fallbackData);
          setMindMapData(getFallbackData());
          setMindMapTitle('Photosynthesis (Demo)');
          initializeReactFlowData(fallbackData);
        }
          } catch (error) {
        console.error('Error loading mind map:', error);
        setError(error instanceof Error ? error.message : 'Failed to load mind map');
        // Use fallback dummy data
        const fallbackData = generateFallbackMindMapData();
        setBackendData(fallbackData);
        setMindMapData(getFallbackData());
        setMindMapTitle('Photosynthesis (Demo)');
      } finally {
        setIsLoading(false);
      }
    };

    loadMindMapData();
  }, [params?.id]);
  // Using type definitions from mind-map-utils.ts  // Using convertBackendDataToSidebarFormat from mind-map-utils.ts  // Using getFallbackData from mind-map-utils.ts

  // Function to initialize React Flow data
  const initializeReactFlowData = (data: any) => {
    if (!data || !data.nodes || !Array.isArray(data.nodes)) {
      console.warn('Invalid mind map data provided to initializeReactFlowData');
      return;
    }
    
    try {
      // Initialize the nodes data for React Flow
      const reactFlowNodes = data.nodes.map((node: BackendNode) => ({
        id: node.id,
        type: 'customNode',
        position: node.position || { x: 0, y: 0 }, // Provide fallback position
        data: {
          ...node,
          label: node.label,
          isRoot: node.type === 'root' || node.isRoot || node.level === 0,
          expanded: node.type === 'root' || node.isRoot || node.level === 0, // Start with root expanded
          hasChildren: (node.children && node.children.length > 0),
          isRead: false,
          onToggleReadStatus: handleToggleReadStatus,
          onNodeClick: handleNodeClick
        },
        hidden: !(node.type === 'root' || node.isRoot || node.level === 0) // All non-root nodes hidden initially
      }));
      
      setNodes(reactFlowNodes);
      
      // Initialize the edges data for React Flow
      if (data.edges && Array.isArray(data.edges)) {        const reactFlowEdges = data.edges.map((edge: any) => ({
          id: edge.id || `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: 'bezier',
          animated: false,
          style: { strokeWidth: 1, stroke: '#333' },
          markerEnd: undefined,
          markerStart: undefined,
          data: { curvature: 0.25 }
        }));
        
        setEdges(reactFlowEdges);
      }
      
    } catch (error) {
      console.error('Error initializing React Flow data:', error);
    }
  };

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
  // Function to fetch detailed node description from the server
  const fetchNodeDescription = useCallback(async (nodeId: string) => {
    // Don't fetch if we already have it or are currently loading it
    if (nodeDescriptions[nodeId] || loadingDescription === nodeId) return;
    
    try {
      setLoadingDescription(nodeId);
      
      // Find the node to get its label and related info
      const nodes = getNodes();
      const nodeData = nodes.find(node => node.id === nodeId);
      
      if (!nodeData) {
        console.error('Node not found:', nodeId);
        setLoadingDescription(null);
        return;
      }
      
      // Get parent and child nodes to provide more context
      const parentNodeId = nodeData.data.parentNode;
      const parentNode = parentNodeId ? nodes.find(n => n.id === parentNodeId) : null;
      
      const childNodes = nodes
        .filter(node => node.data.parentNode === nodeId)
        .map(node => ({
          id: node.id,
          label: node.data.label
        }));
          const nodeLabel = nodeData.data.label as string;
      console.log('Fetching detailed description for node:', nodeLabel);
      
      // Call the API to get the description
      const response = await apiService.getMindMapNodeDescription(
        nodeId,
        nodeLabel,
        "", // No syllabus available here
        parentNode ? [{ id: parentNode.id, label: parentNode.data.label as string }] : [],
        childNodes
      );
      
      if (response.success && response.description) {
        console.log('Description received for node:', nodeData.data.label);
        setNodeDescriptions(prev => ({
          ...prev,
          [nodeId]: response.description
        }));
      } else {
        console.error('Failed to get node description:', response.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching node description:', error);
    } finally {
      setLoadingDescription(null);
    }
  }, [getNodes, nodeDescriptions, loadingDescription]);

  // Handle node click for selection and centering
  const handleNodeClick = useCallback((nodeId: string) => {
    console.log('Node clicked:', nodeId);
    
    // Set the selected node
    setSelectedNode(nodeId);
    
    // Fetch detailed description for this node
    fetchNodeDescription(nodeId);
    
    // Find the node in the mind map and center on it
    const nodes = getNodes();
    const selectedNodeData = nodes.find(node => node.id === nodeId);
    if (selectedNodeData && !selectedNodeData.hidden) {
      // Center the view on the selected node with smooth animation
      setCenter(selectedNodeData.position.x, selectedNodeData.position.y, { zoom: getZoom(), duration: 800 });
    }
  }, [getNodes, setCenter, getZoom, fetchNodeDescription]);  // Function to get content for selected node with AI-generated detailed theory
  const getSelectedNodeContent = useCallback((nodeId: string | null) => {
    if (!nodeId || !backendData?.nodes) return null;
    
    // First, check if we have a cached detailed description from the node description API
    if (nodeDescriptions[nodeId]) {
      return nodeDescriptions[nodeId];
    }
    
    // If no cached description, find the node in backend data
    const node = backendData.nodes.find(n => n.id === nodeId);
    
    // If we're loading the description, return loading message
    if (loadingDescription === nodeId) {
      return "# Loading detailed content...\n\nGenerating a comprehensive description of this topic. Please wait a moment.";
    }
    
    // If node has content, return it as fallback
    if (node?.content) {
      return node.content;
    }
    
    // If nothing else, return a placeholder message
    return "# Content will be generated\n\nDetailed information about this topic will appear here shortly.";
  }, [nodeDescriptions, backendData, loadingDescription]);
    // Fallback content generator
  const generateDetailedTheory = (nodeId: string): string => {
    const theories: Record<string, string> = {
      'central': `# Photosynthesis: The Foundation of Life

Photosynthesis is arguably the most important biological process on Earth, converting light energy into chemical energy that sustains virtually all life forms. This complex biochemical process occurs primarily in plants, algae, and some bacteria.

## Overview
- **Primary function**: Convert CO₂ and H₂O into glucose using light energy
- **Location**: Primarily in chloroplasts of plant cells
- **Products**: Glucose (C₆H₁₂O₆) and oxygen (O₂)
- **Significance**: Forms the base of food chains and produces atmospheric oxygen

## The Chemical Equation
The overall reaction can be summarized as:

$$6CO_2 + 6H_2O + light \\ energy \\rightarrow C_6H_{12}O_6 + 6O_2$$

This process involves two main stages: light-dependent reactions and light-independent reactions (Calvin Cycle). Understanding photosynthesis is crucial for comprehending ecosystem dynamics, plant biology, and global carbon cycling.`,

        'photosynthesis': `# Photosynthesis: Energy Conversion Process

Photosynthesis is a sophisticated biological process that converts solar energy into chemical energy stored in glucose molecules. This process is fundamental to life on Earth as it provides energy for most living organisms and produces the oxygen we breathe.

## Key Components
- **Chlorophyll**: The green pigment that captures light energy
- **Chloroplasts**: Organelles where photosynthesis occurs
- **Stomata**: Pores for gas exchange (CO₂ in, O₂ out)
- **Thylakoids**: Membrane structures containing photosynthetic pigments

## Process Overview
The process involves capturing photons, splitting water molecules, and using the energy to combine carbon dioxide into glucose. This occurs through two interconnected stages that work together to achieve maximum efficiency.

## Importance
- Produces approximately 150 billion tons of glucose annually
- Generates virtually all atmospheric oxygen
- Removes billions of tons of CO₂ from the atmosphere
- Forms the foundation of most food webs

The efficiency of photosynthesis varies with environmental conditions, making it a critical factor in agricultural productivity and ecosystem health.`,

        'light-dependent': `# Light-Dependent Reactions: Energy Capture Phase

The light-dependent reactions, also called the photo reactions, occur in the thylakoid membranes of chloroplasts. These reactions capture and convert light energy into chemical energy in the form of ATP and NADPH.

## Location and Structure
- **Thylakoid membranes**: Site of light-dependent reactions
- **Photosystem II (PSII)**: Absorbs light at 680nm wavelength
- **Photosystem I (PSI)**: Absorbs light at 700nm wavelength
- **Electron transport chain**: Series of protein complexes

## Key Processes
### Photolysis
Water molecules are split to provide electrons and protons:
$$2H_2O \\rightarrow 4H^+ + 4e^- + O_2$$

### Energy Transfer
- Light excites electrons in chlorophyll molecules
- Excited electrons move through electron transport chain
- Energy is used to pump protons across thylakoid membrane
- Creates proton gradient for ATP synthesis

## Products
- **ATP**: Energy currency for cellular processes
- **NADPH**: Reducing agent for Calvin Cycle
- **Oxygen**: Released as a byproduct

The light-dependent reactions are remarkably efficient, converting approximately 95% of absorbed light energy into chemical energy, making them one of nature's most efficient energy conversion systems.`,

        'light-independent': `# Calvin Cycle: Carbon Fixation Process

The Calvin Cycle, also known as light-independent reactions or the C3 pathway, takes place in the stroma of chloroplasts. This cycle uses the ATP and NADPH produced in light-dependent reactions to fix atmospheric CO₂ into glucose.

## Three Main Phases

### 1. Carbon Fixation
CO₂ combines with RuBP (ribulose-1,5-bisphosphate) catalyzed by RuBisCO enzyme:
$$CO_2 + RuBP \\rightarrow 2 \\times 3PGA$$

### 2. Reduction
3PGA molecules are reduced to G3P using ATP and NADPH:
- Each 3PGA requires 1 ATP and 1 NADPH
- Forms glyceraldehyde-3-phosphate (G3P)

### 3. Regeneration
RuBP is regenerated to continue the cycle:
- Requires additional ATP
- Complex rearrangement of carbon skeletons

## Stoichiometry
To produce one glucose molecule:
- **6 CO₂** molecules required
- **18 ATP** molecules consumed
- **12 NADPH** molecules used
- **6 RuBP** molecules regenerated

## RuBisCO Enzyme
- Most abundant enzyme on Earth
- Can fix CO₂ or O₂ (photorespiration)
- Efficiency varies with temperature and CO₂ concentration

The Calvin Cycle operates continuously during daylight hours, with its rate depending on the availability of CO₂, ATP, and NADPH from the light-dependent reactions.`,

        'factors': `# Environmental Factors Affecting Photosynthesis

Photosynthesis rate is influenced by several environmental factors that can act as limiting factors. Understanding these factors is crucial for optimizing plant growth and agricultural productivity.

## Major Limiting Factors

### Light Intensity
- **Low light**: Rate increases linearly with light intensity
- **Light saturation**: Further increases don't improve rate
- **Optimal range**: 25-50% of full sunlight for most plants
- **Photoinhibition**: Damage at very high intensities

### Temperature
- **Enzyme activity**: Affects RuBisCO and other enzymes
- **Optimal range**: 20-35°C for most temperate plants
- **High temperature**: Enzyme denaturation and increased photorespiration
- **Low temperature**: Reduced enzyme activity and membrane fluidity

### CO₂ Concentration
- **Current atmospheric level**: ~420 ppm
- **CO₂ enrichment**: Can increase photosynthesis up to 1000 ppm
- **C4 plants**: More efficient at low CO₂ concentrations
- **Photorespiration**: Increases at low CO₂ levels

## Interactive Effects
These factors interact in complex ways:
- **Liebig's Law**: Rate limited by the most scarce factor
- **Compensation point**: Where photosynthesis equals respiration
- **Adaptation**: Plants adapt to local environmental conditions

## Practical Applications
Understanding these factors helps in:
- Greenhouse management and controlled environment agriculture
- Crop selection for different climates
- Predicting impacts of climate change on plant productivity`,

        'light-intensity': `# Light Intensity: The Energy Driver

Light intensity is often the primary limiting factor for photosynthesis, especially in natural environments where plants compete for sunlight. The relationship between light and photosynthetic rate follows a characteristic curve.

## Light Response Curve

### Three Phases
1. **Light-limited phase**: Linear increase with intensity
2. **Light-saturated phase**: Rate plateaus despite increased light
3. **Photoinhibition**: Potential decrease at very high intensities

### Mathematical Relationship
The relationship can be described by:
$$P = P_{max} \\times \\frac{I}{I + K_m}$$

Where:
- P = photosynthetic rate
- P_max = maximum photosynthetic rate
- I = light intensity
- K_m = half-saturation constant

## Adaptive Mechanisms
Plants have evolved various strategies to optimize light capture:
- **Leaf arrangement**: Mosaic patterns to minimize self-shading
- **Chloroplast movement**: Orient toward or away from light
- **Antenna complexes**: Increase light-harvesting efficiency
- **Shade tolerance**: Some species adapted to low light conditions

## Practical Implications
- **Agriculture**: Proper plant spacing to maximize light interception
- **Forestry**: Understanding canopy dynamics and succession
- **Indoor cultivation**: LED lighting optimization for different growth stages

Light quality (wavelength) is also important, with red and blue light being most effective for photosynthesis, while green light is largely reflected.`,

        'temperature': `# Temperature Effects on Photosynthetic Efficiency

Temperature profoundly affects photosynthesis by influencing enzyme activity, membrane properties, and the balance between photosynthesis and respiration. Understanding these effects is crucial for predicting plant responses to climate change.

## Enzyme Kinetics and Temperature

### RuBisCO Activity
The primary carboxylating enzyme is highly temperature-sensitive:
- **Optimal temperature**: Varies by species (15-35°C)
- **Q₁₀ effect**: Rate doubles with every 10°C increase (up to optimum)
- **Thermal denaturation**: Occurs at high temperatures

### Temperature Coefficient
The relationship follows an Arrhenius-type equation:
$$k = A \\times e^{-E_a/RT}$$

Where k is the rate constant, A is pre-exponential factor, E_a is activation energy, R is gas constant, and T is absolute temperature.

## Physiological Responses

### High Temperature Stress
- **Membrane stability**: Lipid composition changes
- **Photorespiration**: Increases due to RuBisCO's oxygenase activity
- **Water stress**: Increased transpiration and stomatal closure
- **Protein denaturation**: Irreversible damage to photosynthetic apparatus

### Low Temperature Stress
- **Photoinhibition**: Reduced capacity to use absorbed light
- **Membrane rigidity**: Affects electron transport
- **Metabolic imbalance**: Slower Calvin Cycle relative to light reactions

## Adaptation Strategies
Plants have evolved various mechanisms:
- **C4 photosynthesis**: Concentrates CO₂ around RuBisCO
- **CAM photosynthesis**: Temporal separation of CO₂ uptake
- **Heat shock proteins**: Protect against thermal damage
- **Antifreeze proteins**: Prevent ice crystal formation

Understanding temperature effects helps in crop breeding and climate change adaptation strategies.`,

        'carbon-dioxide': `# Carbon Dioxide: The Raw Material

CO₂ concentration is a critical factor affecting photosynthetic rate, as it serves as the primary carbon source for glucose synthesis. With rising atmospheric CO₂ levels, understanding this relationship is increasingly important.

## CO₂ Response Characteristics

### Concentration Effects
- **Current atmospheric level**: ~420 ppm (increasing ~2 ppm/year)
- **Pre-industrial level**: ~280 ppm
- **Saturation point**: Varies by species (800-1200 ppm for C3 plants)
- **Compensation point**: CO₂ level where photosynthesis equals respiration

### Mathematical Relationship
CO₂ response follows Michaelis-Menten kinetics:
$$P = \\frac{P_{max} \\times [CO_2]}{K_m + [CO_2]}$$

## Biochemical Mechanisms

### RuBisCO Dual Function
The enzyme can catalyze two competing reactions:
- **Carboxylation**: CO₂ + RuBP → 2 × 3PGA (photosynthesis)
- **Oxygenation**: O₂ + RuBP → 3PGA + phosphoglycolate (photorespiration)

### CO₂ Concentrating Mechanisms
Some plants have evolved strategies to increase CO₂ around RuBisCO:
- **C4 pathway**: Spatial separation using bundle sheath cells
- **CAM pathway**: Temporal separation storing CO₂ as malate
- **Carbonic anhydrase**: Facilitates CO₂/HCO₃⁻ interconversion

## Climate Change Implications
Rising CO₂ levels affect plants differently:
- **C3 plants**: Generally benefit from CO₂ enrichment
- **C4 plants**: Less responsive due to efficient CO₂ concentration
- **Acclimation**: Long-term exposure may reduce initial benefits
- **Nutrient limitations**: Other factors may become limiting

This understanding is crucial for predicting agricultural productivity and ecosystem responses to global change.`,

        'water-availability': `# Water: The Essential Resource

Water plays multiple crucial roles in photosynthesis beyond being a reactant. It affects stomatal behavior, maintains cellular structure, and influences the efficiency of the entire photosynthetic process.

## Roles of Water in Photosynthesis

### Direct Participation
Water molecules are split during light-dependent reactions:
$$2H_2O \\rightarrow 4H^+ + 4e^- + O_2$$

This process, called photolysis, provides:
- **Electrons**: Replace those lost by chlorophyll
- **Protons**: Contribute to the proton gradient for ATP synthesis
- **Oxygen**: Released as a byproduct

### Structural and Physiological Functions
- **Turgor pressure**: Maintains cell shape and stomatal function
- **Transport medium**: Moves nutrients and metabolites
- **Temperature regulation**: Cooling through transpiration
- **Metabolic reactions**: Required for enzymatic processes

## Water Stress Effects

### Immediate Responses
- **Stomatal closure**: Reduces CO₂ uptake to conserve water
- **Reduced photosynthetic rate**: Limited CO₂ availability
- **Increased leaf temperature**: Reduced transpiration cooling
- **Osmotic adjustment**: Accumulation of compatible solutes

### Long-term Adaptations
Plants develop various strategies:
- **Root system modification**: Deeper or more extensive roots
- **Leaf morphology**: Smaller, thicker leaves with waxy cuticles
- **CAM photosynthesis**: Opens stomata at night
- **Water storage tissues**: Succulents store water in specialized organs

## Water Use Efficiency
The relationship between water use and CO₂ assimilation:
$$WUE = \\frac{Photosynthesis}{Transpiration}$$

Factors affecting WUE:
- **Vapor pressure deficit**: Atmospheric humidity
- **Stomatal conductance**: Degree of stomatal opening
- **Leaf-to-air temperature difference**: Affects transpiration rate

Understanding water relations is essential for drought-resistant crop development and water-efficient agriculture.`      };
      
      return theories[nodeId] || `# ${nodeId.charAt(0).toUpperCase() + nodeId.slice(1)}

This topic contains important information about photosynthesis. While detailed content is being generated, here are some key points:

## Overview
This concept is an integral part of understanding photosynthesis and its various components. The process involves complex biochemical reactions that are essential for life on Earth.

## Key Features
- Involves multiple enzymatic reactions
- Requires specific environmental conditions
- Contributes to the overall efficiency of photosynthesis
- Has evolutionary significance

## Scientific Importance
Understanding this topic helps in:
- Comprehending plant biology
- Improving agricultural practices
- Addressing climate change challenges
- Developing biotechnological applications

More detailed content will be available soon with comprehensive explanations, equations, and practical applications.`;
  };
  
  // Default function for getting node content    
  const getNodeContent = (id: string | null) => {
    if (!id) return null;
    return generateDetailedTheory(id);
  };

  // Effect to fetch detailed node description when a node is selected
  useEffect(() => {
    const fetchNodeDescription = async () => {
      if (!selectedNode || !backendData?.nodes) return;
      
      // Skip if we already have this description
      if (nodeDescriptions[selectedNode]) return;
      
      // Skip if we're already loading this description
      if (loadingDescription === selectedNode) return;
      
      // Find the node in backend data
      const nodeData = backendData.nodes.find(n => n.id === selectedNode);
      if (!nodeData) return;
      
      // Set loading state
      setLoadingDescription(selectedNode);
      
      try {
        // Find parent and child nodes for context
        const parentNodeId = nodeData.parentId || null;
        const parentNode = parentNodeId ? backendData.nodes.find(n => n.id === parentNodeId) : null;
        
        // Find child nodes
        const childNodes = backendData.nodes
          .filter(n => n.parentId === selectedNode)
          .map(n => ({ id: n.id, label: n.label }));
        
        console.log('Fetching detailed description for node:', nodeData.label);
        
        // Call the API to get the description
        const response = await apiService.getMindMapNodeDescription(
          selectedNode,
          nodeData.label,
          "", // No syllabus available here
          parentNode ? [{ id: parentNode.id, label: parentNode.label }] : [],
          childNodes
        );
        
        if (response && response.success && response.description) {
          console.log('Description received:', response.description.substring(0, 50) + '...');
          
          // Store the description
          setNodeDescriptions(prev => ({
            ...prev,
            [selectedNode]: response.description
          }));
        } else {
          console.error('Failed to get node description:', response?.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Error fetching node description:', error);
      } finally {
        setLoadingDescription(null);
      }
    };
    
    if (selectedNode) {
      fetchNodeDescription();
    }
  }, [selectedNode, backendData, nodeDescriptions, loadingDescription]);

  // Function to get related topics for selected node
  const getRelatedTopics = useCallback((nodeId: string | null) => {
    if (!nodeId || !backendData?.nodes) return [];
    
    const currentNode = backendData.nodes.find(n => n.id === nodeId);
    if (!currentNode) return [];
    
    const related: BackendNode[] = [];
    
    // Add parent node if it exists
    if (currentNode.parentNode || currentNode.parent) {
      const parentId = currentNode.parentNode || currentNode.parent;
      const parent = backendData.nodes.find(n => n.id === parentId);
      if (parent) related.push(parent);
    }
    
    // Add child nodes if they exist
    if (currentNode.children && currentNode.children.length > 0) {
      const children = backendData.nodes.filter(n => currentNode.children?.includes(n.id));
      related.push(...children);
    }
    
    // Add sibling nodes (nodes with same parent)
    if (currentNode.parentNode || currentNode.parent) {
      const parentId = currentNode.parentNode || currentNode.parent;
      const siblings = backendData.nodes.filter(n => 
        (n.parentNode === parentId || n.parent === parentId) && n.id !== nodeId
      );
      related.push(...siblings);
    }
    
    return related.slice(0, 5); // Limit to 5 related topics
  }, [backendData]);

  // Function to get node details for selected node
  const getSelectedNodeDetails = useCallback((nodeId: string | null) => {
    if (!nodeId || !backendData?.nodes) return null;
    
    // Find the node in backend data
    const node = backendData.nodes.find(n => n.id === nodeId);
    if (!node) return null;
    
    return {
      id: node.id,
      label: node.label,
      content: node.content,
      type: node.type,
      level: node.level,
      isRoot: node.isRoot || node.type === 'root'
    };
  }, [backendData]);

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
  }, []);  // Function to handle AI chat submission with detailed responses
  const handleChatSubmit = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;
    
    console.log("User asked:", userMessage); // Debug log
    
    setIsAiTyping(true);
    
    try {
      // Simulate thinking time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate detailed AI response based on user input and selected topic
      const lowerMessage = userMessage.toLowerCase();
      const currentTopic = selectedNode || 'general';
      
      let dummyResponse = "";
      
      if (lowerMessage.includes("equation") || lowerMessage.includes("formula")) {
        dummyResponse = `## Chemical Equations in Photosynthesis

Great question about the chemical equations! Here are the key equations:

### Overall Photosynthesis Equation
$$6CO_2 + 6H_2O + light \\ energy \\rightarrow C_6H_{12}O_6 + 6O_2$$

### Light-Dependent Reactions
- **Photolysis**: $2H_2O \\rightarrow 4H^+ + 4e^- + O_2$
- **ATP synthesis**: $ADP + P_i \\rightarrow ATP$
- **NADPH formation**: $NADP^+ + H^+ + 2e^- \\rightarrow NADPH$

### Calvin Cycle (Simplified)
- **Carbon fixation**: $CO_2 + RuBP \\rightarrow 2 \\times 3PGA$
- **Reduction**: $3PGA + ATP + NADPH \\rightarrow G3P$

These equations show how light energy is converted into chemical energy stored in glucose and ATP.`;
      } else if (lowerMessage.includes("explain") || lowerMessage.includes("how")) {
        if (currentTopic.includes('light')) {
          dummyResponse = `## How Light-Dependent Reactions Work

Excellent question! Let me explain the process step by step:

### The Process
1. **Light Absorption**: Chlorophyll molecules in photosystem II absorb photons
2. **Electron Excitation**: Energy excites electrons to higher energy levels
3. **Water Splitting**: $2H_2O \\rightarrow 4H^+ + 4e^- + O_2$
4. **Electron Transport**: Excited electrons move through the electron transport chain
5. **ATP Production**: Proton gradient drives ATP synthase

### Key Points
- Occurs in **thylakoid membranes**
- Produces **ATP and NADPH** for the Calvin Cycle
- Releases **oxygen** as a byproduct
- Efficiency is ~95% of absorbed light energy

This process is remarkably efficient and forms the foundation for all life on Earth!`;
        } else {
          dummyResponse = `## Understanding ${currentTopic.charAt(0).toUpperCase() + currentTopic.slice(1)}

Great question! Let me break this down for you:

### Key Concepts
- This process is fundamental to how plants convert light energy into chemical energy
- Multiple enzymatic reactions work together in a coordinated manner
- Environmental factors significantly influence the efficiency

### Important Points
- **Location**: Primarily occurs in chloroplasts
- **Products**: Glucose and oxygen are the main products
- **Efficiency**: Varies with light, temperature, and CO₂ levels
- **Significance**: Forms the base of food webs and produces atmospheric oxygen

### Real-World Applications
Understanding this helps in:
- Agricultural optimization
- Climate change research
- Biotechnology development

Would you like me to explain any specific aspect in more detail?`;
        }
      } else if (lowerMessage.includes("temperature") || lowerMessage.includes("heat")) {
        dummyResponse = `## Temperature Effects on Photosynthesis

Temperature plays a crucial role in photosynthetic efficiency:

### Optimal Temperature Range
- **Most plants**: 20-35°C
- **Tropical plants**: 25-40°C
- **Temperate plants**: 15-30°C

### How Temperature Affects the Process
1. **Enzyme Activity**: Higher temperatures increase reaction rates up to an optimum
2. **RuBisCO Function**: The key enzyme has temperature-dependent efficiency
3. **Membrane Stability**: High temperatures can damage thylakoid membranes
4. **Photorespiration**: Increases at higher temperatures, reducing efficiency

### Mathematical Relationship
The rate follows the **Q₁₀ rule**: 
For every 10°C increase, reaction rate approximately doubles (until the optimum is reached).

### Climate Change Implications
- Rising temperatures may initially boost photosynthesis
- But extreme heat causes stress and reduces efficiency
- Plants are adapting through various mechanisms

This is why understanding temperature responses is crucial for predicting how plants will respond to climate change!`;
      } else if (lowerMessage.includes("co2") || lowerMessage.includes("carbon")) {
        dummyResponse = `## CO₂ and Photosynthesis

Carbon dioxide is the raw material for glucose synthesis! Here's how it works:

### Current CO₂ Levels
- **Atmospheric concentration**: ~420 ppm (and rising)
- **Pre-industrial level**: ~280 ppm
- **Rate of increase**: ~2 ppm per year

### CO₂ Response Curve
The relationship follows **Michaelis-Menten kinetics**:
$$P = \\frac{P_{max} \\times [CO_2]}{K_m + [CO_2]}$$

### Key Points
- **Limiting factor**: Often limits photosynthesis in natural conditions
- **Saturation point**: Around 800-1200 ppm for most C3 plants
- **Compensation point**: Where photosynthesis equals respiration

### Plant Adaptations
- **C4 plants**: Concentrate CO₂ around RuBisCO
- **CAM plants**: Store CO₂ at night, use during day
- **C3 plants**: Most common, directly use atmospheric CO₂

Rising CO₂ levels generally benefit plant growth, but other factors may become limiting!`;
      } else {
        dummyResponse = `## About ${currentTopic.charAt(0).toUpperCase() + currentTopic.slice(1)}

Thank you for your question about "${userMessage}"! This is a fascinating aspect of photosynthesis.

### Overview
This topic involves complex biochemical processes that are essential for life on Earth. The intricate mechanisms have evolved over billions of years to achieve remarkable efficiency.

### Key Features
- **Complexity**: Multiple coordinated reactions
- **Efficiency**: Highly optimized energy conversion
- **Importance**: Fundamental to ecosystem function
- **Applications**: Relevant to agriculture and biotechnology

### Scientific Significance
Understanding these processes helps us:
- Improve crop yields
- Develop renewable energy technologies
- Address climate change challenges
- Advance our knowledge of life processes

Would you like me to explain any specific aspect in more detail? I can provide equations, mechanisms, or practical applications!`;
      }
      
      const aiMsgId = Date.now().toString();
      setChatMessages(prev => [...prev, {
        id: aiMsgId,
        type: 'ai',
        content: dummyResponse,
        timestamp: new Date()
      }]);
      
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMsgId = Date.now().toString();
      setChatMessages(prev => [...prev, {
        id: errorMsgId,
        type: 'ai',
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsAiTyping(false);
    }
  }, [selectedNode]);
  // Create initial nodes and edges for React Flow from mind map data with hierarchical layout
  const initialNodes = useMemo(() => {
    const flowNodes: Node[] = [];    // Central node for the main topic - root node
    flowNodes.push({
      id: 'central',
      type: 'customNode',
      position: { x: 300, y: 200 },      
      data: { 
        label: mindMapTitle, 
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
          expanded: false,
          hasChildren: topic.subtopics.length > 0,
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
              isRead: topicsReadStatus[subtopic.id],              
              isSelected: selectedNode === subtopic.id,
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
      flowEdges.push({        id: `central-${topic.id}`,
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
        data: { curvature: 0.25 }
      });
        // Create edges from topics to their subtopics
      topic.subtopics.forEach(subtopic => {
        flowEdges.push({          id: `${topic.id}-${subtopic.id}`,
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
          data: { curvature: 0.25 }
        });
      });
    });

    return flowEdges;
  }, []);
  // Set up state hooks for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge({
        ...connection,
        type: 'bezier',
        animated: false,
        style: { 
          stroke: '#333', 
          strokeWidth: 1,
        },        markerEnd: undefined, // Remove endpoint markers
        markerStart: undefined, // Remove startpoint markers
        data: { curvature: 0.25 }
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
    },  ];

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading mind map...</div>
      </div>
    );
  }

  // Show error state
  if (error && mindMapData.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Error loading mind map</div>
          <div className="text-gray-400">{error}</div>
          <button 
            onClick={() => router.push('/mind-map')}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
    
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
        <div className="h-full flex flex-col">          {/* Header */}
          <div className="p-6 border-b border-neutral-700">
            <h1 className="text-2xl font-bold text-white">{mindMapTitle}</h1>
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
              panOnScroll={true}              defaultEdgeOptions={{
                type: 'bezier',
                animated: false,
                style: { strokeWidth: 1, stroke: '#333' },
                markerEnd: undefined,
                markerStart: undefined,
                data: { curvature: 0.25 }
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
          <div className="flex-1 flex flex-col ml-1">            {/* Content header with clean design */}
            <div className="p-6 border-b border-neutral-700 bg-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">
                    {(() => {
                      const nodeDetails = getSelectedNodeDetails(selectedNode);
                      return nodeDetails ? nodeDetails.label : 'Topic Details';
                    })()}
                  </h2>
                  <p className="text-sm text-neutral-400 mt-1">Detailed learning content</p>
                </div>
                
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
            </div>            {/* Content area - beautifully formatted with KaTeX support */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col">
              {/* Topic Content Section */}              <div className="text-neutral-300 leading-relaxed space-y-4">                
                {(() => {
                  // Get content for the selected node
                  let nodeContent;
                  
                  // First check if we have a selected node
                  if (!selectedNode) {
                    // If no node is selected, return loading placeholder
                    return (
                      <div className="bg-neutral-800 border border-neutral-600 rounded-lg p-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-neutral-600 rounded w-3/4 mb-3"></div>
                          <div className="h-4 bg-neutral-600 rounded w-1/2 mb-3"></div>
                          <div className="h-4 bg-neutral-600 rounded w-5/6"></div>
                        </div>
                        <p className="text-neutral-400 text-sm mt-4 italic">
                          Select a node to see its content...
                        </p>
                      </div>
                    );
                  }

                  // If we have a cached detailed description from the API
                  if (nodeDescriptions[selectedNode]) {
                    nodeContent = nodeDescriptions[selectedNode];
                  } 
                  // If we're loading, show loading message
                  else if (loadingDescription === selectedNode) {
                    nodeContent = "# Loading detailed content...\n\nGenerating a comprehensive description of this topic. Please wait a moment.";
                  } 
                  // Otherwise use basic content
                  else {
                    // Try to fetch if we don't have the description yet
                    if (!nodeDescriptions[selectedNode] && loadingDescription !== selectedNode) {
                      // Set loading state to prevent duplicate requests
                      setLoadingDescription(selectedNode);
                      
                      // Get the node details
                      const nodes = getNodes();
                      const nodeData = nodes.find(node => node.id === selectedNode);
                      
                      if (nodeData) {
                        console.log('Fetching detailed description for node:', nodeData.data.label);
                        
                        // Get parent and child nodes for context
                        const parentNodeId = nodeData.data.parentNode;
                        const parentNode = parentNodeId ? nodes.find(node => node.id === parentNodeId) : null;
                        
                        const childNodes = nodes
                          .filter(node => node.data.parentNode === selectedNode)
                          .map(node => ({ id: node.id, label: node.data.label }));
                        
                        // Call the API
                        apiService.getMindMapNodeDescription(
                          selectedNode,
                          nodeData.data.label,
                          "", // No syllabus available here
                          parentNode ? [{ id: parentNode.id, label: parentNode.data.label }] : [],
                          childNodes
                        )
                        .then(response => {
                          if (response && response.success && response.description) {
                            console.log('Description received:', response.description.substring(0, 50) + '...');
                            
                            // Store the description
                            setNodeDescriptions(prev => ({
                              ...prev,
                              [selectedNode]: response.description
                            }));
                          } else {
                            console.error('Failed to get node description:', response?.error || 'Unknown error');
                          }
                        })
                        .catch(error => {
                          console.error('Error fetching node description:', error);
                        })
                        .finally(() => {
                          setLoadingDescription(null);
                        });
                      }
                    }
                    
                    // Use the default content from the node
                    const node = getNodes().find(node => node.id === selectedNode);
                    nodeContent = node?.data?.content || "# Loading content...\n\nContent will appear here shortly.";
                  }
                  
                  // Return the content and related topics
                  return (
                    <>
                      {/* Main Content Card with formatted content */}
                      <div className="bg-neutral-800 border border-neutral-600 rounded-lg p-6">
                        <ContentFormatter content={nodeContent} className="w-full" />
                      </div>
                        
                      {/* Related Topics Card */}
                      {(() => {
                        const relatedTopics = getRelatedTopics(selectedNode);
                        if (relatedTopics.length > 0) {
                          return (
                            <div className="bg-neutral-800 border border-neutral-600 rounded-lg p-4">
                              <h4 className="text-lg font-medium text-white mb-3">Related Topics</h4>
                              <div className="space-y-2">
                                {relatedTopics.map((topic) => (
                                  <button
                                    key={topic.id}
                                    onClick={() => handleNodeClick(topic.id)}
                                    className="w-full text-left p-3 rounded bg-neutral-700 hover:bg-neutral-600 transition-colors border border-neutral-600 hover:border-neutral-500"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-neutral-200 font-medium">{topic.label}</span>
                                      <IconChevronRight className="h-4 w-4 text-neutral-400" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </>
                  );
                })()}{/* AI Responses - shown inline with content */}
                {chatMessages.map((message) => (
                  message.type === 'ai' && (
                    <div key={message.id} className="bg-neutral-800 border border-neutral-600 rounded-lg p-4">
                      <TextGenerateEffect words={message.content} />
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
              </div>              {/* AI Input at bottom */}
              <div className="mt-6">
                <PlaceholdersAndVanishInput
                  placeholders={getTopicPlaceholders(selectedNode)}
                  onChange={() => {}} // No need to handle onChange for this use case
                  onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.querySelector('input') as HTMLInputElement;
                    const message = input?.value;
                    if (message?.trim()) {
                      console.log("Submitting message:", message); // Debug log
                      handleChatSubmit(message);
                      // Don't reset here - the component handles it internally
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
