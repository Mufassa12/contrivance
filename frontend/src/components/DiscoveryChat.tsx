import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
} from '@mui/material';
import {
  Send as SendIcon,
  Clear as ClearIcon,
  ContentCopy as ContentCopyIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import grokService, { DiscoveryInsight, GrokMessage } from '../services/GrokService';

interface DiscoveryChatProps {
  onInsightSelected?: (insight: DiscoveryInsight) => void;
  discoveryCategory?: string;
  discoveryQuestion?: string;
}

export const DiscoveryChat: React.FC<DiscoveryChatProps> = ({
  onInsightSelected,
  discoveryCategory,
  discoveryQuestion,
}) => {
  const [messages, setMessages] = useState<GrokMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DiscoveryInsight[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiKeyDialog, setApiKeyDialog] = useState(!localStorage.getItem('grok_api_key'));
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('grok_api_key');
    if (savedKey) {
      grokService.setApiKey(savedKey);
    }
  }, []);

  const handleApiKeySubmit = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('grok_api_key', apiKeyInput);
      grokService.setApiKey(apiKeyInput);
      setApiKeyDialog(false);
      setApiKeyInput('');
      setError(null);
    } else {
      setError('Please enter a valid API key');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setError(null);
    const userMessage = inputValue;
    setInputValue('');

    // Add user message to display
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Get response from Grok
      const response = await grokService.sendMessage(userMessage);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeForDiscovery = async () => {
    if (!discoveryQuestion) {
      setError('No discovery question selected');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const insights = await grokService.analyzeForDiscovery(
        discoveryQuestion,
        discoveryCategory ? `Category: ${discoveryCategory}` : undefined
      );
      setSuggestions(insights);
      setShowSuggestions(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze discovery');
    } finally {
      setLoading(false);
    }
  };

  const handleGetClarifyingQuestions = async () => {
    if (!discoveryCategory) {
      setError('No discovery category selected');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const questions = await grokService.getClarifyingQuestions(discoveryCategory);
      setClarifyingQuestions(questions);
      setShowQuestions(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get clarifying questions');
    } finally {
      setLoading(false);
    }
  };

  const handleInsightClick = (insight: DiscoveryInsight) => {
    onInsightSelected?.(insight);
    setShowSuggestions(false);
  };

  const handleClearChat = () => {
    grokService.clearHistory();
    setMessages([]);
    setSuggestions([]);
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const confidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'success';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <>
      {/* API Key Dialog */}
      <Dialog open={apiKeyDialog} onClose={() => setApiKeyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Grok API Configuration</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Enter your Grok API key to enable discovery chat features. Get your key from{' '}
              <a href="https://grok-api.apidog.io" target="_blank" rel="noopener noreferrer">
                grok-api.apidog.io
              </a>
            </Typography>
            <TextField
              label="API Key"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              fullWidth
              placeholder="sk-..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeyDialog(false)}>Cancel</Button>
          <Button onClick={handleApiKeySubmit} variant="contained">
            Save & Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Main Chat Container */}
      <Paper
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '600px',
          maxHeight: '600px',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Discovery AI Assistant (Powered by Grok)</Typography>
            <Stack direction="row" spacing={1}>
              {discoveryQuestion && (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<LightbulbIcon />}
                  onClick={handleAnalyzeForDiscovery}
                  disabled={loading}
                >
                  Analyze Question
                </Button>
              )}
              {discoveryCategory && (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={handleGetClarifyingQuestions}
                  disabled={loading}
                >
                  Get Questions
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<ClearIcon />}
                onClick={handleClearChat}
              >
                Clear
              </Button>
            </Stack>
          </Stack>
        </Box>

        {/* Messages Area */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {messages.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', h: '100%' }}>
              <Typography color="textSecondary" align="center">
                Start a conversation to explore technology options or ask discovery questions.
                {!localStorage.getItem('grok_api_key') && (
                  <>
                    <br />
                    Configure your API key to get started.
                  </>
                )}
              </Typography>
            </Box>
          ) : (
            messages.map((msg, idx) => (
              <Stack
                key={idx}
                direction={msg.role === 'user' ? 'row-reverse' : 'row'}
                spacing={1}
                sx={{ alignItems: 'flex-start' }}
              >
                <Box
                  sx={{
                    flex: 1,
                    maxWidth: '80%',
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100',
                      color: msg.role === 'user' ? 'white' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.content}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => handleCopyMessage(msg.content)}
                      sx={{ mt: 1, textTransform: 'none' }}
                    >
                      Copy
                    </Button>
                  </Paper>
                </Box>
              </Stack>
            ))
          )}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2, mt: 0 }}>
            {error}
          </Alert>
        )}

        {/* Input Area */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="Ask about technologies, vendors, or discovery topics..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={loading || !localStorage.getItem('grok_api_key')}
              multiline
              maxRows={3}
            />
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={handleSendMessage}
              disabled={loading || !inputValue.trim() || !localStorage.getItem('grok_api_key')}
              sx={{ alignSelf: 'flex-end' }}
            >
              Send
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Suggestions Dialog */}
      <Dialog open={showSuggestions} onClose={() => setShowSuggestions(false)} maxWidth="md" fullWidth>
        <DialogTitle>Technology Suggestions for Discovery</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {suggestions.map((insight, idx) => (
              <Card
                key={idx}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover', boxShadow: 2 },
                  transition: 'all 0.2s',
                }}
                onClick={() => handleInsightClick(insight)}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box flex={1}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {insight.technology}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Category: {insight.category} • Vendor: {insight.vendor}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {insight.reasoning}
                      </Typography>
                    </Box>
                    <Chip
                      label={insight.confidence}
                      size="small"
                      color={confidenceColor(insight.confidence) as any}
                      variant="outlined"
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSuggestions(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Clarifying Questions Dialog */}
      <Dialog open={showQuestions} onClose={() => setShowQuestions(false)} maxWidth="md" fullWidth>
        <DialogTitle>Clarifying Questions for {discoveryCategory}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {clarifyingQuestions.map((question, idx) => (
              <Card key={idx}>
                <CardContent>
                  <Typography variant="body2">{question}</Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      setInputValue(question);
                      setShowQuestions(false);
                    }}
                    sx={{ mt: 1 }}
                  >
                    Use This Question
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQuestions(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
