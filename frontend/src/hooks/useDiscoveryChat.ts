import { useState, useCallback } from 'react';
import grokService, { DiscoveryInsight } from '../services/GrokService';

export interface ChatState {
  isLoading: boolean;
  error: string | null;
  hasApiKey: boolean;
}

export interface UseDiscoveryChatReturn {
  state: ChatState;
  sendMessage: (message: string) => Promise<string>;
  analyzeForDiscovery: (question: string, category?: string) => Promise<DiscoveryInsight[]>;
  getClarifyingQuestions: (category: string) => Promise<string[]>;
  clearChat: () => void;
  setApiKey: (key: string) => void;
  clearError: () => void;
}

export const useDiscoveryChat = (): UseDiscoveryChatReturn => {
  const [state, setState] = useState<ChatState>({
    isLoading: false,
    error: null,
    hasApiKey: !!localStorage.getItem('grok_api_key'),
  });

  const sendMessage = useCallback(async (message: string): Promise<string> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await grokService.sendMessage(message);
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setState((prev) => ({ ...prev, error: errorMsg }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const analyzeForDiscovery = useCallback(
    async (question: string, category?: string): Promise<DiscoveryInsight[]> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const insights = await grokService.analyzeForDiscovery(question, category);
        return insights;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to analyze';
        setState((prev) => ({ ...prev, error: errorMsg }));
        throw err;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    []
  );

  const getClarifyingQuestions = useCallback(async (category: string): Promise<string[]> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const questions = await grokService.getClarifyingQuestions(category);
      return questions;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get questions';
      setState((prev) => ({ ...prev, error: errorMsg }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const clearChat = useCallback(() => {
    grokService.clearHistory();
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const setApiKey = useCallback((key: string) => {
    localStorage.setItem('grok_api_key', key);
    grokService.setApiKey(key);
    setState((prev) => ({ ...prev, hasApiKey: true, error: null }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    sendMessage,
    analyzeForDiscovery,
    getClarifyingQuestions,
    clearChat,
    setApiKey,
    clearError,
  };
};
