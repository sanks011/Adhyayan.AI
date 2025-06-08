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

  return (
    <div
      className={cn(
        "rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 max-w-7xl mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden",
        "h-screen",
        className
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}            <div className="mt-8 flex flex-col gap-2">
              {mindMapData.map((topic, idx) => (
                <div key={topic.id}>                  {/* Topic with expand/collapse functionality */}
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
                          <div className="absolute -left-4 top-3 w-3 h-px bg-neutral-200 dark:bg-neutral-700"></div>
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
                          />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}            </div>
          </div>
        </SidebarBody>
      </Sidebar>
      <MindMapContent />
    </div>
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

const MindMapContent = () => {
  return (
    <div className="flex flex-1">
      <div className="p-2 md:p-10 rounded-tl-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full h-full">
        <div className="flex gap-2">
          {[...new Array(4)].map((i) => (
            <div
              key={"first-array" + i}
              className="h-20 w-full rounded-lg bg-gray-100 dark:bg-neutral-800 animate-pulse"
            ></div>
          ))}
        </div>
        <div className="flex gap-2 flex-1">
          {[...new Array(2)].map((i) => (
            <div
              key={"second-array" + i}
              className="h-full w-full rounded-lg bg-gray-100 dark:bg-neutral-800 animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    </div>
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
  ...props
}: {
  link: {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
  };
  className?: string;
  onClick?: () => void;
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
          display: "inline-block",
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </button>
  );
};
