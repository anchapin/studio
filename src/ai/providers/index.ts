/**
 * AI Provider Abstraction Layer
 * Issue #97: Migrate from hardcoded Gemini-only AI to provider-agnostic architecture
 * 
 * This module provides a unified interface for AI providers,
 * allowing easy switching between different AI backends.
 */

import { genkit, type Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Supported AI providers
 */
export type AIProvider = 'google' | 'openai' | 'anthropic' | 'custom';

/**
 * Configuration options for AI providers
 */
export interface AIProviderConfig {
  provider: AIProvider;
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Default model configurations
 */
export const DEFAULT_MODELS: Record<string, string> = {
  google: 'gemini-1.5-flash-latest',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
};

/**
 * Default configurations for each provider
 */
export const DEFAULT_CONFIGS: Record<AIProvider, Partial<AIProviderConfig>> = {
  google: {
    model: DEFAULT_MODELS.google,
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
  openai: {
    model: DEFAULT_MODELS.openai,
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
  anthropic: {
    model: DEFAULT_MODELS.anthropic,
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
  custom: {
    model: DEFAULT_MODELS.google,
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
};

/**
 * Current active provider configuration
 */
let currentConfig: AIProviderConfig = {
  provider: 'google',
  ...DEFAULT_CONFIGS.google,
};

/**
 * Current AI instance
 */
let currentAI: Genkit | null = null;

/**
 * Initialize the AI with a specific provider
 * This replaces the hardcoded Google AI initialization
 */
export function initializeAIProvider(config?: Partial<AIProviderConfig>): Genkit {
  const finalConfig = { ...currentConfig, ...config };
  currentConfig = finalConfig;

  // Initialize the appropriate plugin based on provider
  switch (finalConfig.provider) {
    case 'google':
      currentAI = genkit({
        plugins: [googleAI({ apiVersion: 'v1' })],
      });
      break;
    case 'openai':
      // OpenAI integration would be added here
      // For now, fall back to Google AI
      currentAI = genkit({
        plugins: [googleAI({ apiVersion: 'v1' })],
      });
      console.warn('OpenAI provider not fully implemented, using Google AI as fallback');
      break;
    case 'anthropic':
      // Anthropic integration would be added here
      // For now, fall back to Google AI
      currentAI = genkit({
        plugins: [googleAI({ apiVersion: 'v1' })],
      });
      console.warn('Anthropic provider not fully implemented, using Google AI as fallback');
      break;
    default:
      currentAI = genkit({
        plugins: [googleAI({ apiVersion: 'v1' })],
      });
  }

  return currentAI;
}

/**
 * Get the current AI instance
 * Falls back to Google AI if not initialized
 */
export function getAI(): Genkit {
  if (!currentAI) {
    return initializeAIProvider();
  }
  return currentAI;
}

/**
 * Get the current provider configuration
 */
export function getProviderConfig(): AIProviderConfig {
  return currentConfig;
}

/**
 * Set the current provider
 */
export function setProvider(provider: AIProvider, model?: string): void {
  currentConfig = {
    provider,
    model: model || DEFAULT_CONFIGS[provider]?.model,
    ...DEFAULT_CONFIGS[provider],
  };
  // Re-initialize with new provider
  initializeAIProvider(currentConfig);
}

/**
 * Get available providers
 */
export function getAvailableProviders(): AIProvider[] {
  return ['google', 'openai', 'anthropic'];
}

/**
 * Get model options for a specific provider
 */
export function getModelOptions(provider: AIProvider): string[] {
  const models: Record<AIProvider, string[]> = {
    google: [
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro-latest',
      'gemini-2.0-flash-exp',
    ],
    openai: [
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-4-turbo',
    ],
    anthropic: [
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
    ],
    custom: [DEFAULT_MODELS.google],
  };
  return models[provider] || [];
}

/**
 * Create a standardized model string for prompts
 * This can be used in prompt templates to make them provider-agnostic
 */
export function getModelString(): string {
  return currentConfig.model || DEFAULT_MODELS[currentConfig.provider] || DEFAULT_MODELS.google;
}

/**
 * Validate provider configuration
 */
export function isValidProvider(provider: string): provider is AIProvider {
  return ['google', 'openai', 'anthropic', 'custom'].includes(provider);
}

// Re-export genkit for backward compatibility
export { ai } from '@/ai/genkit';
