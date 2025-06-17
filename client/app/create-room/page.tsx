"use client";
import React, { useState } from 'react';
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
  IconMap,
  IconDeviceGamepad2,
  IconUsersGroup
} from "@tabler/icons-react";

export default function CreateRoom() {
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
    },
    {
      title: "Dashboard",
      icon: (
        <IconBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/dashboard",
    },
    {
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
      title: "Settings",
      icon: (
        <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/settings",
    },
    {
      title: "Sign Out",
      icon: (
        <IconLogout className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: handleSignOut,
    },
  ];

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        {/* Gyan Points Display - Top Right Corner */}
        <div className="fixed top-4 right-4 z-50 md:top-6 md:right-8 lg:right-12">
          <GyanPointsDisplay />
        </div>
        
        {/* Main Content */}
        <main className="min-h-screen flex flex-col items-center justify-center relative z-10 max-w-4xl w-full">
          
          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-6">
              Choose Your Learning Path 🎯
            </h1>
            <p className="text-neutral-300 text-xl max-w-2xl mx-auto">
              Challenge yourself with a solo quiz or create a collaborative room for group learning
            </p>
          </div>

          {/* Options Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            
            {/* Solo Quiz Option */}
            <div 
              onClick={() => router.push('/solo-quiz')}
              className="group bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:border-green-500/50 hover:bg-green-500/5"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <IconDeviceGamepad2 className="h-10 w-10 text-white" />
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-green-400 transition-colors duration-300">
                  Solo Quiz
                </h3>
                
                <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
                  Test your knowledge with personalized quizzes. Track your progress and improve at your own pace.
                </p>
                
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                    Personal Progress
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                    Instant Feedback
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                    Adaptive Learning
                  </span>
                </div>
                
                <button className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform group-hover:scale-105 shadow-lg hover:shadow-xl">
                  Start Solo Quiz
                </button>
              </div>
            </div>

            {/* Create Room Option */}
            <div 
              onClick={() => router.push('/room-setup')}
              className="group bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:border-purple-500/50 hover:bg-purple-500/5"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <IconUsersGroup className="h-10 w-10 text-white" />
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors duration-300">
                  Create Room
                </h3>
                
                <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
                  Set up a collaborative learning space. Invite friends and learn together in real-time.
                </p>
                
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                    Group Learning
                  </span>
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm">
                    Real-time Collaboration
                  </span>
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-sm">
                    Share & Invite
                  </span>
                </div>
                
                <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform group-hover:scale-105 shadow-lg hover:shadow-xl">
                  Create Study Room
                </button>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-2xl">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">15K+</div>
              <div className="text-neutral-400 text-sm">Solo Quizzes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">8K+</div>
              <div className="text-neutral-400 text-sm">Study Rooms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">25K+</div>
              <div className="text-neutral-400 text-sm">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-400">98%</div>
              <div className="text-neutral-400 text-sm">Success Rate</div>
            </div>
          </div>

          {/* Floating Dock */}
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <FloatingDock
              mobileClassName="translate-y-20"
              items={dockLinks}
            />
          </div>
        </main>
      </WavyBackground>
    </div>
  );
}
