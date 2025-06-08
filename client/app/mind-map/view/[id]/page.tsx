"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { FloatingDock } from "@/components/ui/floating-dock";
import { MindMapSidebar } from "@/components/custom/MindMapSidebar";
import { cn } from "@/lib/utils";
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
} from "@tabler/icons-react";

export default function MindMapView() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();

  // Mind map topics data - structured for the MindMapSidebar component
  const mindMapData = [
    {
      id: 'photosynthesis',
      title: 'Photosynthesis Overview',
      isRead: true,
      subtopics: [
        { id: 'light-dependent', title: 'Light-Dependent Reactions', isRead: true },
        { id: 'light-independent', title: 'Light-Independent Reactions', isRead: false },
        { id: 'chloroplast-structure', title: 'Chloroplast Structure', isRead: true },
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
    },  ];  return (
    <div className="h-screen bg-black">
      <MindMapSidebar 
        mindMapData={mindMapData}
        onTopicSelect={handleTopicSelect}
        onSubtopicSelect={handleSubtopicSelect}
      />
      
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
