"use client";
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { FloatingDock } from "@/components/ui/floating-dock";
import { MindMapSidebar } from "@/components/custom/MindMapSidebar";
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
  useReactFlow
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
} from "@tabler/icons-react";

// Custom node component for expandable/collapsible behavior
const CustomNode = ({ data, id }: NodeProps) => {
  const { setNodes, getNodes } = useReactFlow();
  
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
    });
  }, [id, setNodes]);
  
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
      
      {/* Main node container */}      <div className={cn(
        "px-4 py-2 min-w-32 rounded-md flex items-center justify-center border border-neutral-700 bg-neutral-900",
        data.isRoot ? "font-semibold" : "font-normal"
      )}>
        <div className="text-sm text-white">{data.label as string}</div>
      </div>
      
      {/* Connection points */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-2 h-2 border-2 border-neutral-700 bg-neutral-800" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-2 h-2 border-2 border-neutral-700 bg-neutral-800" 
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
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Mind map topics data - structured for the MindMapSidebar component
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

  const handleTopicSelect = (topicId: string) => {
    console.log('Topic selected:', topicId);
    // Handle topic selection logic here
  };
  
  const handleSubtopicSelect = (topicId: string, subtopicId: string) => {
    console.log('Subtopic selected:', topicId, subtopicId);
    // Handle subtopic selection logic here
  };
  
  // Create initial nodes and edges for React Flow from mind map data with hierarchical layout
  const initialNodes = useMemo(() => {
    const flowNodes: Node[] = [];

    // Central node for the main topic
    flowNodes.push({
      id: 'central',
      type: 'customNode',
      position: { x: 300, y: 200 },
      data: { 
        label: 'Photosynthesis', 
        expanded: true,
        hasChildren: true,
        isRoot: true,
      },
      draggable: true,
    });

    // Create topic nodes (first level)
    const topics = [
      { 
        id: 'light-dependent', 
        label: 'Light-Dependent Reactions',
        position: { x: 600, y: 100 }
      },
      { 
        id: 'light-independent', 
        label: 'Light-Independent Reactions (Calvin Cycle)',
        position: { x: 600, y: 200 }
      },
      { 
        id: 'factors', 
        label: 'Factors Affecting Photosynthesis',
        position: { x: 600, y: 300 }
      }
    ];
    
    topics.forEach(topic => {
      flowNodes.push({
        id: topic.id,
        type: 'customNode',
        position: topic.position,
        data: { 
          label: topic.label, 
          expanded: false,
          hasChildren: topic.id === 'factors',
          parentNode: 'central'
        },
        draggable: true,
      });
    });
    
    // Add factors subtopics (second level)
    const factorsSubtopics = [
      { id: 'light-intensity', label: 'Light Intensity', position: { x: 900, y: 250 } },
      { id: 'temperature', label: 'Temperature', position: { x: 900, y: 300 } },
      { id: 'co2', label: 'CO₂ Concentration', position: { x: 900, y: 350 } },
      { id: 'water', label: 'Water Availability', position: { x: 900, y: 400 } }
    ];
    
    factorsSubtopics.forEach(subtopic => {
      flowNodes.push({
        id: subtopic.id,
        type: 'customNode',
        position: subtopic.position,
        data: { 
          label: subtopic.label, 
          expanded: false,
          hasChildren: false,
          parentNode: 'factors'
        },
        hidden: true, // Initially hidden until parent is expanded
        draggable: true,
      });
    });

    return flowNodes;
  }, []);
  
  // Create initial edges
  const initialEdges = useMemo(() => {
    const flowEdges: Edge[] = [];
      // Central node to topics
    const topics = ['light-dependent', 'light-independent', 'factors'];    topics.forEach(topicId => {
      flowEdges.push({
        id: `central-${topicId}`,
        source: 'central',
        target: topicId,
        type: 'bezier', // Changed to bezier for more curved edges
        animated: false,
        style: { 
          stroke: '#333', 
          strokeWidth: 1,
        },
        // Add curvature for more pronounced curves
        data: {
          curvature: 0.8
        }
      });
    });
      // Factors to subtopics
    const factorsSubtopics = ['light-intensity', 'temperature', 'co2', 'water'];    factorsSubtopics.forEach(subtopicId => {
      flowEdges.push({
        id: `factors-${subtopicId}`,
        source: 'factors',
        target: subtopicId,
        type: 'bezier', // Changed to bezier for more curved edges
        animated: false,
        style: { 
          stroke: '#333', 
          strokeWidth: 1,
        },
        // Add curvature for more pronounced curves 
        data: {
          curvature: 0.8
        }
      });
    });

    return flowEdges;
  }, []);
  // Set up state hooks for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    // Handle edge connections
  const onConnect = useCallback(    (connection: Connection) => {
      setEdges(eds => addEdge({
        ...connection,
        type: 'bezier',
        animated: false,
        style: { 
          stroke: '#333', 
          strokeWidth: 1,
        },
        data: {
          curvature: 0.8
        }
      }, eds));
    },
    [setEdges]
  );

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
          mindMapData={mindMapData}
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
              panOnScroll={true}              defaultEdgeOptions={{
                type: 'bezier',
                animated: false,
                style: { strokeWidth: 1, stroke: '#333' },
                data: { curvature: 0.8 }
              }}
            >
              <Controls className="bg-neutral-800 text-white border-neutral-700" />
              <Background color="#333" gap={16} size={1} />
            </ReactFlow>
          </div>
        </div>
      </div>
      
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
