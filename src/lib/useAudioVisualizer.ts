import { useState, useEffect, useRef, useCallback } from "react";

type VisualizationMode = "listening" | "responding" | "idle";

export const useAudioVisualizer = () => {
  const [visualizationData, setVisualizationData] = useState<number[]>(Array(64).fill(0));
  const [mode, setMode] = useState<VisualizationMode>("idle");
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Stop any running animation
  const stopVisualization = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setVisualizationData(Array(64).fill(0));
    setMode("idle");
  }, []);

  // Start visualization with specified mode
  const startVisualization = useCallback((newMode: VisualizationMode) => {
    if (newMode === "idle") {
      stopVisualization();
      return;
    }

    // Stop current animation if running
    stopVisualization();
    
    // Set the mode
    setMode(newMode);
    
    // Create a new animation based on mode
    let baseAmplitude = newMode === "listening" ? 0.3 : 0.7; // AI response is louder
    let frequencies = new Uint8Array(64);
    
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      // Generate random data that resembles audio frequencies
      for (let i = 0; i < frequencies.length; i++) {
        // Center frequencies are louder
        const distanceFromCenter = Math.abs(i - frequencies.length / 2) / (frequencies.length / 2);
        const amplitude = baseAmplitude * (1 - distanceFromCenter * 0.8);
        
        // Add random variation plus a slow wave
        frequencies[i] = Math.min(255, Math.max(0, 
          50 + 
          amplitude * 200 * Math.random() + 
          20 * Math.sin(Date.now() / 500 + i / 5)
        ));
      }
      
      // Update visualization data state
      setVisualizationData([...frequencies]);
      
      // Draw on canvas if available
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const canvas = canvasRef.current;
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Set bar width and spacing
          const barWidth = (canvas.width / frequencies.length) * 1.75;
          let barHeight;
          let x = 0;
          
          // Calculate the center y-position of the canvas
          const centerY = canvas.height / 2;
          
          // Draw bars
          for (let i = 0; i < frequencies.length; i++) {
            // Scale the data to fit half the canvas height
            barHeight = (frequencies[i] / 255) * (canvas.height / 2);
            
            // Create gradient for top and bottom parts
            const gradientTop = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY);
            const gradientBottom = ctx.createLinearGradient(0, centerY, 0, centerY + barHeight);
            
            if (newMode === "listening") {
              // Green for listening
              gradientTop.addColorStop(0, '#34d399'); // Green-500
              gradientTop.addColorStop(1, '#10b981'); // Green-600
              gradientBottom.addColorStop(0, '#10b981'); // Green-600
              gradientBottom.addColorStop(1, '#34d399'); // Green-500
            } else {
              // Indigo for AI responding
              gradientTop.addColorStop(0, '#6366f1'); // Indigo-500
              gradientTop.addColorStop(1, '#4f46e5'); // Indigo-600
              gradientBottom.addColorStop(0, '#4f46e5'); // Indigo-600
              gradientBottom.addColorStop(1, '#6366f1'); // Indigo-500
            }
            
            // Draw top bar (extends upward from center)
            ctx.fillStyle = gradientTop;
            ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
            
            // Draw bottom bar (extends downward from center)
            ctx.fillStyle = gradientBottom;
            ctx.fillRect(x, centerY, barWidth, barHeight);
            
            // Add spacing between bars
            x += barWidth + 1;
          }
        }
      }
    };
    
    animate();
  }, [stopVisualization]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    canvasRef,
    visualizationData,
    mode,
    startVisualization,
    stopVisualization
  };
};
