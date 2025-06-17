"use client";

import { useState } from "react";
import RealtimeConversation from "@/components/realtime-conversation";

export default function RealtimeDemo() {
  const [ttsVoice, setTtsVoice] = useState<string>("nova");
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white p-4">
      <header className="w-full border-b border-zinc-800 pb-4 mb-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Parrot - Realtime Demo
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto">
        <RealtimeConversation 
          ttsVoice={ttsVoice}
          setTtsVoice={setTtsVoice}
          ttsSpeed={ttsSpeed}
          setTtsSpeed={setTtsSpeed}
        />
      </main>
    </div>
  );
}
