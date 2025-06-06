import React from "react";
import { Timeline } from "@/components/ui/timeline";
import { BookOpen, Sparkles, Users, Rocket, CheckCircle } from "lucide-react";

export function CustomTimeline() {
  const data = [
    {
      title: "Future Learning",
      content: (
        <div>
          <p className="mb-4 text-sm font-normal text-gray-300">
            Our vision for AI-enhanced personalized education
          </p>
          <div className="flex items-center gap-2 mb-4">
            <Rocket className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-gray-200">
              Advanced Learning Path Customization
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80"
              alt="Future of AI learning"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_15px_rgba(59,_130,_246,_0.3)] md:h-44 lg:h-56"
            />
            <img
              src="https://images.unsplash.com/photo-1580894732930-0babd100d356?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80"
              alt="Virtual learning environments"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_15px_rgba(59,_130,_246,_0.3)] md:h-44 lg:h-56"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Present Learning",
      content: (
        <div>
          <p className="mb-4 text-sm font-normal text-gray-300">
            Current Adhyayan AI features enhancing education
          </p>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-200">
              <Sparkles className="h-4 w-4 text-purple-400" /> AI-Powered Learning
              Maps
            </div>
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-200">
              <BookOpen className="h-4 w-4 text-purple-400" /> Interactive Study
              Materials
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-200">
              <Users className="h-4 w-4 text-purple-400" /> Collaborative Learning
              Rooms
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2684&q=80"
              alt="Collaborative learning"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_15px_rgba(168,_85,_247,_0.3)] md:h-44 lg:h-56"
            />
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2671&q=80"
              alt="Students collaborating"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_15px_rgba(168,_85,_247,_0.3)] md:h-44 lg:h-56"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Learning Foundations",
      content: (
        <div>
          <p className="mb-4 text-sm font-normal text-gray-300">
            Where our educational journey began
          </p>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-200">
              <CheckCircle className="h-4 w-4 text-green-400" /> Mind mapping technology
            </div>
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-200">
              <CheckCircle className="h-4 w-4 text-green-400" /> Basic AI tutoring assistance
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-200">
              <CheckCircle className="h-4 w-4 text-green-400" /> Personalized learning paths
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80"
              alt="Education technology"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_15px_rgba(34,_197,_94,_0.3)] md:h-44 lg:h-56"
            />
            <img
              src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80"
              alt="Learning analytics"
              width={500}
              height={500}
              className="h-20 w-full rounded-lg object-cover shadow-[0_0_15px_rgba(34,_197,_94,_0.3)] md:h-44 lg:h-56"
            />
          </div>
        </div>
      ),
    },
  ];
  return (
    <div className="relative w-full overflow-hidden py-12 bg-black">
      <div className="container mx-auto px-4">
        <h2 className="mb-4 text-center text-3xl font-bold text-white md:text-4xl lg:text-5xl">
          Our Learning Evolution
        </h2>
        <Timeline data={data} />
      </div>
    </div>
  );
}
