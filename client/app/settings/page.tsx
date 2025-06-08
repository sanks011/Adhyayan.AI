"use client";
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconUser,
  IconBell,
  IconShield,
  IconPalette,
  IconLanguage
} from "@tabler/icons-react";

export default function Settings() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');

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

  const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: IconUser },
    { id: 'notifications', label: 'Notifications', icon: IconBell },
    { id: 'privacy', label: 'Privacy', icon: IconShield },
    { id: 'appearance', label: 'Appearance', icon: IconPalette },
    { id: 'language', label: 'Language', icon: IconLanguage },
  ];

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Main Content */}
      <main className="min-h-screen flex flex-col items-center justify-start p-8 pt-24 relative">
        {/* Page Header */}
        <div className="text-center mb-12 z-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent mb-4">
            Settings ⚙️
          </h1>
          <p className="text-gray-400 text-lg">
            Customize your Adhyayan AI experience
          </p>
        </div>

        {/* Settings Container */}
        <div className="max-w-4xl w-full z-10 mb-20">
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
            {/* Settings Tabs */}
            <div className="flex border-b border-gray-700/50">
              {settingsTabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-orange-500/20 text-orange-300 border-b-2 border-orange-500'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Settings Content */}
            <div className="p-8">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-200 mb-6">Profile Settings</h2>
                  
                  <div className="flex items-center space-x-6 mb-8">
                    <img 
                      src={user.photoURL || '/default-avatar.png'} 
                      alt={user.displayName || 'User'} 
                      className="w-20 h-20 rounded-full border-4 border-orange-500/30"
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-white">{user.displayName}</h3>
                      <p className="text-gray-400">{user.email}</p>
                      <button className="mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors">
                        Change Avatar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user.displayName || ''}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue={user.email || ''}
                        disabled
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-200 mb-6">Notification Preferences</h2>
                  
                  <div className="space-y-4">
                    {[
                      { label: 'Email notifications', desc: 'Receive updates via email' },
                      { label: 'Push notifications', desc: 'Get notified on your device' },
                      { label: 'Study reminders', desc: 'Daily learning reminders' },
                      { label: 'Achievement alerts', desc: 'When you earn badges or complete courses' },
                      { label: 'Social updates', desc: 'When friends join study rooms' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                        <div>
                          <h3 className="text-white font-medium">{item.label}</h3>
                          <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-200 mb-6">Privacy & Security</h2>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-800/30 rounded-lg">
                      <h3 className="text-white font-medium mb-2">Profile Visibility</h3>
                      <p className="text-gray-400 text-sm mb-4">Control who can see your profile and learning progress</p>
                      <select className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option>Public - Everyone can see</option>
                        <option>Friends - Only friends can see</option>
                        <option>Private - Only you can see</option>
                      </select>
                    </div>

                    <div className="p-4 bg-gray-800/30 rounded-lg">
                      <h3 className="text-white font-medium mb-2">Data Export</h3>
                      <p className="text-gray-400 text-sm mb-4">Download your learning data and progress</p>
                      <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                        Export Data
                      </button>
                    </div>

                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <h3 className="text-red-300 font-medium mb-2">Delete Account</h3>
                      <p className="text-gray-400 text-sm mb-4">Permanently delete your account and all data</p>
                      <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-200 mb-6">Appearance</h2>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-800/30 rounded-lg">
                      <h3 className="text-white font-medium mb-4">Theme</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {['Dark', 'Light', 'Auto'].map((theme) => (
                          <label key={theme} className="cursor-pointer">
                            <input type="radio" name="theme" className="sr-only peer" defaultChecked={theme === 'Dark'} />
                            <div className="p-4 bg-gray-700 peer-checked:bg-orange-500/20 peer-checked:border-orange-500 border border-gray-600 rounded-lg text-center transition-colors">
                              <span className="text-white font-medium">{theme}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-800/30 rounded-lg">
                      <h3 className="text-white font-medium mb-4">Accent Color</h3>
                      <div className="grid grid-cols-6 gap-4">
                        {['orange', 'blue', 'green', 'purple', 'red', 'yellow'].map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full bg-${color}-500 hover:scale-110 transition-transform ${
                              color === 'orange' ? 'ring-2 ring-white' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'language' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-200 mb-6">Language & Region</h2>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-800/30 rounded-lg">
                      <h3 className="text-white font-medium mb-2">Display Language</h3>
                      <p className="text-gray-400 text-sm mb-4">Choose your preferred language for the interface</p>
                      <select className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                        <option>Hindi</option>
                        <option>Mandarin</option>
                      </select>
                    </div>

                    <div className="p-4 bg-gray-800/30 rounded-lg">
                      <h3 className="text-white font-medium mb-2">Time Zone</h3>
                      <p className="text-gray-400 text-sm mb-4">Set your local time zone for accurate scheduling</p>
                      <select className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option>UTC-5 (Eastern Time)</option>
                        <option>UTC-6 (Central Time)</option>
                        <option>UTC-7 (Mountain Time)</option>
                        <option>UTC-8 (Pacific Time)</option>
                        <option>UTC+0 (GMT)</option>
                        <option>UTC+5:30 (IST)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105">
                  Save Changes
                </button>
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
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
        </div>
      </main>
    </div>
  );
}
