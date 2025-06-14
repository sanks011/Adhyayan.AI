"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api';
import { Card, CardBody, Button, Skeleton } from "@heroui/react";
import { IconMap, IconCalendar, IconEye, IconChevronRight, IconBrain, IconPlus } from "@tabler/icons-react";
import toast from 'react-hot-toast';

interface MindMap {
  id: string;
  title: string;
  subject: string;
  created_at: string;
  updated_at: string;
  nodes_count?: number;
}

interface PreviousMindMapsProps {
  onCreateNew?: () => void;
}

export default function PreviousMindMaps({ onCreateNew }: PreviousMindMapsProps) {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchMindMaps();
  }, []);

  const fetchMindMaps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First try to get from API
      const response = await apiService.getMindMaps();
      
      if (response.success && response.mindMaps) {
        setMindMaps(response.mindMaps);
      } else {
        // Fallback to localStorage if API fails
        const localMindMaps = getLocalMindMaps();
        setMindMaps(localMindMaps);
      }
    } catch (error) {
      console.error('Error fetching mind maps:', error);
      
      // Fallback to localStorage
      const localMindMaps = getLocalMindMaps();
      setMindMaps(localMindMaps);
      
      if (localMindMaps.length === 0) {
        setError('Failed to load mind maps');
      }
    } finally {
      setLoading(false);
    }
  };

  const getLocalMindMaps = (): MindMap[] => {
    if (typeof window === 'undefined') return [];
    
    const localMindMaps: MindMap[] = [];
    
    // Get all localStorage keys that start with 'mindmap_'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mindmap_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const mindMapData = JSON.parse(data);
            localMindMaps.push({
              id: mindMapData.id || key.replace('mindmap_', ''),
              title: mindMapData.title || mindMapData.subject || 'Untitled Mind Map',
              subject: mindMapData.subject || mindMapData.title || 'Unknown Subject',
              created_at: mindMapData.created_at || new Date().toISOString(),
              updated_at: mindMapData.updated_at || mindMapData.created_at || new Date().toISOString(),
              nodes_count: mindMapData.nodes ? mindMapData.nodes.length : 0
            });
          }
        } catch (error) {
          console.error('Error parsing localStorage mind map:', error);
        }
      }
    }
    
    // Sort by creation date (newest first)
    return localMindMaps.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return 'Today';
      } else if (diffDays === 2) {
        return 'Yesterday';
      } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      return 'Recently';
    }
  };

  const handleViewMindMap = (mindMapId: string) => {
    router.push(`/mind-map/view/${mindMapId}`);
  };

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <IconBrain className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Your Mind Maps</h2>
        </div>        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-gray-800/50 border border-gray-700/50 animate-pulse">
              <CardBody className="p-4">
                <Skeleton className="h-4 w-3/4 mb-3 bg-gray-700" />
                <Skeleton className="h-3 w-1/2 mb-2 bg-gray-700" />
                <Skeleton className="h-3 w-1/3 bg-gray-700" />
                <div className="mt-4 pt-3 border-t border-gray-700/50">
                  <Skeleton className="h-8 w-full bg-gray-700" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && mindMaps.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <IconBrain className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Your Mind Maps</h2>
        </div>
        <Card className="bg-gray-800/50 border border-gray-700/50">
          <CardBody className="p-6 text-center">
            <p className="text-gray-400">Unable to load mind maps at the moment.</p>
            <Button 
              size="sm" 
              variant="light" 
              onPress={fetchMindMaps}
              className="mt-3 text-orange-400 hover:text-orange-300"
            >
              Try Again
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (mindMaps.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <IconBrain className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Your Mind Maps</h2>
        </div>        <Card className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-700/50 backdrop-blur-sm hover:border-gray-600/50 transition-all duration-300">
          <CardBody className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                <IconMap className="w-10 h-10 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-200 mb-2">No Mind Maps Yet</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                  Create your first mind map to see it here! Transform your learning materials into 
                  interactive visual knowledge maps that help you understand and remember better.
                </p>
              </div>              <div className="mt-2 text-xs text-gray-500">
                💡 Tip: Upload a file or paste your syllabus to get started quickly
              </div>
              {onCreateNew && (
                <Button
                  className="mt-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium transform hover:scale-105 transition-all duration-300"
                  onPress={onCreateNew}
                  startContent={<IconPlus className="w-4 h-4" />}
                >
                  Create Your First Mind Map
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconBrain className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Your Mind Maps</h2>
          <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded-full font-medium">
            {mindMaps.length}
          </span>
        </div>
      </div>      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mindMaps.slice(0, 8).map((mindMap, index) => (
          <Card 
            key={mindMap.id}
            className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 hover:border-orange-500/50 backdrop-blur-sm transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/10 group cursor-pointer animate-mindmap-fade-in"
            isPressable
            onPress={() => handleViewMindMap(mindMap.id)}
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            <CardBody className="p-5">
              <div className="flex items-start justify-between mb-3">                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm mb-1 truncate group-hover:text-orange-300 transition-colors">
                    {mindMap.title}
                  </h3>
                  <p className="text-gray-400 text-xs truncate group-hover:text-gray-300 transition-colors">
                    {mindMap.subject}
                  </p>
                </div>
                <div className="ml-3 opacity-50 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1">
                  <IconChevronRight className="w-4 h-4 text-orange-400" />
                </div>
              </div>              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <IconCalendar className="w-3 h-3" />
                  <span>{formatDate(mindMap.created_at)}</span>
                </div>
                {mindMap.nodes_count && mindMap.nodes_count > 0 && (
                  <div className="flex items-center gap-1">
                    <IconMap className="w-3 h-3" />
                    <span>{mindMap.nodes_count} nodes</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <Button
                  size="sm"
                  variant="light"
                  className="w-full text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0"
                  startContent={<IconEye className="w-4 h-4" />}
                  onPress={() => handleViewMindMap(mindMap.id)}
                >
                  View Mind Map
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>      {mindMaps.length > 8 && (
        <div className="mt-6 text-center">
          <Button
            variant="bordered"
            className="border-gray-600/50 text-gray-400 hover:border-orange-500/50 hover:text-orange-300 bg-gray-800/20 hover:bg-orange-500/5 transition-all duration-300"
            onPress={() => router.push('/mind-map/all')}
          >
            View All Mind Maps ({mindMaps.length})
          </Button>
        </div>
      )}
    </div>
  );
}
