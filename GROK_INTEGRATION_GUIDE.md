# Grok Discovery Chat Integration

## Overview

This feature integrates the **Grok API** (via apidog.io) into the Discovery module, allowing users to have intelligent conversations about technology choices and automatically capture insights into their discovery sessions.

## Features

### 1. **AI-Powered Chat Window**
- Real-time conversation with Grok API
- Context-aware responses for technology discovery topics
- Conversation history maintained within a session
- Copy message functionality for easy reference

### 2. **Intelligent Discovery Analysis**
- **"Analyze Question"**: Ask Grok to suggest technologies and vendors for a specific discovery question
- **"Get Questions"**: Generate clarifying questions for a discovery category
- Structured insights with confidence levels (high/medium/low)
- Direct integration of suggested technologies into discovery findings

### 3. **API Configuration**
- Secure API key storage in browser localStorage
- Initial setup dialog for API key configuration
- Easy re-configuration from chat interface
- Get your API key from: https://grok-api.apidog.io

## Architecture

### Components

#### `GrokService.ts` (Services)
- **Purpose**: Handles all Grok API communication
- **Key Methods**:
  - `sendMessage(userMessage)`: Send a message and get a response
  - `analyzeForDiscovery(question, context)`: Analyze discovery questions
  - `getClarifyingQuestions(topic)`: Generate follow-up questions
  - `getSummary()`: Get conversation summary for insights
- **System Prompt**: Specialized for technology discovery context

#### `DiscoveryChat.tsx` (Components)
- **Purpose**: Main UI component for the chat interface
- **Features**:
  - Message display with timestamps
  - Real-time message streaming
  - Suggestions dialog for technology insights
  - Clarifying questions dialog
  - API key configuration dialog
  - Loading states and error handling
- **Props**:
  - `onInsightSelected`: Callback when user selects a suggested technology
  - `discoveryCategory`: Current discovery category for context
  - `discoveryQuestion`: Current discovery question for analysis

#### `useDiscoveryChat.ts` (Hooks)
- **Purpose**: State management hook for chat operations
- **Methods**:
  - `sendMessage(message)`: Send a user message
  - `analyzeForDiscovery(question, category)`: Analyze a question
  - `getClarifyingQuestions(category)`: Get clarifying questions
  - `clearChat()`: Clear conversation history
  - `setApiKey(key)`: Configure API key
  - `clearError()`: Clear error state

#### `DiscoveryAnalytics.tsx` (Pages - Updated)
- **Changes**:
  - Added `Tabs` component for switching between Visualization and Chat
  - Integrated `DiscoveryChat` component
  - Added `handleInsightSelected` to capture Grok insights as discovery notes
  - Tab state management with `tabValue`

## Usage

### 1. **Initial Setup**
```
1. Navigate to Discovery Analytics
2. A dialog will prompt for your Grok API key on first use
3. Enter your API key from https://grok-api.apidog.io
4. Click "Save & Continue"
```

### 2. **Using the Chat**
```
1. Go to Discovery Analytics page
2. Select an account and discovery session
3. Click "Grok AI Assistant" tab
4. Start typing questions about technologies, vendors, or discovery topics
5. Press Enter or click "Send" to get a response
```

### 3. **Analyze Discovery Questions**
```
1. Make sure a discovery question is selected in the context
2. Click "Analyze Question" button in the chat header
3. Grok will suggest relevant technologies with confidence levels
4. Click on a suggestion to add it as a note to your discovery session
```

### 4. **Get Clarifying Questions**
```
1. Select a discovery category
2. Click "Get Questions" button
3. Grok generates follow-up questions for deeper discovery
4. Click "Use This Question" to add it to your chat input
```

## Configuration

### Environment Variables
```bash
# In frontend/.env or .env.local
REACT_APP_GROK_API_KEY=your_api_key_here
```

### API Key Storage
- Primary storage: Browser localStorage
- Key: `grok_api_key`
- Secure: Only stored locally, never sent to backend
- Retrieved on component mount if available

## Data Flow

```
User Input
    ↓
DiscoveryChat Component
    ↓
useDiscoveryChat Hook
    ↓
GrokService
    ↓
Grok API (https://grok-api.apidog.io/v1/chat/completions)
    ↓
Response Processing
    ↓
Display in Chat UI or Dialog
    ↓
On Selection → handleInsightSelected → discoveryService.addNote()
    ↓
Discovery Session Notes Database
```

## System Prompt

The Grok service uses a specialized system prompt focused on:
- Technology stack identification
- Security and compliance best practices
- Infrastructure and cloud services knowledge
- Development tools and frameworks
- Data management solutions
- AI/LLM capabilities

This ensures responses are tailored for technology discovery context.

## API Response Parsing

### Insights Format
```json
[
  {
    "category": "Security",
    "technology": "AWS WAF",
    "vendor": "Amazon Web Services",
    "reasoning": "...",
    "confidence": "high"
  }
]
```

### Clarifying Questions Format
```
1. Question about compliance requirements?
2. Question about team expertise?
...
```

## Error Handling

- API key not configured: Dialog prompts for configuration
- API failures: Alert displayed with error message
- Network errors: Graceful error messages and retry capability
- Invalid JSON parsing: Falls back to displaying raw response

## Browser Support

- Requires localStorage support (all modern browsers)
- Requires CORS configuration on Grok API (configured for public access)
- Tested on:
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+

## Security Considerations

1. **API Key Storage**: 
   - Stored in localStorage (browser-side only)
   - Never transmitted to backend
   - Consider clearing after sensitive work

2. **Data Privacy**:
   - Conversation history stored in memory only
   - Not persisted to backend by default
   - Can be cleared with "Clear" button

3. **Best Practices**:
   - Don't share API keys
   - Clear chat after sensitive discussions
   - Use environment variables for deployment

## Future Enhancements

- [ ] Conversation persistence to database
- [ ] Export chat history as PDF
- [ ] Multi-turn clarifications with user feedback
- [ ] Integration with discovery templates
- [ ] Analytics on suggested vs. selected technologies
- [ ] Custom system prompts per organization
- [ ] Support for other AI providers (OpenAI, Anthropic)
- [ ] Bulk analysis of multiple questions

## Troubleshooting

### Chat not responding
- Verify API key is correct
- Check network connectivity
- Ensure CORS is enabled on Grok API endpoint

### Suggestions not appearing
- Verify discovery question/category is selected
- Try rephrasing the question
- Check browser console for errors

### API Key errors
- Click settings to re-enter API key
- Clear localStorage: `localStorage.removeItem('grok_api_key')`
- Verify key format and permissions on Grok website

## Dependencies

- `axios`: HTTP client for API calls
- `@mui/material`: UI components
- `@mui/icons-material`: Icons
- `d3`: (existing) for visualization

## Testing

Example discovery questions to test:
1. "What cloud providers should we consider?"
2. "What security frameworks do you recommend?"
3. "What modern development stacks are trending?"
4. "How should we approach AI/ML integration?"
5. "What database solutions fit enterprise needs?"

## References

- Grok API Docs: https://grok-api.apidog.io
- Grok Model: https://openai.com (Grok is based on similar architecture)
- Discovery Module: See DISCOVERY_MODULE.md
