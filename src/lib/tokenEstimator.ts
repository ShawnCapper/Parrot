// A simpler token estimator that doesn't rely on WebAssembly

// Simplified token estimation (without using tiktoken)
export const estimateTokenCount = (text: string): number => {
  // OpenAI's tokenizer approximation:
  // 1 token ~= 4 chars in English
  // This is a simplified approximation and won't be as accurate as tiktoken
  return Math.ceil(text.length / 4);
};

// Audio duration-based token estimator
export const estimateTokensFromDuration = (
  durationSeconds: number, 
  model: string = 'whisper-1'
): {
  estimatedTokens: number;
  estimatedWords: number;
  estimatedCost: number;
} => {
  const durationMinutes = durationSeconds / 60;
  
  // Average words per minute in typical speech
  const avgWordsPerMinute = 150;
  
  // Estimated words based on duration
  const estimatedWords = Math.round(durationMinutes * avgWordsPerMinute);
  
  // Average tokens per word (based on OpenAI's typical ratio)
  const avgTokensPerWord = 1.3;
  
  // Estimated tokens
  const estimatedTokens = Math.round(estimatedWords * avgTokensPerWord);
  
  // Calculate cost based on model
  let estimatedCost = 0;
  
  if (model === 'whisper-1') {
    // Whisper pricing: $0.006 per minute
    estimatedCost = durationMinutes * 0.006;
  } else if (model === 'gpt-4o-mini') {
    // GPT-4o mini pricing
    const inputCostPerToken = 0.00000125; // $1.25 per million tokens
    const outputCostPerToken = 0.000005;  // $5 per million tokens
    const outputTokens = estimatedTokens * 0.8;
    estimatedCost = (estimatedTokens * inputCostPerToken) + (outputTokens * outputCostPerToken);
  } else if (model === 'gpt-4o') {
    // GPT-4o pricing
    const inputCostPerToken = 0.0000025;  // $2.50 per million tokens
    const outputCostPerToken = 0.00001;   // $10 per million tokens
    const outputTokens = estimatedTokens * 0.8;
    estimatedCost = (estimatedTokens * inputCostPerToken) + (outputTokens * outputCostPerToken);
  } else {
    // Default to Whisper pricing
    estimatedCost = durationMinutes * 0.006;
  }
  
  return {
    estimatedTokens,
    estimatedWords,
    estimatedCost
  };
};

// Function to estimate tokens from file size (fallback if duration can't be determined)
export const estimateTokensFromFileSize = (
  fileSizeBytes: number,
  model: string = 'whisper-1'
): {
  estimatedTokens: number;
  estimatedWords: number;
  estimatedCost: number;
  estimatedMinutes: number;
} => {
  // Convert bytes to MB
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  
  // Very rough estimation: 1MB ≈ 1 minute of audio at decent quality
  const estimatedMinutes = fileSizeMB;
  
  // Use the duration-based estimator with our estimated minutes
  const { estimatedTokens, estimatedWords, estimatedCost } = 
    estimateTokensFromDuration(estimatedMinutes * 60, model);
  
  return {
    estimatedTokens,
    estimatedWords,
    estimatedCost,
    estimatedMinutes
  };
};

// Format time in mm:ss format
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Format cost with appropriate precision
export const formatCost = (cost: number): string => {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  } else {
    return `$${cost.toFixed(2)}`;
  }
};
