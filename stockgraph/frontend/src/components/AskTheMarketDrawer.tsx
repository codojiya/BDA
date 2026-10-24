import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Chip,
  Paper,
  CircularProgress,
  Divider,
  Alert,
} from '@mui/material';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Wrench,
  HelpCircle,
  AlertCircle,
  Copy,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  selectedTicker?: string;
}

const SUGGESTED_QUESTIONS = [
  'What is the current market regime and what does it mean?',
  'Which stocks have the highest systemic betweenness centrality?',
  'If AAPL drops by 5%, which stocks are hit the hardest in contagion?',
  'What is the Sharpe ratio, volatility, and beta of NVDA?',
  'Is the live market open right now and what is the WebSocket throughput?',
];

export const AskTheMarketDrawer: React.FC<Props> = ({
  open,
  onClose,
  selectedTicker,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am StockGraph AI. I can query our quantitative network topology, run contagion simulations, check GMM regimes, and calculate risk/return metrics. How can I help with your analysis today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input.trim();
    if (!textToSend || streaming) return;

    setInput('');
    setErrorNotice(null);

    const userMsg: Message = { role: 'user', content: textToSend };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setStreaming(true);
    setActiveTools([]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json_payload(textToSend, messages),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let toolsCollected: string[] = [];

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6);
                const event = JSON.parse(jsonStr);

                if (event.type === 'tool_call') {
                  toolsCollected.push(event.tool);
                  setActiveTools([...toolsCollected]);
                } else if (event.type === 'final_content') {
                  assistantText = event.content;
                  if (event.tools_used) {
                    toolsCollected = [...toolsCollected, ...event.tools_used];
                  }
                } else if (event.type === 'error') {
                  setErrorNotice(event.message);
                  assistantText = event.message;
                }
              } catch (e) {
                // partial JSON, wait for next chunk
              }
            }
          }

          // Update assistant message live in UI
          setMessages([
            ...updatedHistory,
            {
              role: 'assistant',
              content: assistantText || 'Analyzing quantitative models...',
              toolsUsed: Array.from(new Set(toolsCollected)),
            },
          ]);
        }
      }
    } catch (err: any) {
      console.error('Chat error', err);
      setErrorNotice(err?.message || 'Failed to connect to AI service.');
      setMessages([
        ...updatedHistory,
        {
          role: 'assistant',
          content: 'Unable to reach the AI engine. Please verify that GROQ_API_KEY is configured in backend/.env.',
        },
      ]);
    } finally {
      setStreaming(false);
      setActiveTools([]);
    }
  };

  const json_payload = (msg: string, hist: Message[]) => {
    return JSON.stringify({
      message: msg,
      history: hist.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 460, md: 500 },
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#0e1320' : '#ffffff'),
        },
      }}
    >
      {/* Drawer Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={20} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Ask the Market
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Grounded AI Assistant • Powered by Groq Llama 3.3
            </Typography>
          </Box>
        </Box>

        <IconButton size="small" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </Box>

      {/* API Key Missing Notice */}
      {errorNotice && errorNotice.includes('GROQ_API_KEY') && (
        <Alert severity="warning" sx={{ m: 2, fontSize: '0.8rem' }}>
          <b>Groq API Key Required:</b>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
            GROQ_API_KEY=gsk_your_key in backend/.env
          </Typography>
        </Alert>
      )}

      {/* Conversation Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  maxWidth: '92%',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: isUser ? 'primary.main' : 'secondary.main',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.5,
                  }}
                >
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    backgroundColor: isUser
                      ? 'primary.main'
                      : (theme) => (theme.palette.mode === 'dark' ? '#141b2d' : '#f1f5f9'),
                    color: isUser ? '#ffffff' : 'text.primary',
                    border: isUser
                      ? 'none'
                      : (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {m.content}
                  </Typography>

                  {/* Tool Badges */}
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid rgba(148, 163, 184, 0.2)', display: 'flex', gap: 0.8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Wrench size={12} color="#94a3b8" />
                      {m.toolsUsed.map((tool) => (
                        <Chip
                          key={tool}
                          label={`used: ${tool}`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(37, 99, 235, 0.15)',
                            color: 'primary.main',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>
          );
        })}

        {streaming && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              {activeTools.length > 0
                ? `Executing quantitative tool: ${activeTools[activeTools.length - 1]}...`
                : 'Thinking with Groq Llama 3.3...'}
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Suggested Questions Pill Rack */}
      <Box sx={{ px: 2, py: 1, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.8, display: 'block', fontSize: '0.68rem', textTransform: 'uppercase' }}>
          Suggested Inquiries
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', pb: 0.5 }}>
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <Chip
              key={idx}
              label={q}
              size="small"
              onClick={() => handleSend(q)}
              disabled={streaming}
              sx={{
                fontSize: '0.72rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Input Bar */}
      <Box sx={{ p: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}`, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ask about beta, contagion cascades, regimes..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={streaming}
        />
        <Button
          variant="contained"
          onClick={() => handleSend()}
          disabled={!input.trim() || streaming}
          sx={{ minWidth: 44, px: 2 }}
        >
          <Send size={18} />
        </Button>
      </Box>

      {/* Educational Disclaimer */}
      <Box sx={{ px: 2, py: 1, backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#090d16' : '#f8fafc'), textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          Research & Education Sandbox • Outputs grounded in mathematical tool executions. Not investment advice.
        </Typography>
      </Box>
    </Drawer>
  );
};
