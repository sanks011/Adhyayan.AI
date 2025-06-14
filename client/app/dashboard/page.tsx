"use client";
import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { FloatingDock } from "@/components/ui/floating-dock";
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconPlus,
  IconMap
} from "@tabler/icons-react";

export default function Dashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

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
        <BlackHoleLoader />
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
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/",
    },    {
      title: "Create Room",
      icon: (
        <IconUsers className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/create-room",
    },
    {
      title: "Mind Map",
      icon: (
        <IconMap className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/mind-map",
    },
    {
      title: "AI Assistant",
      icon: (
        <IconBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#ai-assistant",
    },
    {
      title: "Settings",
      icon: (
        <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/settings",
    },{
      title: "Sign Out",
      icon: (
        <IconLogout className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: handleSignOut,
    },  ];  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        
        {/* Gyan Points Display - Top Right Corner */}
        <div className="absolute top-6 right-6 z-20">
          <GyanPointsDisplay />
        </div>

        {/* Welcome Message */}
        <div className="text-center mb-16 z-10">
          <div className="flex items-center justify-center mb-6">
            <img 
              src={user.photoURL || '/default-avatar.png'} 
              alt={user.displayName || 'User'} 
              className="w-20 h-20 rounded-full border-4 border-neutral-700 mr-4"
            />
            <div className="flex flex-col items-start">
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back, {user.displayName?.split(' ')[0]}! 👋
              </h1>
              <p className="text-neutral-200 text-lg">
                Ready to explore the future of AI-powered learning?
              </p>
            </div>
          </div>
        </div>

        {/* Floating Dock positioned like macOS taskbar */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <FloatingDock
            mobileClassName="translate-y-20"
            items={dockLinks}
          />
        </div>
      </WavyBackground>
    </div>
  );
}
