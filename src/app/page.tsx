"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstallPWA } from "@/components/install-pwa";
import { useState, useEffect, useRef } from "react";
import { 
  Upload, Wand2, Copy, CheckCheck, FileAudio, Download, Mic, Volume2, 
  FileText, Settings, Volume, Coins, Sparkles, Headphones, Rabbit, 
  Snail, X, BookOpenText
} from "lucide-react";
import { formatTime, formatCost, estimateTokensFromDuration, estimateTokensFromFileSize } from "@/lib/tokenEstimator";
import { splitAudioFileIfNeeded, MAX_GPT_AUDIO_DURATION } from "@/lib/audioSplitter";
import { estimateTTSParameters } from "@/lib/ttsEstimator";
import { saveAudioToStorage, getAudioFromStorage, deleteAudioFromStorage } from "@/lib/audioStorage";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [mode, setMode] = useState<"speech-to-text" | "text-to-speech">("speech-to-text");
  const [prefsLoaded, setPrefsLoaded] = useState<boolean>(false);
  const [processingChunks, setProcessingChunks] = useState<boolean>(false);
  const [chunksProgress, setChunksProgress] = useState<{ processed: number, total: number }>({ processed: 0, total: 0 });
  const [tokenEstimate, setTokenEstimate] = useState<{
    durationSeconds: number;
    estimatedTokens: number;
    estimatedCost: number;
    model: string;
  } | null>(null);
  const [isTokenEstimateExpanded, setIsTokenEstimateExpanded] = useState<boolean>(false);
  const [ttsText, setTtsText] = useState<string>("");
  const [ttsModel, setTtsModel] = useState<string>("tts-1");
  const [ttsVoice, setTtsVoice] = useState<string>("nova");  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [ttsError, setTtsError] = useState<string>("");
  const [ttIsGenerating, setTtIsGenerating] = useState<boolean>(false);
  const [ttsSuccess, setTtsSuccess] = useState<string>("");  const [ttsAudioUrl, setTtsAudioUrl] = useState<string>("");
  const [ttsAudioId, setTtsAudioId] = useState<string>("");
  const [prefsLoadedTTS, setPrefsLoadedTTS] = useState<boolean>(false);  const [ttsEstimate, setTtsEstimate] = useState<{
    characterCount: number;
    wordCount: number;
    estimatedDuration: number;
    estimatedCost: number;
    estimatedTokens?: number;
  } | null>(null);
    // Audio visualizer states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioTime, setAudioTime] = useState<string>("00:00");
  const [audioDuration, setAudioDuration] = useState<string>("00:00");
  const [visualizationData, setVisualizationData] = useState<number[]>(Array(64).fill(0));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper functions for audio visualization
  const formatTimeDisplay = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  const setupAudioContext = () => {
    if (!audioRef.current) {
      console.warn('Cannot setup audio context: audioRef.current is null');
      return;
    }
    
    try {
      console.log('Setting up audio context...');
      
      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        console.log('Created new AudioContext');
      } else {
        console.log('Using existing AudioContext');
        // Resume the context if it's suspended
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
            console.log('Resumed audio context');
          });
        }
      }
      
      // Create analyzer node
      if (!analyzerRef.current) {
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 128; // Power of 2, controls the frequency resolution
        console.log('Created new AnalyserNode');
      }
      
      try {
        // Connect audio element to the analyzer
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyzerRef.current);
        analyzerRef.current.connect(audioContextRef.current.destination);
        console.log('Connected audio source to analyzer and destination');
        
        // Start the visualization
        console.log('Starting visualization...');
        startVisualization();
      } catch (mediaError) {
        // This could happen if the audio element is already connected
        console.warn('Error connecting audio element, might be already connected:', mediaError);
        
        // We can still try to start visualization even if connection failed
        console.log('Attempting to start visualization anyway...');
        startVisualization();
      }
    } catch (err) {
      console.error("Error setting up audio context:", err);
    }
  };
  const startVisualization = () => {
    if (!analyzerRef.current) {
      console.warn('Cannot start visualization: analyzerRef.current is null');
      return;
    }
    
    if (!canvasRef.current) {
      console.warn('Cannot start visualization: canvasRef.current is null');
      return;
    }
    
    // If we already have an animation running, don't start another one
    if (animationRef.current) {
      console.log('Visualization already running, not starting a new one');
      return;
    }
    
    console.log('Starting visualization animation');
    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.warn('Cannot start visualization: unable to get canvas context');
      return;
    }
    
    // Animation function to update the visualization
    const animate = () => {
      if (!analyzerRef.current || !audioRef.current || !ctx) return;
      
      animationRef.current = requestAnimationFrame(animate);
      
      // Get frequency data
      analyzerRef.current.getByteFrequencyData(dataArray);
        // Update visualization data state for reactive components if needed
      setVisualizationData([...dataArray]);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set bar width and spacing
      const barWidth = (canvas.width / bufferLength) * 1.75;
      let barHeight;
      let x = 0;
      
      // Calculate the center y-position of the canvas
      const centerY = canvas.height / 2;
      
      // Draw bars
      for (let i = 0; i < bufferLength; i++) {
        // Scale the data to fit half the canvas height (since we're extending both up and down)
        barHeight = (dataArray[i] / 255) * (canvas.height / 2);
        
        // Create gradient for top part (extending upward from center)
        const gradientTop = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY);
        gradientTop.addColorStop(0, '#6366f1'); // Indigo-500
        gradientTop.addColorStop(1, '#4f46e5'); // Indigo-600
        
        // Create gradient for bottom part (extending downward from center)
        const gradientBottom = ctx.createLinearGradient(0, centerY, 0, centerY + barHeight);
        gradientBottom.addColorStop(0, '#4f46e5'); // Indigo-600
        gradientBottom.addColorStop(1, '#6366f1'); // Indigo-500
        
        // Draw top bar (extends upward from center)
        ctx.fillStyle = gradientTop;
        ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
        
        // Draw bottom bar (extends downward from center)
        ctx.fillStyle = gradientBottom;
        ctx.fillRect(x, centerY, barWidth, barHeight);
        
        // Add spacing between bars
        x += barWidth + 1;
      }
      
      // Update current time display
      if (audioRef.current) {
        setAudioTime(formatTimeDisplay(audioRef.current.currentTime));
      }
    };
    
    animate();
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } else {
      audioRef.current.play();
      if (!animationRef.current) {
        startVisualization();
      }
    }
    
    setIsPlaying(!isPlaying);
  };

  // Function to skip backward 10 seconds
  const handleSkipBackward = () => {
    if (!audioRef.current) return;
    
    // Subtract 10 seconds, but ensure we don't go below 0
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    setAudioTime(formatTimeDisplay(audioRef.current.currentTime));
  };

  // Function to skip forward 10 seconds
  const handleSkipForward = () => {
    if (!audioRef.current) return;
    
    // Add 10 seconds, but ensure we don't exceed duration
    audioRef.current.currentTime = Math.min(
      audioRef.current.duration, 
      audioRef.current.currentTime + 10
    );
    setAudioTime(formatTimeDisplay(audioRef.current.currentTime));
  };

  // Clean up function for audio visualization
  const cleanupAudioVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    
    audioContextRef.current = null;
    analyzerRef.current = null;
  };

  // Load saved preferences on component mount
  useEffect(() => {
    // Load saved model preference
    const savedModel = localStorage.getItem("parrot-selected-model");
    if (savedModel) {
      setSelectedModel(savedModel);
      setPrefsLoaded(true);
    }
    
    // Load saved mode preference
    const savedMode = localStorage.getItem("parrot-mode");
    if (savedMode === "speech-to-text" || savedMode === "text-to-speech") {
      setMode(savedMode);
      setPrefsLoaded(true);
    }
    
    // Load token estimate expansion preference
    const savedTokenEstimateExpanded = localStorage.getItem("parrot-token-estimate-expanded");
    if (savedTokenEstimateExpanded) {
      setIsTokenEstimateExpanded(savedTokenEstimateExpanded === "true");
    }

    // Load saved transcription
    const savedTranscription = localStorage.getItem("parrot-transcription");
    if (savedTranscription) {
      setTranscription(savedTranscription);
      
      // Calculate tokens for the saved transcription
      import('@/lib/tokenCalc').then(({ countTokens }) => {
        // Use a default model if none is saved yet
        const modelToUse = savedModel || "gpt-4o-mini";
        const tokens = countTokens(savedTranscription, modelToUse);
        
        // Set a basic token estimate for the saved transcription
        setTokenEstimate({
          durationSeconds: Math.round(savedTranscription.length / 5), // Rough estimate of duration
          estimatedTokens: tokens,
          estimatedCost: tokens * (modelToUse === "whisper-1" ? 0.0001 : 0.00001), // Very rough cost estimate
          model: modelToUse
        });
      });
    }

    // Hide the preferences loaded notification after 3 seconds
    if (savedModel || (savedMode === "speech-to-text" || savedMode === "text-to-speech")) {
      setTimeout(() => setPrefsLoaded(false), 3000);
    }
  }, []);

  // Save model preference when it changes
  useEffect(() => {
    localStorage.setItem("parrot-selected-model", selectedModel);
  }, [selectedModel]);
    // Save mode preference when it changes
  useEffect(() => {
    localStorage.setItem("parrot-mode", mode);
  }, [mode]);
  
  // Save token estimate expansion preference when it changes
  useEffect(() => {
    localStorage.setItem("parrot-token-estimate-expanded", isTokenEstimateExpanded.toString());
  }, [isTokenEstimateExpanded]);
  // useEffect for loading TTS preferences
  useEffect(() => {
    // Load saved TTS settings
    const savedTtsModel = localStorage.getItem("parrot-tts-model");
    if (savedTtsModel) {
      setTtsModel(savedTtsModel);
    }
    
    const savedTtsVoice = localStorage.getItem("parrot-tts-voice");
    if (savedTtsVoice) {
      setTtsVoice(savedTtsVoice);
    }
    
    const savedTtsSpeed = localStorage.getItem("parrot-tts-speed");
    if (savedTtsSpeed) {
      setTtsSpeed(parseFloat(savedTtsSpeed));
    }
    
    // Load saved text
    const savedTtsText = localStorage.getItem("parrot-tts-text");
    if (savedTtsText) {
      setTtsText(savedTtsText);
      
      // Calculate estimates for the saved text
      const params = estimateTTSParameters(savedTtsText, savedTtsModel || "tts-1", parseFloat(savedTtsSpeed || "1.0"));
      setTtsEstimate(params);
    }
    
    // Load saved audio if available
    const savedTtsAudioId = localStorage.getItem("parrot-tts-audio-id");
    if (savedTtsAudioId) {
      setTtsAudioId(savedTtsAudioId);
      
      // Try to fetch the audio blob from IndexedDB
      (async () => {
        try {
          const audioBlob = await getAudioFromStorage(savedTtsAudioId);
          
          if (audioBlob) {            // Create a new object URL from the blob
            const audioUrl = URL.createObjectURL(audioBlob);
            setTtsAudioUrl(audioUrl);
            
            // Show a notification that we restored the audio
            setTtsSuccess('Previous audio restored from storage');
            setPrefsLoadedTTS(true);
            setTimeout(() => setPrefsLoadedTTS(false), 3000);
            
            // Try to load metadata if available
            try {
              const metadataStr = localStorage.getItem("parrot-tts-audio-metadata");
              if (metadataStr) {
                const metadata = JSON.parse(metadataStr);
                // Use metadata to set audio duration for restored audio
                console.log('Restored audio metadata:', metadata);
                
                // If the metadata contains duration information (from ttsEstimate), use it to set the audioDuration
                if (metadata.estimatedDuration) {
                  const minutes = Math.floor(metadata.estimatedDuration / 60);
                  const seconds = Math.round(metadata.estimatedDuration % 60);
                  setAudioDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                }
              }
            } catch (error) {
              console.error('Error parsing audio metadata:', error);
            }
          } else {
            // If no audio blob was found, clean up the stale reference
            localStorage.removeItem("parrot-tts-audio-id");
            localStorage.removeItem("parrot-tts-audio-metadata");
            setTtsAudioId('');
          }
        } catch (error) {
          console.error('Error loading saved audio:', error);
          // Clean up if there was an error
          localStorage.removeItem("parrot-tts-audio-id");
          localStorage.removeItem("parrot-tts-audio-metadata");
          setTtsAudioId('');
        }
      })();
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const handleFile = async (file?: File) => {
    setError("");
    setTokenEstimate(null); // Reset token estimate
    
    if (file) {
      // Check if the file is a supported audio format
      const supportedFormats = [
        'audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/mpga', 'audio/m4a', 'audio/wav', 'audio/webm',
        // Some browsers might use these mime types
        'audio/x-m4a', 'audio/x-wav', 'audio/x-mp3', 'audio/wave'
      ];
      
      const fileType = file.type;
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const validExt = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'].includes(fileExt || '');
      
      if (!supportedFormats.includes(fileType) && !validExt) {
        setError("Please select a supported audio file format (MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM).");
        return;
      }
      
      setAudioFile(file);
      
      // Estimate tokens from the audio file
      try {
        // Try to get audio duration with Audio API
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(file);
        
        audio.addEventListener('loadedmetadata', () => {
          URL.revokeObjectURL(objectUrl);
          const durationSeconds = audio.duration;
          
          // Get token estimate based on duration
          const { estimatedTokens, estimatedCost, estimatedWords } = 
            estimateTokensFromDuration(durationSeconds, selectedModel);
          
          setTokenEstimate({
            durationSeconds,
            estimatedTokens,
            estimatedCost,
            model: selectedModel
          });
        });
        
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(objectUrl);
          console.log("Failed to get audio duration, using file size instead");
          
          // Fallback to file size estimation
          const { estimatedTokens, estimatedCost, estimatedMinutes } = 
            estimateTokensFromFileSize(file.size, selectedModel);
          
          setTokenEstimate({
            durationSeconds: estimatedMinutes * 60,
            estimatedTokens,
            estimatedCost,
            model: selectedModel
          });
        });
        
        audio.src = objectUrl;
      } catch (err) {
        console.error("Error estimating tokens:", err);
        // Fallback to file size estimation
        const { estimatedTokens, estimatedCost, estimatedMinutes } = 
          estimateTokensFromFileSize(file.size, selectedModel);
        
        setTokenEstimate({
          durationSeconds: estimatedMinutes * 60,
          estimatedTokens,
          estimatedCost,
          model: selectedModel
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  };
  // Function to ensure we have an accurate audio duration
  const getAccurateAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      // Create an audio element to get duration
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      
      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        // Get the duration and clean up
        const duration = audio.duration;
        URL.revokeObjectURL(objectUrl);
        resolve(duration);
      });
      
      audio.addEventListener('error', (err) => {
        // Clean up and reject with error
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not determine audio duration"));
      });
      
      // Load the audio file
      audio.src = objectUrl;
    });
  };

  const handleTranscribe = async () => {
    if (!audioFile) {
      setError("Please select an audio file first.");
      return;
    }

    setIsLoading(true);
    // Don't clear the existing transcription until we successfully get a new one
    setError("");
    setSuccessMessage("");

    try {
      const startTime = Date.now();
      
      // Clear the transcription since we're about to process a new one
      setTranscription(""); 
      localStorage.removeItem("parrot-transcription");
        // Get accurate audio duration
      let audioDuration: number;
      try {
        // If we already have a duration from the token estimate, use it, otherwise get a fresh measurement
        audioDuration = tokenEstimate?.durationSeconds || await getAccurateAudioDuration(audioFile);
        console.log(`Audio duration detected: ${audioDuration.toFixed(1)} seconds`);
      } catch (err) {
        console.warn("Could not determine audio duration accurately:", err);
        // Fallback to estimate based on file size
        const fileSizeMB = audioFile.size / (1024 * 1024);
        audioDuration = fileSizeMB * 60; // Rough estimate: 1MB ≈ 1 minute
        console.log(`Using fallback duration estimate: ${audioDuration.toFixed(1)} seconds`);
      }
      
      // For GPT models, check if we need to split the audio
      if ((selectedModel === 'gpt-4o' || selectedModel === 'gpt-4o-mini') && 
          audioDuration > MAX_GPT_AUDIO_DURATION) {
          
        console.log(`Long audio detected (${audioDuration.toFixed(1)}s > ${MAX_GPT_AUDIO_DURATION}s). Using chunking...`);
        
        setProcessingChunks(true);
        
        // Split the audio file into smaller chunks
        const audioChunks = await splitAudioFileIfNeeded(
          audioFile, 
          audioDuration,
          selectedModel
        );
        
        setChunksProgress({ processed: 0, total: audioChunks.length });
        
        // Process each chunk individually
        const transcriptionChunks: string[] = [];
        
        for (let i = 0; i < audioChunks.length; i++) {
          const chunk = audioChunks[i];
          
          // Show progress
          setChunksProgress({ processed: i, total: audioChunks.length });
          setSuccessMessage(`Processing chunk ${i + 1} of ${audioChunks.length}...`);
          
          console.log(`Processing chunk ${i + 1}/${audioChunks.length}: ${chunk.fileName}`);
          console.log(`Chunk duration: ${(chunk.endTime - chunk.startTime).toFixed(1)} seconds`);
          
          // Create a FormData object for this chunk
          const formData = new FormData();
          
          // Create a File object from the chunk
          const chunkFile = new File([chunk.blob], chunk.fileName, { 
            type: audioFile.type,
            lastModified: new Date().getTime()
          });
          
          formData.append("audio", chunkFile);
          formData.append("model", selectedModel);
          formData.append("isChunk", "true");
          
          // Send request for this chunk
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            let errorMessage = `HTTP error processing chunk ${i + 1}: status ${response.status}`;
            try {
              const errorData = await response.json();
              if (errorData && errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (err) {
              console.error("Failed to parse error response:", err);
            }
            throw new Error(errorMessage);
          }
          
          const result = await response.json();
          transcriptionChunks.push(`[Part ${i + 1}] ${result.transcription}`);
          
          // Update the current transcription to show progress
          setTranscription(transcriptionChunks.join('\n\n'));
        }
        
        // Combine all transcription chunks
        const fullTranscription = transcriptionChunks.join('\n\n');
        setTranscription(fullTranscription);
        
        // Save to localStorage
        localStorage.setItem("parrot-transcription", fullTranscription);
        
        // Calculate processing time
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // Show success message
        setSuccessMessage(`Transcription completed in ${processingTime}s (${audioChunks.length} chunks)`);
        
        // Calculate tokens
        import('@/lib/tokenCalc').then(({ countTokens }) => {
          const actualTokens = countTokens(fullTranscription, selectedModel);
          
          // Update token estimates
          if (tokenEstimate) {
            setTokenEstimate({
              ...tokenEstimate,
              estimatedTokens: actualTokens,
              estimatedCost: tokenEstimate.estimatedCost
            });
          }
          
          // Calculate tokens per second
          const processingTimeInSeconds = parseFloat(processingTime);
          const tokensPerSecond = Math.round(actualTokens / processingTimeInSeconds);
          
          // Update success message
          setSuccessMessage(`Transcription completed in ${processingTime}s (${tokensPerSecond.toLocaleString()} tokens/s, ${audioChunks.length} chunks)`);
        });
        
        setProcessingChunks(false);
        setChunksProgress({ processed: 0, total: 0 });      } else {
        // Standard processing for a single audio file (no chunking needed)
        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("model", selectedModel);
        // For the non-chunked case, explicitly mark it as not a chunk
        formData.append("isChunk", "false");

        console.log(`Sending request to transcribe ${audioFile.name} using ${selectedModel}`);
        
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        // Clone the response before parsing to ensure we can read it
        const responseClone = response.clone();
        
        if (!response.ok) {
          // Safely handle JSON parsing for error responses
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await responseClone.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (jsonError) {
            console.error("Failed to parse error response:", jsonError);
            try {
              // Try to get plain text if JSON parsing failed
              const textResponse = await response.text();
              if (textResponse) {
                errorMessage = `Server error: ${textResponse.slice(0, 100)}`;
              }
            } catch (textError) {
              console.error("Failed to get error text:", textError);
            }
          }
          throw new Error(errorMessage);
        }

        let result;
        try {
          result = await responseClone.json();
        } catch (jsonError) {
          console.error("Failed to parse response as JSON:", jsonError);
          // Try to get response text to debug
          try {
            const textResponse = await response.text();
            console.error("Raw response:", textResponse);
          } catch (textError) {
            console.error("Failed to get response text:", textError);
          }
          throw new Error("Failed to parse server response");
        }
        
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        setTranscription(result.transcription);
        
        // Save transcription to localStorage
        localStorage.setItem("parrot-transcription", result.transcription);
        
        // Show initial success message
        setSuccessMessage(`Transcription completed in ${processingTime}s`);
        
        // Calculate actual tokens from the transcription
        import('@/lib/tokenCalc').then(({ countTokens }) => {
          const actualTokens = countTokens(result.transcription, selectedModel);
          
          // Update token estimates with real data
          if (tokenEstimate) {
            setTokenEstimate({
              ...tokenEstimate,
              estimatedTokens: actualTokens,
              estimatedCost: tokenEstimate.estimatedCost // Keep the original cost estimate
            });
          }
          
          // Calculate tokens per second
          const processingTimeInSeconds = parseFloat(processingTime);
          const tokensPerSecond = Math.round(actualTokens / processingTimeInSeconds);
          
          // Update success message with tokens per second
          setSuccessMessage(`Transcription completed in ${processingTime}s (${tokensPerSecond.toLocaleString()} tokens/s)`);
        });
      }
    } catch (error) {
      console.error("Error transcribing audio:", error);
      let errorMessage = "Failed to transcribe audio.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      setProcessingChunks(false);
      setChunksProgress({ processed: 0, total: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!transcription) return;
    
    const element = document.createElement("a");
    const file = new Blob([transcription], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `transcription_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Estimate tokens when the selected model changes
  useEffect(() => {
    if (audioFile && tokenEstimate) {
      // Recalculate token estimate when model changes
      // We only need to update if the model changed (not when audioFile changes since that's handled in handleFile)
      if (tokenEstimate.model !== selectedModel) {
        try {
          // Use the already determined duration
          const { durationSeconds } = tokenEstimate;
          const { estimatedTokens, estimatedCost } = estimateTokensFromDuration(durationSeconds, selectedModel);
          
          setTokenEstimate({
            durationSeconds,
            estimatedTokens,
            estimatedCost,
            model: selectedModel
          });
        } catch (err) {
          console.error("Error updating token estimate for new model:", err);
        }
      }
    }
  }, [selectedModel, tokenEstimate, audioFile]);

  // Function to handle TTS generation
  const handleGenerateSpeech = async () => {
    if (!ttsText || ttsText.trim() === '') {
      setTtsError("Please enter text to convert to speech");
      return;
    }

    setTtIsGenerating(true);
    setTtsError("");
    setTtsSuccess("");

    try {
      // Create form data for the request
      const formData = new FormData();
      formData.append("text", ttsText);
      formData.append("model", ttsModel);
      formData.append("voice", ttsVoice);
      formData.append("speed", ttsSpeed.toString());
      
      // Send request to the TTS API endpoint
      const response = await fetch("/api/tts", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        // Handle error response
        let errorMessage = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (err) {
          console.error("Failed to parse error response:", err);
        }
        throw new Error(errorMessage);
      }
        // Convert the response to a blob
      const audioBlob = await response.blob();
      
      // Save the audio blob to IndexedDB
      const audioId = await saveAudioToStorage(audioBlob);
      
      // Create an object URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);
      setTtsAudioUrl(audioUrl);
      setTtsAudioId(audioId);
      
      // Save the audio ID to localStorage for persistence
      localStorage.setItem("parrot-tts-audio-id", audioId);
        // Create metadata to store with the audio
      const audioMetadata = JSON.stringify({
        text: ttsText,
        model: ttsModel,
        voice: ttsVoice,
        speed: ttsSpeed,
        timestamp: Date.now(),
        estimatedDuration: ttsEstimate ? ttsEstimate.estimatedDuration : null
      });
      localStorage.setItem("parrot-tts-audio-metadata", audioMetadata);
      
      // Set success message
      const duration = ttsEstimate ? Math.floor(ttsEstimate.estimatedDuration) : 0;
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setTtsSuccess(`Speech generated successfully (${durationStr} duration)`);
    } catch (error) {
      console.error("Error generating speech:", error);
      let errorMessage = "Failed to generate speech";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setTtsError(errorMessage);
    } finally {
      setTtIsGenerating(false);
    }
  };

  // Function to handle audio download
  const handleDownloadAudio = () => {
    if (!ttsAudioUrl) return;
    
    const a = document.createElement("a");
    a.href = ttsAudioUrl;
    a.download = `speech_${new Date().toISOString().slice(0,10)}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };  // Handle audio setup and cleanup
  useEffect(() => {
    if (ttsAudioUrl) {
      // Reset states when a new audio URL is set
      setIsPlaying(false);
      setAudioTime("00:00");
      setVisualizationData(Array(64).fill(0));
      
      // Clean up previous audio context if it exists
      cleanupAudioVisualization();
      
      // Add a slight delay before setting up the new audio context
      // This ensures the audio element has had time to properly initialize
      const setupTimer = setTimeout(() => {
        if (audioRef.current && !audioContextRef.current) {
          setupAudioContext();
          console.log('Audio context initialized via useEffect');
        }
      }, 300);
      
      return () => {
        clearTimeout(setupTimer);
      };
    }
    
    return () => {
      // Clean up on component unmount
      cleanupAudioVisualization();
      
      // Revoke any object URLs to prevent memory leaks
      if (ttsAudioUrl) {
        URL.revokeObjectURL(ttsAudioUrl);
      }
    };
  }, [ttsAudioUrl]);
    // Setup event listeners for the audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handlePlay = () => {
      setIsPlaying(true);
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      // Ensure visualization starts when playing
      if (!animationRef.current) {
        startVisualization();
      }
    };
    
    const handlePause = () => setIsPlaying(false);
      const handleEnded = () => {
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        
        // Clear the canvas when audio ends
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
        
        // Reset visualization data
        setVisualizationData(Array(64).fill(0));
      }
    };
    
    const handleLoadedMetadata = () => {
      setAudioDuration(formatTimeDisplay(audio.duration));
    };
    
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioRef.current]);

  // Wait for tts model related preferences
  useEffect(() => {
    if (ttsModel && ttsText) {
      // Update TTS parameters whenever the model or text changes
      const params = estimateTTSParameters(ttsText, ttsModel, ttsSpeed);
      setTtsEstimate(params);
    }
  }, [ttsModel, ttsText, ttsSpeed]);
  
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      {/* Header */}
      <header className="w-full border-b border-zinc-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wand2 className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Parrot</h1>
            
            {/* Preferences loaded notification */}
            {prefsLoaded && (
              <div className="ml-4 px-3 py-1 bg-green-900/30 border border-green-800 rounded-full text-xs text-green-200 flex items-center animate-fade-in-out">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5"></div>
                Settings restored
              </div>
            )}
          </div>

          {/* Center area - PWA Install Button */}
          <div className="hidden sm:flex items-center">
            <InstallPWA />
          </div>
          
          {/* Mode Toggle */}
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              onClick={() => setMode("speech-to-text")}
              className={`px-4 py-2 flex flex-1 justify-center items-center gap-2 text-sm transition-colors ${
                mode === "speech-to-text"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800/70 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Speech-to-Text</span>
            </button>
            <button
              onClick={() => setMode("text-to-speech")}
              className={`px-4 py-2 flex flex-1 justify-center items-center gap-2 text-sm transition-colors ${
                mode === "text-to-speech"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800/70 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Text-to-Speech</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col xl:flex-row w-full max-w-7xl mx-auto p-4 gap-6">
        {mode === "speech-to-text" ? (
        <>
        {/* Left Panel - Upload */}
        <div className="w-full xl:w-1/2 space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <FileAudio className="h-6 w-6 text-indigo-400" />
                Step 1: Select Audio
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Select your audio file containing speech
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <label 
                htmlFor="audio-file"
                className={`rounded-lg border-2 border-dashed ${isDragging 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : 'border-zinc-700 hover:border-indigo-500'
                } p-6 flex flex-col items-center justify-center transition-all cursor-pointer block`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className={`h-10 w-10 mb-2 ${isDragging ? 'text-indigo-400' : 'text-zinc-500'}`} />
                {isDragging ? (
                  <span className="text-sm text-indigo-400 font-medium cursor-pointer text-center">
                    Drop to upload your audio file
                  </span>
                ) : (
                  <span className="text-sm text-zinc-400 cursor-pointer text-center">
                    <span className="font-medium text-indigo-400">Click to upload</span> or drag and drop<br />
                    a <span className="relative group">
                      <span className="underline decoration-dotted cursor-help">supported</span>
                      <span className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 w-60 bg-zinc-800 text-zinc-200 text-xs rounded p-2 mb-1 shadow-lg z-10 border border-zinc-700">
                        Supported formats: MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM
                      </span>
                    </span> audio file
                  </span>
                )}
                <Input
                  id="audio-file"
                  type="file"
                  accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,audio/mp3,audio/mp4,audio/mpeg,audio/mpga,audio/m4a,audio/wav,audio/webm"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {audioFile && (
                  <div className="mt-4 px-3 py-1 bg-zinc-800/80 rounded-full text-xs text-zinc-300 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    {audioFile.name}
                  </div>
                )}
              </label>
                {/* Token estimation display */}
              {tokenEstimate && (
                <div className="px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-md">
                  <button 
                    onClick={() => setIsTokenEstimateExpanded(!isTokenEstimateExpanded)}
                    className="w-full text-left"
                  >
                    <div className="text-sm font-medium text-indigo-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                          <path d="M2 17l10 5 10-5"></path>
                          <path d="M2 12l10 5 10-5"></path>
                        </svg>
                        <span>Token Estimation</span>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {!isTokenEstimateExpanded ? (
                          <div className="flex items-center">
                            <span className="mr-2">{tokenEstimate.estimatedTokens.toLocaleString()} tokens (${tokenEstimate.estimatedCost.toFixed(4)})</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                            <polyline points="18 15 12 9 6 15"></polyline>
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                  
                  {isTokenEstimateExpanded && (
                    <div className="grid grid-cols-2 gap-3 text-xs mt-3 pt-3 border-t border-zinc-700/50">
                      <div>
                        <div className="text-zinc-400">Audio Duration</div>
                        <div className="text-zinc-200">{Math.round(tokenEstimate.durationSeconds)} seconds</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">Est. Tokens</div>
                        <div className="text-zinc-200">{tokenEstimate.estimatedTokens.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">Est. Cost</div>
                        <div className="text-zinc-200">${tokenEstimate.estimatedCost.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">Model</div>
                        <div className="text-zinc-200">{selectedModel}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {error && (
                <div className="px-4 py-3 bg-red-900/30 border border-red-800 rounded-md text-sm text-red-200">
                  {error}
                </div>
              )}
              
              <Button
                onClick={handleTranscribe}
                disabled={isLoading || !audioFile}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-12 font-medium transition-all disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    Processing...
                  </span>
                ) : (
                  "Transcribe Audio"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-400" />
                Step 2: Transcription Settings
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Choose the AI model for your transcription needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Label htmlFor="model" className="text-white text-base font-medium">Speech-to-text model</Label>
                
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Whisper Model Card */}
                  <div 
                    className={`rounded-lg border flex-1 min-w-0 ${selectedModel === "whisper-1" 
                      ? "border-indigo-500 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 shadow-lg shadow-indigo-500/20" 
                      : "border-zinc-700 bg-zinc-800/50"} 
                      overflow-hidden transition-all hover:border-indigo-400/70 cursor-pointer`}
                    onClick={() => setSelectedModel("whisper-1")}
                  >
                    <div className="p-4 relative">
                      {/* Background gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 to-transparent opacity-70"></div>
                      
                      {/* Content */}
                      <div className="relative space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-white whitespace-nowrap">Whisper v2</h3>                          {selectedModel === "whisper-1" && (
                            <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs px-2 py-0.5 ml-1.5 rounded-full whitespace-nowrap">Selected</div>
                          )}
                        </div>
                        
                        <div className="pt-2 flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                          </div>
                          <span className="text-xs text-zinc-500">Performance</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="text-zinc-400 text-xs">⚡</div>
                          </div>
                          <span className="text-xs text-zinc-500">Speed</span>
                        </div>
                        
                        <div className="pt-2 mt-2 border-t border-zinc-700/50 text-xs text-zinc-400">
                          <span className="font-semibold text-indigo-300">$0.006</span> per minute of audio
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700/50">
                      <div className="text-xs text-zinc-400">Basic transcription with good accuracy for clear audio</div>
                    </div>
                  </div>
                  
                  {/* GPT-4o mini Model Card */}
                  <div 
                    className={`rounded-lg border flex-1 min-w-0 ${selectedModel === "gpt-4o-mini" 
                      ? "border-indigo-500 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/30" 
                      : "border-zinc-700 bg-zinc-800/50"} 
                      overflow-hidden transition-all hover:border-indigo-400/70 cursor-pointer`}
                    onClick={() => setSelectedModel("gpt-4o-mini")}
                  >
                    <div className="p-4 relative">
                      {/* Background gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent opacity-70"></div>
                      
                      {/* Content */}
                      <div className="relative space-y-3">                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-white whitespace-nowrap">GPT-4o mini</h3>
                          {selectedModel === "gpt-4o-mini" && (
                            <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs px-2 py-0.5 ml-1.5 rounded-full whitespace-nowrap">Selected</div>
                          )}
                        </div>
                        
                        <div className="pt-2 flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                          </div>
                          <span className="text-xs text-zinc-500">Performance</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="text-zinc-400 text-xs">⚡⚡</div>
                          </div>
                          <span className="text-xs text-zinc-500">Speed</span>
                        </div>
                        
                        <div className="pt-2 mt-2 border-t border-zinc-700/50 text-xs text-zinc-400">
                          <div><span className="font-semibold text-indigo-300">$1.25</span> per 1M tokens in</div>
                          <div><span className="font-semibold text-indigo-300">$5.00</span> per 1M tokens out</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700/50">
                      <div className="text-xs text-zinc-400">Enhanced transcription with improved formatting and clarity</div>
                    </div>
                  </div>
                  
                  {/* GPT-4o Model Card */}
                  <div 
                    className={`rounded-lg border flex-1 min-w-0 ${selectedModel === "gpt-4o" 
                      ? "border-indigo-500 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 shadow-lg shadow-indigo-500/20" 
                      : "border-zinc-700 bg-zinc-800/50"} 
                      overflow-hidden transition-all hover:border-indigo-400/70 cursor-pointer`}
                    onClick={() => setSelectedModel("gpt-4o")}
                  >
                    <div className="p-4 relative">
                      {/* Background gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-70"></div>
                      
                      {/* Content */}
                      <div className="relative space-y-3">                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-white whitespace-nowrap">GPT-4o</h3>
                          {selectedModel === "gpt-4o" && (
                            <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs px-2 py-0.5 ml-1.5 rounded-full whitespace-nowrap">Selected</div>
                          )}
                        </div>
                        
                        <div className="pt-2 flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                            <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                          </div>
                          <span className="text-xs text-zinc-500">Performance</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="text-zinc-400 text-xs">⚡</div>
                          </div>
                          <span className="text-xs text-zinc-500">Speed</span>
                        </div>
                        
                        <div className="pt-2 mt-2 border-t border-zinc-700/50 text-xs text-zinc-400">
                          <div><span className="font-semibold text-indigo-300">$2.50</span> per 1M tokens in</div>
                          <div><span className="font-semibold text-indigo-300">$10.00</span> per 1M tokens out</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700/50">
                      <div className="text-xs text-zinc-400">Premium transcription with highest accuracy and semantic understanding</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Panel - Results */}
        <div className="w-full xl:w-1/2 space-y-6">          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl h-full">            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <Wand2 className="h-6 w-6 text-indigo-400" />
                Transcription Results
                {transcription && localStorage.getItem("parrot-transcription") === transcription && (
                  <div className="text-xs px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 font-normal">
                    Saved
                  </div>
                )}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {transcription ? (
                  <div className="flex flex-col space-y-1">
                    <div>
                      {`${transcription.split(' ').length} words, ${transcription.length} characters`}
                    </div>
                  </div>
                ) : (
                  "Your transcribed text will appear here"
                )}
              </CardDescription>
              {successMessage && !error && !isLoading && (
                <div className="mt-3 px-4 py-2 bg-green-900/30 border border-green-800 rounded-md text-sm text-green-200 flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                  {successMessage}
                </div>
              )}
            </CardHeader>
            <CardContent className="h-[400px] overflow-y-auto pt-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                  {processingChunks ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="text-zinc-500 mb-2">This file's a bit big; gotta break it up</div>
                      <div className="text-xs text-zinc-400">
                        Processing chunk {chunksProgress.processed + 1} of {chunksProgress.total}
                      </div>
                      <div className="w-48 h-1.5 bg-zinc-700 rounded-full mt-2">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all" 
                          style={{
                            width: `${chunksProgress.total ? ((chunksProgress.processed / chunksProgress.total) * 100) : 0}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-zinc-500">Transcribing your audio...</div>
                  )}
                </div>
              ) : transcription ? (
                <div className="whitespace-pre-wrap bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-zinc-100 min-h-full">
                  {transcription}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-lg">
                  <div className="mb-2 opacity-50">No transcription yet</div>
                  <div className="text-sm">Upload an audio file and click &quot;Transcribe Audio&quot; to get started</div>
                </div>
              )}
            </CardContent>
            {transcription && (
              <CardFooter className="flex justify-between border-t border-zinc-800 p-4">                <Button
                  onClick={() => {
                    setTranscription("");
                    localStorage.removeItem("parrot-transcription");
                    setTokenEstimate(null);
                  }}
                  variant="outline"
                  className="border-zinc-700 bg-zinc-800 hover:bg-red-900 hover:border-red-800 hover:text-red-200 text-zinc-300 flex items-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  Clear
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy to clipboard
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleDownloadTxt}
                    variant="outline"
                    className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download as .txt
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>        </>
        ) : (
          // Text-to-Speech Mode
          <div className="w-full flex flex-col xl:flex-row gap-6">
            {/* Left Panel - Input Text */}
            <div className="w-full xl:w-1/2 space-y-6">
              <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                    <FileText className="h-6 w-6 text-indigo-400" />
                    Step 1: Enter Text
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Type or paste the text you want to convert to speech
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col space-y-3">
                    <Label htmlFor="tts-text" className="text-white">Text to convert</Label>
                    <Textarea 
                      id="tts-text"
                      placeholder="Enter your text here (max 4,096 characters)..."
                      className="resize-y min-h-[200px] bg-zinc-800/50 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                      value={ttsText}                      onChange={(e) => {
                        const newText = e.target.value;
                        setTtsText(newText);
                        
                        // Save to localStorage
                        localStorage.setItem("parrot-tts-text", newText);
                        
                        // Update estimates
                        if (newText) {
                          const params = estimateTTSParameters(newText, ttsModel, ttsSpeed);
                          setTtsEstimate(params);
                        } else {
                          setTtsEstimate(null);
                        }
                      }}
                      maxLength={4096} // OpenAI TTS limit
                    />
                    <div className="flex justify-between items-center text-xs text-zinc-500">
                      <span>{ttsText.length}/4,096 characters</span>
                      <span>
                        ~{ttsText.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                  </div>
                    {/* Token estimation display */}
                  {ttsEstimate && (
                    <div className="px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-md">
                      <button 
                        onClick={() => setIsTokenEstimateExpanded(!isTokenEstimateExpanded)}
                        className="w-full text-left"
                      >
                        <div className="text-sm font-medium text-indigo-300 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                              <path d="M2 17l10 5 10-5"></path>
                              <path d="M2 12l10 5 10-5"></path>
                            </svg>
                            <span>Token Estimation</span>
                          </div>
                          <div className="text-xs text-zinc-400">
                            {!isTokenEstimateExpanded ? (
                              <div className="flex items-center">
                                <span className="mr-2">{ttsEstimate.estimatedTokens?.toLocaleString() || 0} tokens (${ttsEstimate.estimatedCost.toFixed(4)})</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </div>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                <polyline points="18 15 12 9 6 15"></polyline>
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                      
                      {isTokenEstimateExpanded && (
                        <div className="grid grid-cols-2 gap-3 text-xs mt-3 pt-3 border-t border-zinc-700/50">
                          <div>
                            <div className="text-zinc-400">Est. Tokens</div>
                            <div className="text-zinc-200">{ttsEstimate.estimatedTokens?.toLocaleString() || 0}</div>
                          </div>
                          <div>
                            <div className="text-zinc-400">Est. Duration</div>
                            <div className="text-zinc-200">{Math.floor(ttsEstimate.estimatedDuration / 60)}:{(Math.round(ttsEstimate.estimatedDuration % 60)).toString().padStart(2, '0')}</div>
                          </div>
                          <div>
                            <div className="text-zinc-400">Est. Cost</div>
                            <div className="text-zinc-200">${ttsEstimate.estimatedCost.toFixed(4)}</div>
                          </div>
                          <div>
                            <div className="text-zinc-400">Model</div>
                            <div className="text-zinc-200">{ttsModel}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {ttsError && (
                    <div className="px-4 py-3 bg-red-900/30 border border-red-800 rounded-md text-sm text-red-200">
                      {ttsError}
                    </div>
                  )}
                  
                  <Button
                    onClick={handleGenerateSpeech}
                    disabled={ttIsGenerating || !ttsText || ttsText.length === 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-12 font-medium transition-all disabled:bg-zinc-800 disabled:text-zinc-500"
                  >
                    {ttIsGenerating ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                        Generating...
                      </span>
                    ) : (
                      "Generate Speech"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-indigo-400" />
                    Step 2: Voice Settings
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Choose the AI model and voice for your speech
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label htmlFor="tts-model" className="text-white text-base font-medium">Text-to-speech model</Label>
                      
                      <div className="flex flex-col lg:flex-row gap-4">
                        {/* TTS-1 Model Card */}
                        <div 
                          className={`rounded-lg border flex-1 min-w-0 ${ttsModel === "tts-1" 
                            ? "border-indigo-500 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 shadow-lg shadow-indigo-500/20" 
                            : "border-zinc-700 bg-zinc-800/50"} 
                            overflow-hidden transition-all hover:border-indigo-400/70 cursor-pointer`}
                          onClick={() => {
                            setTtsModel("tts-1");
                            
                            // Save to localStorage
                            localStorage.setItem("parrot-tts-model", "tts-1");
                              // Update estimates
                            if (ttsText) {
                              const params = estimateTTSParameters(ttsText, "tts-1", ttsSpeed);
                              setTtsEstimate(params);
                            }
                          }}
                        >
                          <div className="p-4 relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-70"></div>
                            
                            <div className="relative space-y-3">                              <div className="flex justify-between items-center">
                                <h3 className="font-medium text-white whitespace-nowrap">TTS-1</h3>
                                {ttsModel === "tts-1" && (
                                  <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs px-2 py-0.5 ml-1.5 rounded-full whitespace-nowrap">Selected</div>
                                )}
                              </div>
                                <div className="pt-2 flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                                  <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                                  <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                                </div>
                                <span className="text-xs text-zinc-500">Performance</span>
                              </div>
                                <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="text-zinc-400 text-xs">⚡⚡</div>
                                </div>
                                <span className="text-xs text-zinc-500">Speed</span>
                              </div>                              <div className="pt-2 mt-2 border-t border-zinc-700/50 text-xs text-zinc-400">
                                <span className="font-semibold text-indigo-300">$15.00</span> per 1M tokens
                              </div>
                            </div>
                          </div>                              <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700/50">
                            <div className="text-xs text-zinc-400">Basic text-to-speech with standard performance</div>
                          </div>
                        </div>
                        
                        {/* TTS-1-HD Model Card */}
                        <div 
                          className={`rounded-lg border flex-1 min-w-0 ${ttsModel === "tts-1-hd" 
                            ? "border-indigo-500 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/30" 
                            : "border-zinc-700 bg-zinc-800/50"} 
                            overflow-hidden transition-all hover:border-indigo-400/70 cursor-pointer`}
                          onClick={() => {
                            setTtsModel("tts-1-hd");
                              // Save to localStorage
                            localStorage.setItem("parrot-tts-model", "tts-1-hd");
                            
                            // Update estimates
                            if (ttsText) {
                              const params = estimateTTSParameters(ttsText, "tts-1-hd", ttsSpeed);
                              setTtsEstimate(params);
                            }
                          }}
                        >
                          <div className="p-4 relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-70"></div>
                            
                            <div className="relative space-y-3">                              <div className="flex justify-between items-center">
                                <h3 className="font-medium text-white whitespace-nowrap">TTS-1-HD</h3>
                                {ttsModel === "tts-1-hd" && (
                                  <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs px-2 py-0.5 ml-1.5 rounded-full whitespace-nowrap">Selected</div>
                                )}
                              </div>
                                <div className="pt-2 flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                                  <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                                  <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
                                </div>
                                <span className="text-xs text-zinc-500">Performance</span>
                              </div>
                                <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="text-zinc-400 text-xs">⚡</div>
                                </div>
                                <span className="text-xs text-zinc-500">Speed</span>
                              </div>                              <div className="pt-2 mt-2 border-t border-zinc-700/50 text-xs text-zinc-400">
                                <span className="font-semibold text-indigo-300">$30.00</span> per 1M tokens
                              </div>
                            </div>
                          </div>                            <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700/50">
                            <div className="text-xs text-zinc-400">Higher performance audio with better pronunciation</div>
                          </div>
                        </div>
                        
                        {/* GPT-4o mini Model Card */}
                        <div 
                          className={`rounded-lg border flex-1 min-w-0 ${ttsModel === "gpt-4o-mini" 
                            ? "border-indigo-500 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 shadow-lg shadow-indigo-500/20" 
                            : "border-zinc-700 bg-zinc-800/50"} 
                            overflow-hidden transition-all hover:border-indigo-400/70 cursor-pointer`}
                          onClick={() => {
                            setTtsModel("gpt-4o-mini");
                            
                            // Save to localStorage
                            localStorage.setItem("parrot-tts-model", "gpt-4o-mini");
                            
                            // Update estimates
                            if (ttsText) {
                              import('@/lib/ttsEstimator').then(({ estimateTTSParameters }) => {
                                const params = estimateTTSParameters(ttsText, "gpt-4o-mini", ttsSpeed);
                                setTtsEstimate(params);
                              });
                            }
                          }}
                        >
                          <div className="p-4 relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent opacity-70"></div>
                            
                            <div className="relative space-y-3">                              <div className="flex justify-between items-center">
                                <h3 className="font-medium text-white whitespace-nowrap">GPT-4o mini</h3>
                                {ttsModel === "gpt-4o-mini" && (
                                  <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-xs px-2 py-0.5 ml-1.5 rounded-full whitespace-nowrap">Selected</div>
                                )}
                              </div>
                                <div className="pt-2 flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                                  <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                                  <div className="h-2 w-2 rounded-full bg-zinc-400"></div>
                                </div>
                                <span className="text-xs text-zinc-500">Performance</span>
                              </div>
                                <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="text-zinc-400 text-xs">⚡⚡</div>
                                </div>
                                <span className="text-xs text-zinc-500">Speed</span>
                              </div>                              <div className="pt-2 mt-2 border-t border-zinc-700/50 text-xs text-zinc-400">
                                <div><span className="font-semibold text-indigo-300">$0.60</span> per 1M tokens in</div>
                                <div><span className="font-semibold text-indigo-300">$12.00</span> per 1M tokens out</div>
                              </div>
                            </div>
                          </div>                            <div className="px-4 py-3 bg-zinc-900/80 border-t border-zinc-700/50">
                            <div className="text-xs text-zinc-400">Natural sounding voice</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <Label htmlFor="tts-voice" className="text-white text-base font-medium">Voice</Label>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map((voice) => (
                          <div 
                            key={voice}
                            className={`rounded-lg border p-3 ${ttsVoice === voice 
                              ? "border-indigo-500 bg-indigo-500/10" 
                              : "border-zinc-700 bg-zinc-800/50"} 
                              transition-all hover:border-indigo-400/70 cursor-pointer`}
                            onClick={() => {
                              setTtsVoice(voice);
                              
                              // Save to localStorage
                              localStorage.setItem("parrot-tts-voice", voice);
                            }}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <Mic className={`h-5 w-5 ${ttsVoice === voice ? "text-indigo-400" : "text-zinc-500"}`} />
                              <span className={ttsVoice === voice ? "text-indigo-300" : "text-zinc-400"} style={{textTransform: 'capitalize'}}>
                                {voice}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="tts-speed" className="text-white text-base font-medium">Speed</Label>
                        <span className="text-sm text-zinc-400">{ttsSpeed}x</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Snail className="h-4 w-4 text-zinc-500" />
                        <input
                          type="range"
                          id="tts-speed"
                          min="0.25"
                          max="4.0"
                          step="0.05"
                          value={ttsSpeed}
                          onChange={(e) => {
                            const newSpeed = parseFloat(e.target.value);
                            setTtsSpeed(newSpeed);
                            
                            // Save to localStorage
                            localStorage.setItem("parrot-tts-speed", newSpeed.toString());
                            
                            // Update estimates
                            if (ttsText) {
                              import('@/lib/ttsEstimator').then(({ estimateTTSParameters }) => {
                                const params = estimateTTSParameters(ttsText, ttsModel, newSpeed);
                                setTtsEstimate(params);
                              });
                            }
                          }}
                          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <Rabbit className="h-4 w-4 text-zinc-500" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Panel - Results */}
            <div className="w-full xl:w-1/2 space-y-6">
              <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">                <CardHeader className="border-b border-zinc-800">
                  <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                    <Headphones className="h-6 w-6 text-indigo-400" />
                    Audio Output
                    {ttsAudioUrl && ttsAudioId && (
                      <div className="text-xs px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 font-normal">
                        Saved
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Listen to the generated speech
                  </CardDescription>
                  {ttsSuccess && !ttsError && !ttIsGenerating && (
                    <div className="mt-3 px-4 py-2 bg-green-900/30 border border-green-800 rounded-md text-sm text-green-200 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                      {ttsSuccess}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  {ttIsGenerating ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                      <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                      <div className="text-zinc-500">Generating speech...</div>
                    </div>
                  ) : ttsAudioUrl ? (
                    <div className="space-y-6">                      <div className="flex items-center justify-center p-6">
                        <div className="w-full max-w-md">
                          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                            {/* Hidden audio element for handling playback */}                            <audio
                              ref={audioRef}
                              className="hidden"
                              autoPlay={false}
                              src={ttsAudioUrl}
                              onPlay={() => setIsPlaying(true)}
                              onPause={() => setIsPlaying(false)}
                              onLoadedMetadata={() => {
                                if (audioRef.current) {
                                  const minutes = Math.floor(audioRef.current.duration / 60);
                                  const seconds = Math.round(audioRef.current.duration % 60);
                                  setAudioDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                                  
                                  // Also initialize audio context here to ensure it happens
                                  // This helps in cases where onLoadedData might not fire reliably
                                  if (!audioContextRef.current) {
                                    setupAudioContext();
                                  }
                                }
                              }}
                              onLoadedData={() => {
                                if (audioRef.current && !audioContextRef.current) {
                                  setupAudioContext();
                                }
                              }}
                            >
                              Your browser does not support the audio element.
                            </audio>
                              {/* Audio Visualizer */}
                            <div className="mb-4">                              <canvas 
                                ref={canvasRef} 
                                className="w-full h-24 rounded-md"
                                width={500}
                                height={100}
                              ></canvas>
                            </div>
                              {/* Audio Controls */}
                            <div className="flex justify-between items-center">                              <div className="text-zinc-400 text-sm font-medium w-12 text-center">
                                {audioTime}
                              </div>
                              
                              <div className="flex justify-center items-center gap-2">
                                {/* Skip Backward 10s Button */}
                                <Button
                                  onClick={handleSkipBackward}
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-indigo-600/10"
                                  title="Skip backward 10 seconds"
                                >
                                  <span className="sr-only">Skip backward 10 seconds</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-zinc-400">
                                    <path d="M11 17l-5-5 5-5" />
                                    <path d="M18 17l-5-5 5-5" />
                                  </svg>
                                </Button>
                                
                                {/* Play/Pause Button */}
                                <Button
                                  onClick={handlePlayPause}
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 rounded-full border-indigo-600 bg-indigo-600/10 hover:bg-indigo-600/20"
                                >
                                  {isPlaying ? (
                                    <span className="sr-only">Pause</span>
                                  ) : (
                                    <span className="sr-only">Play</span>
                                  )}
                                  {isPlaying ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-indigo-400">
                                      <rect x="6" y="4" width="4" height="16" />
                                      <rect x="14" y="4" width="4" height="16" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-indigo-400">
                                      <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                  )}
                                </Button>
                                
                                {/* Skip Forward 10s Button */}
                                <Button
                                  onClick={handleSkipForward}
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-indigo-600/10"
                                  title="Skip forward 10 seconds"
                                >
                                  <span className="sr-only">Skip forward 10 seconds</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-zinc-400">
                                    <path d="M6 17l5-5-5-5" />
                                    <path d="M13 17l5-5-5-5" />
                                  </svg>                                </Button>
                              </div>
                              
                              <div className="text-zinc-400 text-sm font-medium w-12 text-center">
                                {audioDuration}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                        <div className="flex justify-between">
                        <Button
                          onClick={async () => {
                            // Clean up audio visualization before clearing the URL
                            cleanupAudioVisualization();
                            
                            // Clean up the object URL
                            if (ttsAudioUrl) {
                              URL.revokeObjectURL(ttsAudioUrl);
                            }
                            
                            // Delete from IndexedDB if we have an ID
                            if (ttsAudioId) {
                              try {
                                await deleteAudioFromStorage(ttsAudioId);
                              } catch (error) {
                                console.error('Error deleting audio from storage:', error);
                              }
                            }
                            
                            // Clear from localStorage
                            localStorage.removeItem("parrot-tts-audio-id");
                            localStorage.removeItem("parrot-tts-audio-metadata");
                              // Reset states
                            setTtsAudioUrl('');
                            setTtsAudioId('');
                            setTtsSuccess('');
                            setIsPlaying(false);
                            setAudioTime("00:00");
                            setAudioDuration("00:00");
                            setVisualizationData(Array(64).fill(0));
                          }}
                          variant="outline"
                          className="border-zinc-700 bg-zinc-800 hover:bg-red-900 hover:border-red-800 hover:text-red-200 text-zinc-300 flex items-center gap-2 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                          Clear
                        </Button>
                        
                        <Button
                          onClick={handleDownloadAudio}
                          variant="outline"
                          className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download MP3
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center p-6 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-lg">
                      <Headphones className="h-10 w-10 text-zinc-700 mb-3" />
                      <div className="mb-2 text-zinc-400">No audio generated yet</div>
                      <div className="text-sm max-w-md">Enter your text, select a voice and model, then click "Generate Speech" to create audio</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
