import axios, { AxiosInstance } from 'axios';

export interface GrokMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GrokChatRequest {
  model: string;
  messages: GrokMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface GrokChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DiscoveryInsight {
  category: string;
  technology: string;
  vendor: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

class GrokServiceClass {
  private apiClient: AxiosInstance;
  private conversationHistory: GrokMessage[] = [];
  private systemPrompt: string;

  constructor() {
    // Use backend proxy endpoint instead of calling Grok API directly
    // Gateway service URL from env or default
    const gatewayUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
    this.apiClient = axios.create({
      baseURL: gatewayUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.systemPrompt = `You are an expert technology discovery assistant. Your role is to help identify and understand technology stacks, infrastructure choices, and architectural decisions within organizations.

When analyzing discovery questions, provide structured insights about:
1. Security technologies and practices
2. Infrastructure and cloud services
3. Development tools and frameworks
4. Data management and analytics solutions
5. AI/LLM capabilities and integrations

Format your responses as clear, actionable insights that can be mapped to discovery categories. When asked about specific technologies, provide context about their use cases, integration patterns, and potential risks.

Always be concise and focused on practical technology discovery insights.`;
  }

  /**
   * Send a message to Grok API and get a response
   */
  public async sendMessage(userMessage: string): Promise<string> {
    try {
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      const request: GrokChatRequest = {
        model: 'grok-3',
        messages: [
          { role: 'user', content: this.systemPrompt },
          ...this.conversationHistory,
        ],
        temperature: 0.7,
        max_tokens: 2000,
      };

      const response = await this.apiClient.post<GrokChatResponse>(
        '/grok/chat',
        request
      );

      const assistantMessage = response.data.choices[0]?.message?.content || '';

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('Error calling Grok API:', error);
      throw new Error('Failed to communicate with Grok API');
    }
  }

  /**
   * Ask Grok to analyze and suggest discovery responses
   */
  public async analyzeForDiscovery(question: string, context?: string): Promise<DiscoveryInsight[]> {
    try {
      const prompt = `
Based on the following discovery question, identify and suggest relevant technologies, vendors, and infrastructure choices:

Question: ${question}
${context ? `Additional Context: ${context}` : ''}

Provide a structured analysis with:
1. Suggested technology categories (Security, Infrastructure, Development, Data, AI/LLM)
2. Specific vendors or tools
3. Brief reasoning for each suggestion
4. Confidence level (high/medium/low)

Format as JSON array of objects with fields: category, technology, vendor, reasoning, confidence
`;

      const response = await this.sendMessage(prompt);
      
      // Try to parse the response as JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as DiscoveryInsight[];
      }

      return [];
    } catch (error) {
      console.error('Error analyzing for discovery:', error);
      throw error;
    }
  }

  /**
   * Get clarifying questions about a technology or discovery area
   */
  public async getClarifyingQuestions(topic: string): Promise<string[]> {
    try {
      const prompt = `
Generate 3-5 follow-up questions to better understand the organization's ${topic} technology choices and requirements. 

Format as a simple numbered list:
1. [question 1]
2. [question 2]
...

Focus on practical discovery aspects like compliance, scale, existing vendors, team expertise, and business goals.
`;

      const response = await this.sendMessage(prompt);
      
      // Parse numbered list
      const lines = response.split('\n').filter(line => line.trim());
      const questions = lines
        .filter(line => /^\d+\.\s/.test(line))
        .map(line => line.replace(/^\d+\.\s/, '').trim());

      return questions;
    } catch (error) {
      console.error('Error getting clarifying questions:', error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  public clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get current conversation history
   */
  public getHistory(): GrokMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get conversation summary for insights
   */
  public async getSummary(): Promise<string> {
    try {
      const prompt = `
Provide a brief summary of the technology discovery insights from our conversation, highlighting:
1. Key infrastructure and platform choices identified
2. Major security and compliance considerations
3. Development toolchain and practices
4. Data and analytics capabilities
5. AI/LLM integration opportunities

Keep it concise and focused on actionable insights for the organization's technology strategy.
`;

      return await this.sendMessage(prompt);
    } catch (error) {
      console.error('Error getting summary:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const grokService = new GrokServiceClass();
export default grokService;
