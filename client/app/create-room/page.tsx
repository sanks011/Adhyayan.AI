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
  IconPlus,
  IconLock,
  IconWorld,
  IconCheck
} from "@tabler/icons-react";

export default function CreateRoom() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  
  // Form states
  const [roomName, setRoomName] = useState('');
  const [subject, setSubject] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [isCreating, setIsCreating] = useState(false);
  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Success - redirect to dashboard or room
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
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
  ];  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        
        {/* Gyan Points Display - Top Right Corner */}
        <div className="absolute top-6 right-6 z-20">
          <GyanPointsDisplay />
        </div>
        
        {/* Main Content */}
        <main className="min-h-screen flex flex-col items-center justify-center relative z-10 max-w-4xl w-full">
          
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
              Create Study Room 🏠
            </h1>
            <p className="text-neutral-300 text-xl">
              Set up a collaborative learning space with your peers
            </p>
          </div>

          {/* Room Creation Form */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 w-full max-w-2xl shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Room Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Room Name *
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter an engaging room name..."
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300"
                />
              </div>
              
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Subject
                </label>
                <select 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300"
                >
                  <option value="" className="bg-gray-800">Select subject...</option>
                  <option value="math" className="bg-gray-800">Mathematics</option>
                  <option value="science" className="bg-gray-800">Science</option>
                  <option value="programming" className="bg-gray-800">Programming</option>
                  <option value="language" className="bg-gray-800">Language Arts</option>
                  <option value="history" className="bg-gray-800">History</option>
                  <option value="physics" className="bg-gray-800">Physics</option>
                  <option value="chemistry" className="bg-gray-800">Chemistry</option>
                  <option value="biology" className="bg-gray-800">Biology</option>
                  <option value="other" className="bg-gray-800">Other</option>
                </select>
              </div>

              {/* Max Participants */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Max Participants
                </label>
                <select 
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300"
                >
                  <option value="5" className="bg-gray-800">5 participants</option>
                  <option value="10" className="bg-gray-800">10 participants</option>
                  <option value="15" className="bg-gray-800">15 participants</option>
                  <option value="20" className="bg-gray-800">20 participants</option>
                  <option value="25" className="bg-gray-800">25 participants</option>
                </select>
              </div>

              {/* Room Privacy */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-300 mb-4">
                  Room Privacy
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                    privacy === 'public' 
                      ? 'border-green-500/50 bg-green-500/10' 
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}>
                    <input 
                      type="radio" 
                      name="privacy" 
                      value="public" 
                      checked={privacy === 'public'}
                      onChange={(e) => setPrivacy(e.target.value)}
                      className="sr-only" 
                    />
                    <IconWorld className="h-6 w-6 text-green-400 mr-3" />
                    <div>
                      <div className="text-white font-medium">Public Room</div>
                      <div className="text-neutral-400 text-sm">Anyone can discover and join</div>
                    </div>
                    {privacy === 'public' && <IconCheck className="h-5 w-5 text-green-400 ml-auto" />}
                  </label>
                  
                  <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                    privacy === 'private' 
                      ? 'border-blue-500/50 bg-blue-500/10' 
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}>
                    <input 
                      type="radio" 
                      name="privacy" 
                      value="private" 
                      checked={privacy === 'private'}
                      onChange={(e) => setPrivacy(e.target.value)}
                      className="sr-only" 
                    />
                    <IconLock className="h-6 w-6 text-blue-400 mr-3" />
                    <div>
                      <div className="text-white font-medium">Private Room</div>
                      <div className="text-neutral-400 text-sm">Invite only access</div>
                    </div>
                    {privacy === 'private' && <IconCheck className="h-5 w-5 text-blue-400 ml-auto" />}
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Room Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you'll be studying and any guidelines for participants..."
                  rows={4}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 resize-none"
                />
              </div>

              {/* Create Button */}
              <div className="md:col-span-2 pt-4">
                <button 
                  onClick={handleCreateRoom}
                  disabled={isCreating || !roomName.trim()}
                  className="w-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 hover:from-green-600 hover:via-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                >
                  {isCreating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Room...
                    </>
                  ) : (
                    <>
                      <IconPlus className="h-5 w-5" />
                      Create Study Room
                    </>
                  )}
                </button>
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
        </main>
      </WavyBackground>
    </div>
  );
}
