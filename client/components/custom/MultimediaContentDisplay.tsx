"use client";

import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { IconPlay, IconExternalLink, IconBookmark, IconVideo, IconPhoto, IconFileText, IconChevronDown, IconChevronUp, IconBrandYoutube } from "@tabler/icons-react";
import ContentFormatter from "@/components/ui/content-formatter";

interface MultimediaImage {
  url: string;
  title: string;
  source?: string;
  thumbnail?: string;
}

interface MultimediaVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  embedUrl: string;
  channelTitle: string;
  publishedAt: string;
}

interface MultimediaReference {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

interface MultimediaContent {
  images: MultimediaImage[];
  videos: MultimediaVideo[];
  references: MultimediaReference[];
}

interface MultimediaContentDisplayProps {
  content: string;
  multimedia?: MultimediaContent;
  className?: string;
}

export const MultimediaContentDisplay: React.FC<MultimediaContentDisplayProps> = ({
  content,
  multimedia,
  className
}) => {
  const [expandedSections, setExpandedSections] = useState<{
    images: boolean;
    videos: boolean;
    references: boolean;
  }>({
    images: false,
    videos: false,
    references: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Content */}
      <div className="bg-neutral-800 border border-neutral-600 rounded-lg p-6">
        <ContentFormatter content={content} className="w-full" />
      </div>

      {/* Multimedia Learning Resources */}
      {multimedia && (
        <div className="space-y-4">
          {/* Images Section */}
          {multimedia.images && multimedia.images.length > 0 && (
            <div className="bg-neutral-800 border border-neutral-600 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('images')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <IconPhoto className="h-5 w-5 text-blue-400" />
                  <h4 className="text-lg font-medium text-white">Visual Learning</h4>
                  <span className="text-sm text-neutral-400">({multimedia.images.length} images)</span>
                </div>
                {expandedSections.images ? (
                  <IconChevronUp className="h-5 w-5 text-neutral-400" />
                ) : (
                  <IconChevronDown className="h-5 w-5 text-neutral-400" />
                )}
              </button>
              
              {expandedSections.images && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {multimedia.images.map((image, index) => (
                      <div key={index} className="bg-neutral-700 rounded-lg overflow-hidden">
                        <div className="aspect-video relative bg-neutral-600 flex items-center justify-center">
                          <img
                            src={image.thumbnail || image.url}
                            alt={image.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />                          <div className="hidden absolute inset-0 items-center justify-center">
                            <IconPhoto className="h-12 w-12 text-neutral-400" />
                          </div>
                        </div>
                        <div className="p-4">
                          <h5 className="font-medium text-white text-sm mb-2 line-clamp-2">{image.title}</h5>
                          {image.source && (
                            <p className="text-xs text-neutral-400 mb-2">Source: {image.source}</p>
                          )}
                          <a
                            href={image.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                          >
                            View Full Image <IconExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Videos Section */}
          {multimedia.videos && multimedia.videos.length > 0 && (
            <div className="bg-neutral-800 border border-neutral-600 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('videos')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <IconVideo className="h-5 w-5 text-red-400" />
                  <h4 className="text-lg font-medium text-white">Video Learning</h4>
                  <span className="text-sm text-neutral-400">({multimedia.videos.length} videos)</span>
                </div>
                {expandedSections.videos ? (
                  <IconChevronUp className="h-5 w-5 text-neutral-400" />
                ) : (
                  <IconChevronDown className="h-5 w-5 text-neutral-400" />
                )}
              </button>
              
              {expandedSections.videos && (
                <div className="px-6 pb-6">
                  <div className="space-y-4">
                    {multimedia.videos.map((video, index) => (
                      <div key={index} className="bg-neutral-700 rounded-lg overflow-hidden">
                        <div className="aspect-video relative">
                          <iframe
                            src={video.embedUrl}
                            title={video.title}
                            className="w-full h-full"
                            allowFullScreen
                            loading="lazy"
                          />
                        </div>
                        <div className="p-4">
                          <h5 className="font-medium text-white mb-2 line-clamp-2">{video.title}</h5>
                          <p className="text-sm text-neutral-300 mb-3 line-clamp-2">{video.description}</p>
                          <div className="flex items-center justify-between text-xs text-neutral-400">
                            <div className="flex items-center gap-2">
                              <IconBrandYoutube className="h-4 w-4 text-red-500" />
                              <span>{video.channelTitle}</span>
                            </div>
                            <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* References Section */}
          {multimedia.references && multimedia.references.length > 0 && (
            <div className="bg-neutral-800 border border-neutral-600 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('references')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <IconFileText className="h-5 w-5 text-green-400" />
                  <h4 className="text-lg font-medium text-white">References & Articles</h4>
                  <span className="text-sm text-neutral-400">({multimedia.references.length} sources)</span>
                </div>
                {expandedSections.references ? (
                  <IconChevronUp className="h-5 w-5 text-neutral-400" />
                ) : (
                  <IconChevronDown className="h-5 w-5 text-neutral-400" />
                )}
              </button>
              
              {expandedSections.references && (
                <div className="px-6 pb-6">
                  <div className="space-y-3">
                    {multimedia.references.map((reference, index) => (
                      <div key={index} className="bg-neutral-700 rounded-lg p-4 hover:bg-neutral-600 transition-colors">
                        <a
                          href={reference.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <h5 className="font-medium text-white mb-2 hover:text-blue-300 transition-colors line-clamp-2">
                            {reference.title}
                          </h5>
                          <p className="text-sm text-neutral-300 mb-3 line-clamp-3">{reference.snippet}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-blue-400">
                              <IconExternalLink className="h-3 w-3" />
                              <span>Read More</span>
                            </div>
                            {reference.score && (
                              <div className="flex items-center gap-1">
                                <IconBookmark className="h-3 w-3 text-yellow-400" />
                                <span className="text-xs text-neutral-400">
                                  Relevance: {Math.round(reference.score * 100)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultimediaContentDisplay;
