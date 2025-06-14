'use client';

import React, { useEffect, useState } from 'react';
import { IconCoin, IconPlus, IconSparkles } from '@tabler/icons-react';
import { apiService } from '@/lib/api';

interface GyanPointsDisplayProps {
  className?: string;
  variant?: 'compact' | 'detailed';
}

export const GyanPointsDisplay: React.FC<GyanPointsDisplayProps> = ({ 
  className = '',
  variant = 'compact'
}) => {
  const [points, setPoints] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        setIsLoading(true);
        const userData = await apiService.getUserProfile();
        setPoints(userData.gyanPoints);
      } catch (error) {
        console.error('Failed to fetch Gyan Points:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoints();
  }, []);

  const handleRechargeClick = () => {
    // For now, just show an alert
    alert('Recharge functionality will be available soon!');
  };

  if (isLoading) {
    return (
      <div className={`group relative ${className}`}>
        <div className="flex items-center gap-2 px-4 py-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white/70 font-medium text-sm">
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 animate-pulse" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`group relative ${className}`}>
        <div 
          onClick={handleRechargeClick}
          className="flex flex-col items-center gap-2 p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl text-white hover:bg-black/30 transition-all duration-300 cursor-pointer hover:scale-105 hover:border-white/20"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
              <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-sm animate-pulse" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              {points !== null ? points : '--'}
            </span>
          </div>
          <span className="text-xs text-white/60 font-medium">Gyan Points</span>
          <div className="flex items-center gap-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">
            <IconPlus className="h-3 w-3" />
            <span>Add more</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative ${className}`}>
      <div 
        onClick={handleRechargeClick}
        className="flex items-center gap-2 px-4 py-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-black/30 transition-all duration-300 cursor-pointer hover:scale-105 hover:border-white/20"
      >
        <div className="relative">
          <IconCoin className="h-4 w-4 text-yellow-400" />
          <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-sm" />
        </div>
        <span className="font-semibold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
          {points !== null ? points : '--'}
        </span>
        <span className="text-sm text-white/70 font-medium">GP</span>
        
        {/* Hover effect */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <IconPlus className="h-3 w-3 text-white/60" />
        </div>
      </div>
        {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-amber-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
    </div>
  );
};

export default GyanPointsDisplay;
