"use client";
import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

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
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                Adhyayan AI
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img 
                  src={user.photoURL || '/default-avatar.png'} 
                  alt={user.displayName || 'User'} 
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm text-gray-300">{user.displayName}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user.displayName?.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-400">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-2">Learning Progress</h3>
            <div className="text-3xl font-bold mb-1">75%</div>
            <p className="text-blue-200 text-sm">This week</p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-2">Courses Completed</h3>
            <div className="text-3xl font-bold mb-1">12</div>
            <p className="text-green-200 text-sm">Total courses</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-2">Study Streak</h3>
            <div className="text-3xl font-bold mb-1">7</div>
            <p className="text-purple-200 text-sm">Days in a row</p>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:col-span-2 lg:col-span-3">
            <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold">📚</span>
                </div>
                <div>
                  <p className="text-white">Completed "Introduction to Machine Learning"</p>
                  <p className="text-gray-400 text-sm">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold">🎯</span>
                </div>
                <div>
                  <p className="text-white">Scored 95% on "Data Structures Quiz"</p>
                  <p className="text-gray-400 text-sm">Yesterday</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold">⭐</span>
                </div>
                <div>
                  <p className="text-white">Achieved "Fast Learner" badge</p>
                  <p className="text-gray-400 text-sm">3 days ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Learning */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:col-span-2 lg:col-span-3">
            <h3 className="text-xl font-semibold mb-4">Continue Learning</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer">
                <h4 className="font-semibold mb-2">Advanced React Concepts</h4>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '60%'}}></div>
                </div>
                <p className="text-sm text-gray-400">60% complete</p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer">
                <h4 className="font-semibold mb-2">Python for Data Science</h4>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{width: '30%'}}></div>
                </div>
                <p className="text-sm text-gray-400">30% complete</p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer">
                <h4 className="font-semibold mb-2">Web Development Basics</h4>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{width: '90%'}}></div>
                </div>
                <p className="text-sm text-gray-400">90% complete</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
