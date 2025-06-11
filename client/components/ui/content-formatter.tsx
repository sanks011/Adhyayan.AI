"use client";
import React from 'react';
import { KatexRenderer } from './katex-renderer';

interface ContentFormatterProps {
  content: string;
  className?: string;
}

export function ContentFormatter({ content, className = '' }: ContentFormatterProps) {
  const formatContent = (text: string) => {
    if (!text) return [];

    const lines = text.split('\n');
    const formattedContent: JSX.Element[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        formattedContent.push(<br key={key++} />);
        continue;
      }

      // Handle equations (both inline and block)
      if (line.includes('$$') || line.includes('$')) {
        const parts = line.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/);
        const elements = parts.map((part, index) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            // Block equation
            const math = part.slice(2, -2);
            return <KatexRenderer key={`${key}-${index}`} math={math} block={true} />;
          } else if (part.startsWith('$') && part.endsWith('$')) {
            // Inline equation
            const math = part.slice(1, -1);
            return <KatexRenderer key={`${key}-${index}`} math={math} block={false} />;
          } else {
            return <span key={`${key}-${index}`}>{part}</span>;
          }
        });
        
        formattedContent.push(
          <div key={key++} className="my-2">
            {elements}
          </div>
        );
        continue;
      }

      // Handle headings
      if (line.startsWith('# ')) {
        formattedContent.push(
          <h1 key={key++} className="text-2xl font-bold text-white mt-6 mb-4">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        formattedContent.push(
          <h2 key={key++} className="text-xl font-semibold text-white mt-5 mb-3">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        formattedContent.push(
          <h3 key={key++} className="text-lg font-medium text-white mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      }
      // Handle bullet points
      else if (line.startsWith('- ') || line.startsWith('• ')) {
        formattedContent.push(
          <div key={key++} className="flex items-start my-1">
            <span className="text-neutral-400 mr-2 mt-1">•</span>
            <span className="text-neutral-200 flex-1">{line.slice(2)}</span>
          </div>
        );
      }
      // Handle numbered lists
      else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.+)$/);
        if (match) {
          formattedContent.push(
            <div key={key++} className="flex items-start my-1">
              <span className="text-neutral-400 mr-2 mt-1 font-medium">{match[1]}.</span>
              <span className="text-neutral-200 flex-1">{match[2]}</span>
            </div>
          );
        }
      }
      // Handle bold text
      else if (line.includes('**')) {
        const parts = line.split(/(\*\*[^*]+\*\*)/);
        const elements = parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`${key}-${index}`} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
          }
          return <span key={`${key}-${index}`}>{part}</span>;
        });
        
        formattedContent.push(
          <p key={key++} className="text-neutral-200 my-2 leading-relaxed">
            {elements}
          </p>
        );
      }
      // Regular paragraph
      else {
        formattedContent.push(
          <p key={key++} className="text-neutral-200 my-2 leading-relaxed">
            {line}
          </p>
        );
      }
    }

    return formattedContent;
  };

  return (
    <div className={`formatted-content ${className}`}>
      {formatContent(content)}
    </div>
  );
}
