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
import { DiscoveryResponse, DiscoveryNote } from '../services/DiscoveryService';

interface DiscoveryChatProps {
  onInsightSelected?: (insight: DiscoveryInsight) => void;
  discoveryCategory?: string;
  discoveryQuestion?: string;
  sessionResponses?: DiscoveryResponse[];
  sessionNotes?: DiscoveryNote[];
}

export const DiscoveryChat: React.FC<DiscoveryChatProps> = ({
  onInsightSelected,
  discoveryCategory,
  discoveryQuestion,
  sessionResponses = [],
  sessionNotes = [],
}) => {
  const [messages, setMessages] = useState<GrokMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DiscoveryInsight[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format discovery context for display and Grok
  const getDiscoveryContext = (): string => {
    let context = '';
    
    if (sessionResponses && sessionResponses.length > 0) {
      context += 'Current Discovery Responses:\n';
      sessionResponses.forEach((response, index) => {
        context += `${index + 1}. ${response.question_title || 'Q' + index}:\n`;
        
        // Handle different response_value types
        const responseValue = response.response_value;
        const responseText = typeof responseValue === 'string' 
          ? responseValue 
          : typeof responseValue === 'object' 
            ? JSON.stringify(responseValue)
            : String(responseValue);
        
        context += `   - Response: ${responseText}\n`;
        
        // Include vendor selections if available
        if (response.vendor_selections && Object.keys(response.vendor_selections).length > 0) {
          context += `   - Vendors/Technologies Selected:\n`;
          Object.entries(response.vendor_selections).forEach(([category, vendors]: [string, any]) => {
            const vendorList = Array.isArray(vendors) ? vendors.join(', ') : vendors;
            context += `     * ${category}: ${vendorList}\n`;
          });
        }
        
        // Include sizing selections if available
        if (response.sizing_selections && Object.keys(response.sizing_selections).length > 0) {
          context += `   - Sizing Details:\n`;
          Object.entries(response.sizing_selections).forEach(([key, value]) => {
            context += `     * ${key}: ${value}\n`;
          });
        }
      });
      context += '\n';
    }
    
    if (sessionNotes && sessionNotes.length > 0) {
      context += 'Discovery Notes:\n';
      sessionNotes.forEach((note, index) => {
        context += `${index + 1}. [${note.note_type}] ${note.note_text}\n`;
      });
    }
    
    return context;
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
      // Include discovery context if available
      const context = getDiscoveryContext();
      const messageWithContext = context 
        ? `Based on this discovery data:\n${context}\n\nUser question: ${userMessage}`
        : userMessage;
      
      // Get response from Grok
      const response = await grokService.sendMessage(messageWithContext);
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
              {(sessionResponses?.length > 0 || sessionNotes?.length > 0) && (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={() => setShowContext(!showContext)}
                >
                  {showContext ? 'Hide' : 'Show'} Context
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

        {/* Discovery Context */}
        {showContext && (sessionResponses?.length > 0 || sessionNotes?.length > 0) && (
          <Box sx={{ p: 2, bgcolor: 'info.lighter', borderBottom: '1px solid', borderColor: 'divider', maxHeight: '200px', overflowY: 'auto' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              📋 Current Discovery Context
            </Typography>
            {sessionResponses && sessionResponses.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ fontWeight: 'bold' }}>
                  Responses:
                </Typography>
                {sessionResponses.map((response, idx) => (
                  <Box key={idx} sx={{ ml: 1, mb: 1 }}>
                    <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                      • {response.question_title}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ ml: 1 }}>
                      {(() => {
                        const val = response.response_value;
                        const str = typeof val === 'string' 
                          ? val 
                          : typeof val === 'object'
                            ? JSON.stringify(val)
                            : String(val);
                        return str.substring(0, 60) + (str.length > 60 ? '...' : '');
                      })()}
                    </Typography>
                    {response.vendor_selections && Object.keys(response.vendor_selections).length > 0 && (
                      <Box sx={{ ml: 2 }}>
                        {Object.entries(response.vendor_selections).map(([category, vendors]: [string, any]) => {
                          const vendorList = Array.isArray(vendors) ? vendors.join(', ') : vendors;
                          return (
                            <Typography key={category} variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
                              ↳ {category}: {vendorList}
                            </Typography>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}
            {sessionNotes && sessionNotes.length > 0 && (
              <Box>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ fontWeight: 'bold' }}>
                  Notes:
                </Typography>
                {sessionNotes.map((note, idx) => (
                  <Typography key={idx} variant="caption" display="block" sx={{ ml: 1 }}>
                    • [{note.note_type}] {note.note_text.substring(0, 80)}
                    {note.note_text.length > 80 ? '...' : ''}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}

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
              disabled={loading}
              multiline
              maxRows={3}
            />
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={handleSendMessage}
              disabled={loading || !inputValue.trim()}
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
