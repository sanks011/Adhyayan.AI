"use client";

import { useState, useEffect } from "react";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has a preferred theme stored
    const storedTheme = localStorage.getItem("theme");
    const userPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (storedTheme === "dark" || (!storedTheme && userPrefersDark)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 700);
    
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button 
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-full p-2 transition-all duration-300",
        theme === "light" 
          ? "bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 hover:from-blue-200 hover:to-blue-100" 
          : "bg-gradient-to-br from-indigo-900 to-purple-900 text-yellow-300 hover:from-indigo-800 hover:to-purple-800",
        isAnimating && "animate-pulse",
        className
      )}
      aria-label="Toggle theme"
    >
      <span className={cn(
        "absolute inset-0 opacity-20",
        theme === "light" ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-200 via-transparent to-transparent" : 
        "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-400 via-transparent to-transparent"
      )} />
      
      <span className={cn(
        "relative transition-transform duration-500",
        isAnimating && (theme === "light" ? "rotate-[360deg]" : "-rotate-[360deg]")
      )}>
        {theme === "light" ? (
          <IconMoon size={20} strokeWidth={2} />
        ) : (
          <IconSun size={20} strokeWidth={2} />
        )}
      </span>
    </button>
  );
}
