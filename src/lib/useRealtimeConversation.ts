import { useState, useEffect, useCallback } from "react";

export type RealtimeMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
};

export type RealtimeState = {
  messages: RealtimeMessage[];
  isRecording: boolean;
  isAiResponding: boolean;
  error: string | null;
};

export const useRealtimeConversation = () => {
  // State for the realtime conversation
  const [messages, setMessages] = useState<RealtimeMessage[]>([
    {
      id: "welcome-message",
      sender: "ai",
      text: "Hello! How can I help you today? Just start speaking and I'll respond in real-time.",
      timestamp: new Date()
    }
  ]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isAiResponding, setIsAiResponding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Mock simulation for now, to be replaced with actual WebSocket implementation
  const startRecording = useCallback(() => {
    if (isAiResponding) return;
    
    setIsRecording(true);
    setError(null);
    
    // Would connect to speech recognition service in real implementation
    console.log("Recording started...");
  }, [isAiResponding]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    
    setIsRecording(false);
    
    // Simulate speech recognition result
    const mockUserMessage: RealtimeMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: "Can you tell me about the weather today?",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, mockUserMessage]);
    
    // Simulate AI response with a delay
    setTimeout(() => {
      setIsAiResponding(true);
      
      // Simulate AI thinking and response generation
      setTimeout(() => {
        const mockAiResponse: RealtimeMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: "I don't have real-time access to current weather data, but I'd be happy to discuss weather patterns or help you understand forecasts if you have specific information you'd like to explore!",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, mockAiResponse]);
        setIsAiResponding(false);
      }, 3000); // Simulate 3 seconds of AI "thinking"
    }, 1000);
  }, [isRecording]);

  const cancelRealtimeConversation = useCallback(() => {
    if (!isRecording && !isAiResponding) return;
    
    setIsRecording(false);
    setIsAiResponding(false);
    setError(null);
    
    // Would disconnect from speech recognition service in real implementation
    console.log("Recording cancelled");
  }, [isRecording, isAiResponding]);

  const startNewConversation = useCallback(() => {
    setMessages([
      {
        id: "welcome-message",
        sender: "ai",
        text: "Hello! How can I help you today? Just start speaking and I'll respond in real-time.",
        timestamp: new Date()
      }
    ]);
    
    setIsRecording(false);
    setIsAiResponding(false);
    setError(null);
  }, []);

  // Clean up function
  useEffect(() => {
    return () => {
      if (isRecording || isAiResponding) {
        // Clean up any connections or processes
        console.log("Cleaning up realtime conversation resources");
      }
    };
  }, [isRecording, isAiResponding]);

  return {
    state: {
      messages,
      isRecording,
      isAiResponding,
      error
    },
    actions: {
      startRecording,
      stopRecording,
      cancelRealtimeConversation,
      startNewConversation
    }
  };
};
