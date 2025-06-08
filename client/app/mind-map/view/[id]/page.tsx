"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { FloatingDock } from "@/components/ui/floating-dock";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconCheck,
  IconCircle,
} from "@tabler/icons-react";

export default function MindMapView() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  
  // Mind map topics data
  const mindMapTopics = [
    {
      id: 'photosynthesis',
      label: 'Photosynthesis',
      href: '#',
      icon: <IconCheck className="h-5 w-5 shrink-0 text-green-500" />,
      isRead: true,
      subtopics: [
        { id: 'light-dependent', label: 'Light-Dependent Reactions', href: '#', icon: <IconCheck className="h-4 w-4 shrink-0 text-green-500" />, isRead: true },
        { id: 'light-independent', label: 'Light-Independent Reactions', href: '#', icon: <IconCircle className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" />, isRead: false },
        { id: 'chloroplast-structure', label: 'Chloroplast Structure', href: '#', icon: <IconCheck className="h-4 w-4 shrink-0 text-green-500" />, isRead: true },
      ]
    },
    {
      id: 'factors-affecting',
      label: 'Factors Affecting Photosynthesis',
      href: '#',
      icon: <IconCircle className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      isRead: false,
      subtopics: [
        { id: 'light-intensity', label: 'Light Intensity', href: '#', icon: <IconCircle className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" />, isRead: false },
        { id: 'temperature', label: 'Temperature', href: '#', icon: <IconCircle className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" />, isRead: false },
        { id: 'carbon-dioxide', label: 'CO2 Concentration', href: '#', icon: <IconCircle className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" />, isRead: false },
        { id: 'water-availability', label: 'Water Availability', href: '#', icon: <IconCircle className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" />, isRead: false },
      ]
    },
    {
      id: 'products-reactants',
      label: 'Products and Reactants',
      href: '#',
      icon: <IconCheck className="h-5 w-5 shrink-0 text-green-500" />,
      isRead: true,
      subtopics: [
        { id: 'glucose', label: 'Glucose Production', href: '#', icon: <IconCheck className="h-4 w-4 shrink-0 text-green-500" />, isRead: true },
        { id: 'oxygen', label: 'Oxygen Release', href: '#', icon: <IconCheck className="h-4 w-4 shrink-0 text-green-500" />, isRead: true },
        { id: 'water-consumption', label: 'Water Consumption', href: '#', icon: <IconCircle className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" />, isRead: false },
        { id: 'co2-absorption', label: 'CO2 Absorption', href: '#', icon: <IconCircle className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" />, isRead: false },
      ]
    },
  ];

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
    },  ];

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col overflow-hidden bg-black md:flex-row",
        "h-screen", // Full screen height
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            
            {/* Progress Summary */}
            {open && (
              <div className="px-3 py-3 mb-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 mx-2">
                <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">
                  Learning Progress
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-3/5"></div>
                  </div>
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">60%</span>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  7 of 11 topics completed
                </div>
              </div>
            )}
            
            <div className="mt-2 flex flex-col gap-4">
              {mindMapTopics.map((topic, idx) => (
                <div key={topic.id} className="space-y-2">
                  {/* Main Topic */}
                  <div className="relative">
                    <SidebarLink 
                      link={topic} 
                      className="font-semibold text-base border-l-4 border-transparent hover:border-blue-500 transition-all duration-200"
                    />
                  </div>
                    {/* Subtopics Container - Only show when sidebar is open */}
                  {open && (
                    <div className="ml-4 border-l-2 border-neutral-200 dark:border-neutral-700 pl-4 space-y-1">
                      {topic.subtopics.map((subtopic, subIdx) => (
                        <div key={subtopic.id} className="relative">
                          {/* Connection line to parent */}
                          <div className="absolute -left-4 top-3 w-3 h-px bg-neutral-200 dark:bg-neutral-700"></div>
                          <SidebarLink
                            link={subtopic}
                            className="text-sm py-2 pl-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}            </div>
          </div>
        </SidebarBody>
      </Sidebar>      <MindMapContent dockLinks={dockLinks} />
    </div>
  );
}

export const Logo = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-3 px-2 text-sm font-normal text-black border-b border-neutral-200 dark:border-neutral-700 mb-2"
    >
      <div className="h-6 w-6 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold whitespace-pre text-black dark:text-white text-base"
      >
        Mind Map Topics
      </motion.span>
    </a>
  );
};

export const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center justify-center py-3 text-sm font-normal text-black border-b border-neutral-200 dark:border-neutral-700 mb-2"
    >
      <div className="h-6 w-6 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
    </a>
  );
};

// Mind Map Content component replacing the dummy Dashboard
const MindMapContent = ({ dockLinks }: { dockLinks: any[] }) => {
  return (
    <div className="flex flex-1">
      <div className="flex h-full w-full flex-1 flex-col rounded-tl-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h1 className="text-2xl font-bold text-black dark:text-white">Photosynthesis Mind Map</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Interactive learning visualization</p>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 relative overflow-hidden">
            {/* Central Node */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-blue-600 text-white px-8 py-6 rounded-xl shadow-2xl border border-blue-500">
                <h3 className="text-2xl font-bold text-center">Photosynthesis</h3>
                <p className="text-blue-100 text-center mt-2 font-mono">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</p>
              </div>
            </div>
            
            {/* Topic Nodes */}
            <div className="absolute top-20 left-20">
              <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-xl border border-green-500 cursor-pointer hover:bg-green-700 transition-colors">
                <h4 className="font-semibold">Light Reactions</h4>
                <p className="text-green-100 text-sm">Thylakoid membranes</p>
              </div>
            </div>
            
            <div className="absolute top-20 right-20">
              <div className="bg-purple-600 text-white px-6 py-4 rounded-lg shadow-xl border border-purple-500 cursor-pointer hover:bg-purple-700 transition-colors">
                <h4 className="font-semibold">Calvin Cycle</h4>
                <p className="text-purple-100 text-sm">Stroma reactions</p>
              </div>
            </div>
            
            <div className="absolute bottom-20 left-20">
              <div className="bg-orange-600 text-white px-6 py-4 rounded-lg shadow-xl border border-orange-500 cursor-pointer hover:bg-orange-700 transition-colors">
                <h4 className="font-semibold">Chloroplast Structure</h4>
                <p className="text-orange-100 text-sm">Organelle anatomy</p>
              </div>
            </div>
            
            <div className="absolute bottom-20 right-20">
              <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl border border-red-500 cursor-pointer hover:bg-red-700 transition-colors">
                <h4 className="font-semibold">Limiting Factors</h4>
                <p className="text-red-100 text-sm">Environmental controls</p>
              </div>
            </div>
            
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>
              <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="#6b7280" strokeWidth="2" 
                strokeDasharray="8,4" markerEnd="url(#arrowhead)" />
              <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="#6b7280" strokeWidth="2" 
                strokeDasharray="8,4" markerEnd="url(#arrowhead)" />
              <line x1="50%" y1="50%" x2="20%" y2="80%" stroke="#6b7280" strokeWidth="2" 
                strokeDasharray="8,4" markerEnd="url(#arrowhead)" />
              <line x1="50%" y1="50%" x2="80%" y2="80%" stroke="#6b7280" strokeWidth="2" 
                strokeDasharray="8,4" markerEnd="url(#arrowhead)" />
            </svg>
            
            {/* Instructions */}
            <div className="absolute bottom-6 left-6">
              <div className="bg-neutral-700 text-neutral-300 px-4 py-2 rounded-lg text-sm">
                💡 Click on nodes to explore • Use sidebar to navigate topics
              </div>
            </div>
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
};
