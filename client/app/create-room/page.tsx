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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-600 bg-clip-text text-transparent mb-4">
            Create Study Room 🏠
          </h1>
          <p className="text-gray-400 text-lg">
            Set up a collaborative learning space with your peers
          </p>
        </div>

        {/* Room Creation Form */}
        <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 max-w-md w-full mb-16 z-10">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Name
              </label>
              <input
                type="text"
                placeholder="Enter room name..."
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject
              </label>
              <select className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Select subject...</option>
                <option value="math">Mathematics</option>
                <option value="science">Science</option>
                <option value="programming">Programming</option>
                <option value="language">Language Arts</option>
                <option value="history">History</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Privacy
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="radio" name="privacy" value="public" className="mr-2 text-blue-500" />
                  <span className="text-gray-300">Public - Anyone can join</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="privacy" value="private" className="mr-2 text-blue-500" />
                  <span className="text-gray-300">Private - Invite only</span>
                </label>
              </div>
            </div>

            <button className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105">
              Create Room
            </button>
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
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>
      </main>
    </div>
  );
}
