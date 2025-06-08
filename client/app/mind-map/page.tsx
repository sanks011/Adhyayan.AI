"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { FloatingDock } from "@/components/ui/floating-dock";
import { WavyBackground } from "@/components/ui/wavy-background";
import { Textarea, Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react";
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconMicrophone,
  IconMicrophoneOff,
  IconPlus
} from "@tabler/icons-react";

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

export default function MindMap() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  // Form states
  const [subjectName, setSubjectName] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  
  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const speechRecognition = new (window as any).webkitSpeechRecognition();
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';
      
      speechRecognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setSyllabus(prev => prev + ' ' + finalTranscript);
        }
      };
      
      speechRecognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      speechRecognition.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(speechRecognition);
    }
  }, []);
  
  const toggleVoiceInput = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };
  
  const handleCreateMindMap = () => {
    if (!subjectName.trim()) {
      alert('Please enter a subject name');
      return;
    }
    
    // Here you would typically send the data to your backend
    console.log('Creating mind map:', { subjectName, syllabus });
    
    // Reset form and close modal
    setSubjectName("");
    setSyllabus("");
    onOpenChange();
    
    // Show success message or navigate to the created mind map
    alert('Mind map created successfully!');
  };

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

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        {/* Page Header */}
        <div className="text-center mb-16 z-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            Mind Map Studio
          </h1>
          <p className="text-neutral-200 text-lg">
            Create and manage your knowledge maps
          </p>
        </div>

        {/* Main Action */}
        <div className="text-center mb-16 z-10">
          <Button 
            size="lg"
            className="bg-white text-black hover:bg-neutral-200 font-medium px-8 py-3"
            onPress={onOpen}
            startContent={<IconPlus className="w-5 h-5" />}
          >
            Create New Mind Map
          </Button>
        </div>        {/* Floating Dock */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <FloatingDock
            mobileClassName="translate-y-20"
            items={dockLinks}
          />
        </div>

        {/* Create Mind Map Modal */}
        <Modal 
          isOpen={isOpen} 
          onOpenChange={onOpenChange}
          placement="center"
          backdrop="blur"
          size="2xl"
          classNames={{
            base: "bg-neutral-900 border border-neutral-700",
            header: "border-b border-neutral-700",
            body: "py-6",
            footer: "border-t border-neutral-700"
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold text-white">
                    Create New Mind Map
                  </h2>
                  <p className="text-neutral-400 text-sm font-normal">
                    Enter your subject details to generate a mind map
                  </p>
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-6">
                    {/* Subject Name Input */}
                    <div>
                      <Input
                        label="Subject Name"
                        labelPlacement="outside"
                        placeholder="Enter your subject name"
                        value={subjectName}
                        onValueChange={setSubjectName}
                        variant="bordered"
                        classNames={{
                          input: "text-white",
                          label: "text-neutral-300 font-medium",
                          inputWrapper: "border-neutral-600 hover:border-neutral-500 focus-within:border-white"
                        }}
                        required
                      />
                    </div>

                    {/* Syllabus Input */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-neutral-300 font-medium text-sm">
                          Syllabus (Optional)
                        </label>
                        <Button
                          size="sm"
                          variant={isListening ? "solid" : "bordered"}
                          color={isListening ? "danger" : "default"}
                          onPress={toggleVoiceInput}
                          startContent={
                            isListening ? (
                              <IconMicrophoneOff className="w-4 h-4" />
                            ) : (
                              <IconMicrophone className="w-4 h-4" />
                            )
                          }
                          className={isListening ? "animate-pulse" : ""}
                        >
                          {isListening ? "Stop" : "Voice"}
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Enter your syllabus content or use voice input..."
                        value={syllabus}
                        onValueChange={setSyllabus}
                        variant="bordered"
                        minRows={6}
                        maxRows={10}
                        classNames={{
                          input: "text-white",
                          inputWrapper: "border-neutral-600 hover:border-neutral-500 focus-within:border-white"
                        }}
                      />
                      {isListening && (
                        <p className="text-sm text-neutral-400 mt-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          Listening... Speak now to add content
                        </p>
                      )}
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button 
                    color="default" 
                    variant="light" 
                    onPress={onClose}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-white text-black hover:bg-neutral-200 font-medium"
                    onPress={handleCreateMindMap}
                    isDisabled={!subjectName.trim()}
                  >
                    Create Mind Map
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </WavyBackground>
    </div>
  );
}
