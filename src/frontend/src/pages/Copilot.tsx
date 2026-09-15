import { useState, useRef, useEffect } from 'react';
import { Send, Zap, RefreshCw, Sparkles } from 'lucide-react';
import styles from './Copilot.module.css';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const suggestedQuestions = [
  'Which vehicles are currently at highest risk?',
  'What is causing delays on the Bronx Corridor?',
  'Recommend the most efficient route for JFK deliveries.',
  'Show me fuel consumption patterns for this week.',
  'Which drivers need safety coaching based on today\'s data?',
  'What routes can be optimized to reduce delays?',
  'Summarize the fleet status for the last 24 hours.',
  'How can we improve the on-time rate for R-22?',
];

const stubReplies: Record<string, string> = {
  default: `I'm Bob, your YatraDrishti AI Copilot. I can analyze route performance, flag high-risk vehicles, suggest optimizations, and provide real-time fleet insights.

**AI integration is coming soon.** Once connected to IBM watsonx.ai, I'll provide live, data-driven recommendations based on your fleet's actual telemetry.

In the meantime, explore the Dashboard, Fleet, and Routes pages to see your fleet's current status.`,
};

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: `👋 Hello! I'm **Bob**, your YatraDrishti AI Copilot.

I help fleet operators identify inefficient routes, delayed vehicles, and high-risk trips — reducing travel time, fuel consumption, and delivery delays.

**What I can help with:**
- 🚨 Real-time risk alerts and vehicle status
- 📍 Route optimization recommendations
- 📊 Efficiency and fuel analytics
- 🧭 Trip delay root-cause analysis
- 👨‍✈️ Driver behavior insights

*AI integration with IBM watsonx.ai is coming soon. Try one of the suggested questions below!*`,
      time: getTime(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now(), role: 'user', content: text, time: getTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const reply = stubReplies.default;
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: reply, time: getTime() },
      ]);
      setLoading(false);
    }, 900 + Math.random() * 600);
  }

  function formatContent(text: string) {
    // Simple markdown-ish formatting
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className={styles.bold}>{line.replace(/\*\*/g, '')}</p>;
        }
        // Bold inline
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className={styles.para}>
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
          </p>
        );
      });
  }

  return (
    <div className={styles.page}>
      {/* Left: Chat */}
      <div className={styles.chatCol}>
        <div className={styles.messages}>
          {messages.map(msg => (
            <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.userRow : ''}`}>
              {msg.role === 'assistant' && (
                <div className={styles.avatar}>
                  <Zap size={14} />
                </div>
              )}
              <div className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
                <div className={styles.msgContent}>{formatContent(msg.content)}</div>
                <div className={styles.msgTime}>{msg.time}</div>
              </div>
              {msg.role === 'user' && <div className={styles.userAvatar}>OP</div>}
            </div>
          ))}
          {loading && (
            <div className={styles.msgRow}>
              <div className={styles.avatar}><Zap size={14} /></div>
              <div className={`${styles.bubble} ${styles.aiBubble}`}>
                <div className={styles.typing}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className={styles.inputArea}>
          <input
            className={styles.input}
            placeholder="Ask Bob about your fleet…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            disabled={loading}
          />
          <button
            className={styles.sendBtn}
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
          >
            {loading ? <RefreshCw size={15} className={styles.spin} /> : <Send size={15} />}
          </button>
        </div>
      </div>

      {/* Right: Suggestions */}
      <div className={styles.sideCol}>
        <div className={styles.sideHeader}>
          <Sparkles size={15} />
          <span>Suggested Questions</span>
        </div>
        <div className={styles.suggestions}>
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              className={styles.suggestion}
              onClick={() => sendMessage(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>

        <div className={styles.infoBox}>
          <div className={styles.infoTitle}>About Bob Copilot</div>
          <p className={styles.infoText}>
            Bob is powered by IBM watsonx.ai and trained on urban fleet telemetry, traffic patterns, and logistics optimization models.
          </p>
          <p className={styles.infoText}>
            <strong>Integration status:</strong> <span style={{ color: 'var(--warning)' }}>Coming soon</span>
          </p>
          <div className={styles.infoTags}>
            <span className={styles.tag}>watsonx.ai</span>
            <span className={styles.tag}>Fleet ML</span>
            <span className={styles.tag}>Route Opt.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
