"use client";

import { cn } from "@/lib/utils";
import React, { useState } from "react";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
  IconCheck,
  IconCircle,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface MindMapTopic {
  id: string;
  title: string;
  isRead: boolean;
  subtopics: {
    id: string;
    title: string;
    isRead: boolean;
  }[];
}

interface MindMapSidebarProps {
  className?: string;
  mindMapData: MindMapTopic[];
  onTopicSelect?: (topicId: string) => void;
  onSubtopicSelect?: (topicId: string, subtopicId: string) => void;
}

export const MindMapSidebar: React.FC<MindMapSidebarProps> = ({
  className,
  mindMapData,
  onTopicSelect,
  onSubtopicSelect,
}) => {
  const [open, setOpen] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    let totalItems = 0;
    let completedItems = 0;

    mindMapData.forEach(topic => {
      if (topic.subtopics.length === 0) {
        // Topic without subtopics
        totalItems += 1;
        if (topic.isRead) completedItems += 1;
      } else {
        // Topic with subtopics - count subtopics
        totalItems += topic.subtopics.length;
        completedItems += topic.subtopics.filter(sub => sub.isRead).length;
      }
    });

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };
  const progressPercentage = calculateProgress();
  return (
    <Sidebar open={open} setOpen={setOpen}>
      <div className="flex flex-col h-full">
        {/* Main sidebar content - scrollable */}
        <SidebarBody className="flex-1 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Logo section */}
            <div className="flex-shrink-0">
              {open ? <Logo /> : <LogoIcon />}
            </div>
            
            {/* Scrollable topics section */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden mt-8">
              <div className="flex flex-col gap-2 pb-4">
                {mindMapData.map((topic, idx) => (
                  <div key={topic.id}>
                    {/* Topic with expand/collapse functionality */}
                    <SidebarLink
                      link={{
                        label: topic.title,
                        href: "#",
                        icon: topic.subtopics.length > 0 ? (
                          expandedTopics.includes(topic.id) ? (
                            <IconChevronDown className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                          ) : (
                            <IconChevronRight className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                          )
                        ) : null,
                      }}
                      onClick={() => {
                        if (topic.subtopics.length > 0) {
                          toggleTopic(topic.id);
                        }
                        onTopicSelect?.(topic.id);
                      }}
                      className="font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                      sidebarOpen={open}
                    />
                    
                    {/* Subtopics - only show when expanded and sidebar is open */}
                    {open && expandedTopics.includes(topic.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-6 border-l-2 border-neutral-200 dark:border-neutral-700 pl-4 space-y-1 mt-2"
                      >
                        {topic.subtopics.map((subtopic) => (
                          <div key={subtopic.id} className="relative">
                            {/* Connection line to parent */}
                            <div className="absolute -left-4 top-3 w-3 h-px bg-neutral-200 dark:border-neutral-700"></div>
                            <SidebarLink
                              link={{
                                label: subtopic.title,
                                href: "#",
                                icon: subtopic.isRead ? (
                                  <IconCheck className="text-green-500 h-4 w-4 flex-shrink-0" />
                                ) : (
                                  <IconCircle className="text-neutral-700 dark:text-neutral-200 h-4 w-4 flex-shrink-0" />
                                ),
                              }}
                              className="text-sm py-2 pl-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
                              onClick={() => onSubtopicSelect?.(topic.id, subtopic.id)}
                              sidebarOpen={open}
                            />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SidebarBody>
        
        {/* Progress Circle at Bottom - Fixed at absolute bottom */}
        <div className="flex-shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-700">
          <ProgressCircle percentage={progressPercentage} open={open} />
        </div>
      </div>
    </Sidebar>
  );
};

export const Logo = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        Mind Map Topics
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};



// Sidebar components
export const Sidebar = ({
  children,
  open,
  setOpen,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <>
      <DesktopSidebar open={open} setOpen={setOpen} animate={animate}>
        {children}
      </DesktopSidebar>
      <MobileSidebar open={open} setOpen={setOpen} animate={animate}>
        {children}
      </MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <>
      <motion.div
        className={cn(
          "h-full px-4 py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[300px] flex-shrink-0",
          "border-r border-neutral-200 dark:border-neutral-700"
        )}
        animate={{
          width: animate ? (open ? 300 : 60) : 300,
        }}
        onMouseEnter={() => setOpen?.(true)}
        onMouseLeave={() => setOpen?.(false)}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
        )}
      >
        <div className="flex justify-end z-20 w-full">
          <IconBrandTabler
            className="text-neutral-800 dark:text-neutral-200"
            onClick={() => setOpen?.(!open)}
          />
        </div>
        <motion.div
          animate={open ? { x: 0, opacity: 1 } : { x: "-100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn(
            "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
            open ? "block" : "hidden"
          )}
        >
          <div
            className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200"
            onClick={() => setOpen?.(!open)}
          >
            <IconArrowLeft />
          </div>
          {children}
        </motion.div>
      </div>
    </>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <motion.div
      className={cn(
        "flex flex-col flex-1 overflow-y-auto overflow-x-hidden",
        props.className
      )}
      {...props}
    />
  );
};

export const SidebarLink = ({
  link,
  className,
  onClick,
  sidebarOpen = true,
  ...props
}: {
  link: {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
  };
  className?: string;
  onClick?: () => void;
  sidebarOpen?: boolean;
  props?: any;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 w-full text-left",
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: sidebarOpen ? "inline-block" : "none",
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={{ duration: 0.1 }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </button>
  );
};

// Progress Circle Component
const ProgressCircle = ({ percentage, open }: { percentage: number; open: boolean }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn(
      "flex items-center transition-all duration-300",
      open ? "justify-start" : "justify-center"
    )}>
      {/* Progress Circle */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        <svg
          className="transform -rotate-90"
          width="48"
          height="48"
          viewBox="0 0 48 48"
        >
          {/* Background circle */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            className="text-neutral-300 dark:text-neutral-600"
          />
          {/* Progress circle */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="text-blue-500 transition-all duration-300 ease-in-out"
            strokeLinecap="round"
          />
        </svg>
        {/* Percentage text - always visible */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            {percentage}%
          </span>
        </div>
      </div>
      
      {/* Progress details - only show when sidebar is open */}
      {open && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.2 }}
          className="ml-3 overflow-hidden"
        >
          <div className="text-xs font-medium text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
            Learning Progress
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
            {Math.round((percentage / 100) * 11)} of 11 topics
          </div>
        </motion.div>
      )}
    </div>
  );
};
