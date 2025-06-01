// Calculate costs and estimates for TTS operations

// Cost per 1,000 characters for each model
const TTS_COSTS = {
  'tts-1': 0.015, // $15 per 1M tokens (approx. $0.015 per 1,000 characters)
  'tts-1-hd': 0.030, // $30 per 1M tokens (approx. $0.030 per 1,000 characters)
  'gpt-4o-mini': 0.012 // $0.60 per 1M input tokens, $12 per 1M output tokens (using output cost as estimate)
};

// Average speaking rates in words per minute
const SPEAKING_RATES = {
  'slow': 120, // Slow speaking pace
  'medium': 150, // Medium speaking pace
  'fast': 180 // Fast speaking pace
};

// Average word length in English (characters)
const AVG_WORD_LENGTH = 5;

/**
 * Estimate the duration of the generated speech
 * 
 * @param textLength The length of the text in characters
 * @param speed The speed modifier (1.0 is normal)
 * @returns Duration in seconds
 */
export function estimateTTSDuration(textLength: number, speed: number = 1.0): number {
  // Estimate number of words
  const words = textLength / AVG_WORD_LENGTH;
  
  // Calculate duration in minutes at medium speaking rate, adjusted by speed
  const durationMinutes = words / (SPEAKING_RATES.medium * speed);
  
  // Convert to seconds
  return durationMinutes * 60;
}

/**
 * Calculate the cost of TTS generation
 * 
 * @param textLength The length of the text in characters
 * @param model The TTS model
 * @returns Cost in USD
 */
export function calculateTTSCost(textLength: number, model: string): number {
  // Handle special case for GPT-4o mini with separate input/output costs
  if (model === 'gpt-4o-mini') {
    // For GPT-4o mini, calculate both input and output costs
    const inputCost = (textLength / 1000) * 0.0006; // $0.60 per 1M tokens
    const outputCost = (textLength / 1000) * 0.012; // $12.00 per 1M tokens
    return inputCost + outputCost;
  }
  
  // For standard TTS models
  const costPerThousand = TTS_COSTS[model as keyof typeof TTS_COSTS] || TTS_COSTS['tts-1'];
  
  // Calculate cost
  return (textLength / 1000) * costPerThousand;
}

/**
 * Estimate the TTS generation parameters
 * 
 * @param text The input text
 * @param model The TTS model
 * @param speed The speed modifier
 * @returns Object with estimated parameters
 */
export function estimateTTSParameters(text: string, model: string, speed: number = 1.0) {
  const textLength = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  // Estimate tokens (roughly 4 characters per token for English text)
  const estimatedTokens = Math.ceil(textLength / 4);
  
  return {
    characterCount: textLength,
    wordCount,
    estimatedDuration: estimateTTSDuration(textLength, speed),
    estimatedCost: calculateTTSCost(textLength, model),
    estimatedTokens,
  };
}
