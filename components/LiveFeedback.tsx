import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageSquare, Clock, AlertCircle, Sparkles } from 'lucide-react';

/**
 * Type definition matching the global feedback structure.
 * We use a simplified version for the live stream.
 */
interface LiveFeedbackItem {
  id: string;
  userName: string;
  message: string;
  timestamp: number;
  avatarSeed: string;
}

/**
 * TypeScript declaration for the globally exposed Firebase instance.
 * As per requirements, we assume window.firebaseDatabase is initialized in HTML.
 */
declare global {
  interface Window {
    firebaseDatabase: any;
  }
}

const LiveFeedback: React.FC = () => {
  const [messages, setMessages] = useState<LiveFeedbackItem[]>([]);
  const [userName, setUserName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Realtime Listener
  useEffect(() => {
    if (!window.firebaseDatabase) {
      setError("Firebase Database instance not found.");
      return;
    }

    // Reference the 'liveFeedback' node
    const feedbackRef = window.firebaseDatabase.ref('liveFeedback');
    
    // Listen for changes (limit to last 50 messages for performance)
    const listener = feedbackRef.limitToLast(50).on('value', (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const formattedMessages: LiveFeedbackItem[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setMessages(formattedMessages);
        
        // Auto-scroll to bottom on new message
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      } else {
        setMessages([]);
      }
    }, (err: Error) => {
      console.error("Firebase Read Error:", err);
      setError("Could not connect to live stream.");
    });

    // Cleanup listener on unmount
    return () => feedbackRef.off('value', listener);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !userName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const feedbackRef = window.firebaseDatabase.ref('liveFeedback');
      const newMessageRef = feedbackRef.push();
      
      await newMessageRef.set({
        userName: userName.trim(),
        message: message.trim(),
        timestamp: Date.now(),
        avatarSeed: userName.trim().toLowerCase()
      });

      setMessage('');
    } catch (err) {
      console.error("Firebase Write Error:", err);
      setError("Failed to send feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-colors">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Live Community</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Realtime Updates</span>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg">
            {messages.length} MSGS
          </span>
        )}
      </div>

      {/* Messages List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white dark:bg-slate-900"
      >
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold animate-in fade-in">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {messages.length === 0 && !error ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <Sparkles size={40} className="text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300"
            >
              <img 
                src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${msg.avatarSeed}`}
                alt={msg.userName}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="text-[11px] font-black text-slate-900 dark:text-white truncate pr-2">
                    {msg.userName}
                  </span>
                  <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap flex items-center gap-1">
                    <Clock size={8} />
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed break-words">
                    {msg.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-shrink-0 w-1/3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User size={12} />
              </div>
              <input
                type="text"
                required
                maxLength={20}
                placeholder="Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                required
                maxLength={200}
                placeholder="Share your thoughts..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <button
                type="submit"
                disabled={isSubmitting || !message.trim() || !userName.trim()}
                className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-indigo-500/20"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
          <p className="text-[9px] text-center font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
            {isSubmitting ? 'Transmitting Data...' : 'Messages are shared instantly with the community'}
          </p>
        </form>
      </div>
    </div>
  );
};

export default LiveFeedback;