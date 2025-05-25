import { get_encoding } from 'tiktoken';

// Function to estimate token count from an audio file
export const estimateTokensFromAudio = async (file: File, modelName: string = 'whisper-1'): Promise<{
  durationSeconds: number;
  estimatedTokens: number;
  estimatedCost: number;
  model: string;
}> => {
  // Create an audio element to get duration
  return new Promise((resolve) => {
    const audioEl = new Audio();
    const objectUrl = URL.createObjectURL(file);
    
    audioEl.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      
      // Get duration in seconds
      const durationSeconds = audioEl.duration;
      const durationMinutes = durationSeconds / 60;
      
      // Average words per minute in typical speech
      const avgWordsPerMinute = 150;
      
      // Estimated words based on duration
      const estimatedWords = durationMinutes * avgWordsPerMinute;
      
      // Average tokens per word (based on OpenAI's typical ratio)
      const avgTokensPerWord = 1.3;
      
      // Estimated tokens
      const estimatedTokens = Math.round(estimatedWords * avgTokensPerWord);
      
      // Calculate estimated cost based on model
      let estimatedCost = 0;
      
      if (modelName === 'whisper-1') {
        // Whisper pricing: $0.006 per minute
        estimatedCost = durationMinutes * 0.006;
      } else if (modelName === 'gpt-4o-mini') {
        // GPT-4o mini pricing: $1.25/M tokens input, $5/M tokens output
        // For audio transcription, we primarily care about the input cost
        // plus a small output cost for the transcription
        const inputCostPerToken = 0.00000125; // $1.25 per million tokens
        const outputCostPerToken = 0.000005;  // $5 per million tokens
        
        // Assume output tokens are roughly 80% of input for transcription
        const outputTokens = estimatedTokens * 0.8;
        
        estimatedCost = (estimatedTokens * inputCostPerToken) + (outputTokens * outputCostPerToken);
      } else if (modelName === 'gpt-4o') {
        // GPT-4o pricing: $2.50/M tokens input, $10/M tokens output
        const inputCostPerToken = 0.0000025;  // $2.50 per million tokens
        const outputCostPerToken = 0.00001;   // $10 per million tokens
        
        // Assume output tokens are roughly 80% of input for transcription
        const outputTokens = estimatedTokens * 0.8;
        
        estimatedCost = (estimatedTokens * inputCostPerToken) + (outputTokens * outputCostPerToken);
      } else {
        // Default Whisper pricing
        estimatedCost = durationMinutes * 0.006;
      }
      
      resolve({
        durationSeconds,
        estimatedTokens,
        estimatedCost,
        model: modelName
      });
    };
    
    audioEl.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback estimation if we can't get audio duration
      // Use file size as a rough proxy
      const fileSizeInMB = file.size / (1024 * 1024);
      // Very rough estimation: 1MB ≈ 1 minute of audio at decent quality
      const estimatedMinutes = fileSizeInMB;
      const estimatedTokens = Math.round(estimatedMinutes * 150 * 1.3);
      
      // Default to Whisper pricing if we can't determine duration
      const estimatedCost = estimatedMinutes * 0.006;
      
      resolve({
        durationSeconds: estimatedMinutes * 60,
        estimatedTokens,
        estimatedCost,
        model: modelName
      });
    };
    
    audioEl.src = objectUrl;
  });
};

// Function to calculate tokens from text
export const countTokens = (text: string, model: string = 'gpt-4o'): number => {
  try {
    // Different models use different encodings
    const encoding = get_encoding(getEncodingNameForModel(model));
    const tokens = encoding.encode(text);
    encoding.free();
    return tokens.length;
  } catch (error) {
    console.error('Error counting tokens:', error);
    // Fallback estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
};

// Helper to get encoding name for specific models
const getEncodingNameForModel = (modelName: string): any => {
  // cl100k is used for newer models
  if (modelName.includes('gpt-4') || modelName.includes('gpt-3.5-turbo')) {
    return 'cl100k_base';
  }
  // For older models
  return 'p50k_base';
};

// Function to calculate cost estimate based on tokens
export const calculateCost = (tokens: number, model: string): number => {
  const rates: Record<string, {input: number, output: number}> = {
    'gpt-4o': { input: 0.000005, output: 0.000010 },  // $5/M in, $10/M out
    'gpt-4o-mini': { input: 0.00000125, output: 0.000005 },  // $1.25/M in, $5/M out
    'whisper-1': { input: 0.000006, output: 0.000006 }  // $0.006 per minute
  };
  
  // Default to gpt-4o if model not found
  const rate = rates[model] || rates['gpt-4o'];
  
  // For simplicity, assume all tokens are input tokens
  return tokens * rate.input;
};
