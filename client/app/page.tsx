'use client'; 

import { useEffect, useState } from 'react';
import { StickyBanner } from "@/components/ui/sticky-banner";

export default function Home() {
  const [data, setData] = useState(null);

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
          Bro someone just said that its the best out there.{" "}
          <a href="#" className="transition duration-200 hover:underline">
            Read article
          </a>
        </p>
      </StickyBanner>
      <div className="p-4">
        <h1>Adhyayan AI</h1>
        <p>Welcome to the Adhyayan AI!</p>
        {data ? (
          <p>Backend Response: {data.message} at {data.time}</p>
        ) : (
          <p>Loading...</p>
        )}
      </div>
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