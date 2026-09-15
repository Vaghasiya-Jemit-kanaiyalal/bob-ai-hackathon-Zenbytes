import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Zap, RefreshCw, Sparkles } from 'lucide-react';
import { sendCopilotMessage } from '../data/api';
import styles from './Copilot.module.css';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const suggestedQuestions = [
  'Which vehicles are at highest risk right now?',
  'Show me the fleet status summary.',
  'List all delayed trips with details.',
  'Analyse fuel consumption across all routes.',
  'Which drivers need safety coaching?',
  'How can Pune–Mumbai NH-48 route delays be reduced?',
  'Show ML risk scores for all vehicles.',
  'Which route has the worst on-time performance?',
];

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const INTRO_MESSAGE = `👋 Namaste! I'm **Bob**, your YatraDrishti AI Copilot.

I answer questions using your **actual imported fleet data** from the MySQL database and ML analysis results.

**What I can help with:**
- 🚨 High-risk vehicles and safety alerts
- 📍 Route performance (NH-48, JNPT, city corridors)
- 📊 Fuel efficiency and cost analytics
- 🕐 Delayed trips and root-cause analysis
- 👨‍✈️ Driver behaviour insights
- 🤖 ML scoring results and recommendations

*Ask me anything about your fleet — I'll query your real data to answer!*`;

const GREETINGS = ['hi', 'hello', 'hey', 'namaste', 'hii', 'helo'];

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Scroll only inside the chat messages container — never the page
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now(), role: 'user', content: text, time: getTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Greeting → show typing animation for 2s then show intro
    if (GREETINGS.includes(text.trim().toLowerCase())) {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLoading(false);
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: INTRO_MESSAGE, time: getTime() },
      ]);
      return;
    }

    setLoading(true);

    try {
      const reply = await sendCopilotMessage(text);
      const content = reply ??
        `I couldn't connect to the fleet database right now. Please ensure:\n` +
        `1. The backend is running (port 4000)\n` +
        `2. MySQL is connected and data has been imported\n` +
        `3. You are authenticated\n\n` +
        `Try uploading fleet data via the **Data Center** page first.`;

      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content, time: getTime() },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'An error occurred while querying fleet data. Please try again.',
          time: getTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  function formatContent(text: string) {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className={styles.bold}>{line.replace(/\*\*/g, '')}</p>;
        }
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
        <div className={styles.messages} ref={messagesRef}>
          {messages.length === 0 && !loading && (
            <div className={styles.emptyChat}>
              <Zap size={28} className={styles.emptyChatIcon} />
              <div className={styles.emptyChatTitle}>Ask Question Answer</div>
              <div className={styles.emptyChatSub}>Type <strong>hi</strong> to get started, or ask anything about your fleet.</div>
            </div>
          )}
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
              {msg.role === 'user' && <div className={styles.userAvatar}>You</div>}
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
          <div />
        </div>

        <div className={styles.inputArea}>
          <input
            className={styles.input}
            placeholder="Ask Bob about your fleet data…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
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
              onClick={e => { e.preventDefault(); sendMessage(q); }}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>

        <div className={styles.infoBox}>
          <div className={styles.infoTitle}>About Bob Copilot</div>
          <p className={styles.infoText}>
            Bob answers using your <strong>real fleet data</strong> imported via the Data Center —
            querying MySQL for KPIs, vehicle risk, delays, fuel stats, and ML analysis results.
          </p>
          <p className={styles.infoText}>
            <strong>Data source:</strong>{' '}
            <span style={{ color: 'var(--success)' }}>MySQL + ML Service</span>
          </p>
          <div className={styles.infoTags}>
            <span className={styles.tag}>Real Data</span>
            <span className={styles.tag}>Fleet ML</span>
            <span className={styles.tag}>Route Opt.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
