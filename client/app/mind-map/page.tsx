"use client";
import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap
} from "@tabler/icons-react";

export default function MindMap() {
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
    <div className="min-h-screen bg-black text-white relative">
      {/* Main Content */}
      <main className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        {/* Page Header */}
        <div className="text-center mb-16 z-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent mb-4">
            AI Mind Map Studio 🧠
          </h1>
          <p className="text-gray-400 text-lg">
            Create interactive mind maps powered by AI to visualize your knowledge
          </p>
        </div>

        {/* Mind Map Canvas */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 max-w-4xl w-full h-96 mb-16 z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Mind Map Canvas</h3>
            <p className="text-gray-500 mb-4">Start creating your interactive mind map</p>
            <div className="space-x-4">
              <button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105">
                New Map
              </button>
              <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300">
                Import Map
              </button>
            </div>
          </div>
        </div>

        {/* Recent Mind Maps */}
        <div className="max-w-4xl w-full z-10">
          <h2 className="text-2xl font-bold text-gray-300 mb-6">Recent Mind Maps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:scale-105 transition-transform duration-300 cursor-pointer">
              <h3 className="text-lg font-semibold text-purple-300 mb-2">Machine Learning Concepts</h3>
              <p className="text-gray-400 text-sm mb-4">Last edited 2 hours ago</p>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">AI Enhanced</span>
                <span className="text-xs text-gray-500">23 nodes</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-sm border border-blue-500/20 rounded-xl p-6 hover:scale-105 transition-transform duration-300 cursor-pointer">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">React Ecosystem</h3>
              <p className="text-gray-400 text-sm mb-4">Last edited yesterday</p>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">Collaborative</span>
                <span className="text-xs text-gray-500">47 nodes</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-sm border border-green-500/20 rounded-xl p-6 hover:scale-105 transition-transform duration-300 cursor-pointer">
              <h3 className="text-lg font-semibold text-green-300 mb-2">Study Plan</h3>
              <p className="text-gray-400 text-sm mb-4">Last edited 3 days ago</p>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Personal</span>
                <span className="text-xs text-gray-500">15 nodes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Dock */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <FloatingDock
            mobileClassName="translate-y-20"
            items={dockLinks}
          />
        </div>

        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"></div>
        </div>
      </main>
    </div>
  );
}
