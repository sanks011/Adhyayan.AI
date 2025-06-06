'use client'; 

import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { StickyBanner } from "@/components/ui/sticky-banner";

const navItems = [
  { name: "Home", link: "/" },
  { name: "Features", link: "#features" },
  { name: "Pricing", link: "#pricing" },
  { name: "Contact", link: "#contact" },
];

interface ApiResponse {
  message: string;
  time: string;
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/test')
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="relative flex w-full flex-col overflow-y-auto">
      <StickyBanner className="bg-gradient-to-b from-blue-500 to-blue-600">
        <p className="mx-0 max-w-[90%] text-white drop-shadow-md">
          Bro someone just said that its the best out there 🥹.{" "}
          <a href="#" className="transition duration-200 hover:underline">
            Read article
          </a>
        </p>
      </StickyBanner>
      
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-4">
            <ThemeToggle className="h-10 w-10 rounded-full bg-neutral-100 shadow-md transition-all hover:shadow-lg dark:bg-neutral-800" />
          </div>
        </NavBody>
 
        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>
 
          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-neutral-600 dark:text-neutral-300"
              >
                <span className="block">{item.name}</span>
              </a>
            ))}
            <div className="flex w-full items-center justify-center py-4">
              <ThemeToggle className="h-12 w-12 rounded-full bg-neutral-100 shadow-md transition-all hover:shadow-lg dark:bg-neutral-800" />
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
      <DummyContent />
    </div>
  );
}

const DummyContent = () => {
  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 py-8">
      <div className="h-96 w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
      <div className="h-96 w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
      <div className="h-96 w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
    </div>
  );
};