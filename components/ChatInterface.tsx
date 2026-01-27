
// components/ChatInterface.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, UserLevel, FileAttachment, ChatMode, Language } from '../types';
import { Send, User, Bot, Paperclip, FileText, Zap, Image as ImageIcon, ExternalLink, X, Info, GraduationCap, Trophy, Lightbulb, ListChecks, HelpCircle, Sparkles, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MathRenderer from './MathRenderer';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, mode: ChatMode, attachment?: FileAttachment, generatedImage?: string) => void;
  isLoading: boolean;
  level: UserLevel;
  activeMode: ChatMode | null;
  setActiveMode: (mode: ChatMode) => void;
  onError: (msg: string) => void;
  language: Language;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MODE_METADATA: Record<ChatMode, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  learning: { label: 'LEARNING', icon: <GraduationCap size={12} />, desc: 'Step-by-step & Analogies', color: 'text-emerald-500' },
  exam: { label: 'EXAM', icon: <Trophy size={12} />, desc: 'Formal steps & mark-winning tips', color: 'text-indigo-500' },
  fast: { label: 'FAST ANSWER', icon: <Zap size={12} />, desc: 'DIRECT MATH ONLY', color: 'text-amber-500' }
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading, level, activeMode, setActiveMode, onError, language }) => {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileAttachment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [input]);

  const processFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) { onError("File too large."); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      setSelectedFile({ data: base64, mimeType: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  }, [onError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if ((text || selectedFile) && !isLoading && !isProcessing) {
      setIsProcessing(true);
      setInput('');
      setSelectedFile(null);
      try {
        await onSendMessage(text, activeMode || 'learning', selectedFile || undefined);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const ChatMarkdownComponents: any = {
    h3: ({ children }: any) => {
      const text = children?.toString() || "";
      let icon = <Info size={14} />;
      let colorClass = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      if (text.includes("IDEA")) {
        icon = <Lightbulb size={14} />;
        colorClass = "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      } else if (text.includes("STEP")) {
        icon = <ListChecks size={14} />;
        colorClass = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      } else if (text.includes("ANALOGY")) {
        icon = <Sparkles size={14} />;
        colorClass = "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800";
      } else if (text.includes("CHECK")) {
        icon = <HelpCircle size={14} />;
        colorClass = "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800";
      }
      return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest my-6 w-fit ${colorClass} shadow-sm`}>
          {icon}
          {children}
        </div>
      );
    },
    p: ({ children }: any) => <p className="mb-4 leading-relaxed font-medium tracking-tight text-slate-700 dark:text-slate-200">{children}</p>,
    strong: ({ children }: any) => <strong className="font-black text-indigo-600 dark:text-indigo-400">{children}</strong>,
    li: ({ children }: any) => <li className="mb-2 ml-4 list-disc text-slate-700 dark:text-slate-200">{children}</li>,
    code: ({ children, inline, className }: any) => {
      const isMath = className?.includes('language-math');
      if (isMath && !inline) {
        return (
          <div className="my-4 p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center justify-center overflow-x-auto custom-scrollbar">
            <MathRenderer latex={String(children).replace(/\n$/, '')} displayMode={true} className="text-lg md:text-xl" />
          </div>
        );
      }
      return inline 
        ? <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[0.9em] border border-slate-200 dark:border-slate-700">{children}</code>
        : <div className="my-4 overflow-x-auto custom-scrollbar">
            <pre className="p-4 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs md:text-sm leading-relaxed text-left transition-all hover:bg-white dark:hover:bg-black/50 shadow-inner">
              <code>{children}</code>
            </pre>
          </div>
    },
    math: ({ value }: any) => (
      <div className="my-4 p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center justify-center overflow-x-auto custom-scrollbar group relative">
        <MathRenderer latex={value} displayMode={true} className="text-lg md:text-xl" />
      </div>
    ),
    inlineMath: ({ value }: any) => <MathRenderer latex={value} displayMode={false} />
  };

  const FastAnswerMarkdownComponents: any = {
    p: ({ children }: any) => <div className="flex flex-col items-center w-full">{children}</div>,
    math: ({ value }: any) => (
      <MathRenderer 
        latex={value} 
        displayMode={true} 
        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white" 
      />
    ),
    inlineMath: ({ value }: any) => (
       <MathRenderer 
        latex={value} 
        displayMode={true} 
        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white block w-full text-center" 
      />
    )
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f172a] rounded-none md:rounded-2xl shadow-xl border-0 md:border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0f172a]">
        <div className="flex bg-slate-100 dark:bg-[#1e293b] p-1 rounded-xl">
          {(['learning', 'exam', 'fast'] as ChatMode[]).map((m) => (
            <button 
              key={m}
              onClick={() => setActiveMode(m)}
              className={`px-4 md:px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeMode === m 
                  ? 'bg-white dark:bg-[#334155] text-indigo-600 dark:text-white shadow-sm' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {MODE_METADATA[m].icon} <span className="hidden sm:inline">{MODE_METADATA[m].label}</span>
              {activeMode === m && <span className="sm:hidden">{MODE_METADATA[m].label}</span>}
            </button>
          ))}
        </div>
        <div className="hidden md:block text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em]">
          {level.includes('Intermediate') ? 'INTERMEDIATE' : level.split(' (')[0]}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-10 space-y-10 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-80 py-20">
            <div className="w-24 h-24 bg-slate-100 dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
              <Bot size={48} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-800 dark:text-slate-300">Awaiting Assignment</h3>
            <p className="text-xs max-w-[280px] mt-4 font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Ask a complex problem or upload your homework photo.
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const isStreaming = isLoading && i === messages.length - 1 && m.role === 'model';
          const hasContent = m.text.trim() !== '' || m.attachment || m.image || (m.citations && m.citations.length > 0) || isStreaming;
          if (!hasContent) return null;
          const isFastAnswer = activeMode === 'fast' && m.role === 'model' && !isStreaming;

          return (
            <div key={i} className={`flex gap-3 md:gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md border ${
                m.role === 'user' 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-500'
              }`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[88%] md:max-w-[82%] rounded-2xl md:rounded-3xl px-4 md:px-6 py-4 md:py-5 text-[14px] border shadow-sm leading-relaxed transition-all duration-500 ${
                m.role === 'user' 
                  ? 'bg-indigo-600 text-white border-indigo-500' 
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'
              }`}>
                {m.attachment && (
                  <div className="mb-4 p-3 bg-black/5 dark:bg-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 border border-black/5">
                    <FileText size={16} /> {m.attachment.name}
                  </div>
                )}
                {m.image && (
                  <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm max-w-sm">
                    <img src={m.image} alt="Generated illustration" className="w-full h-auto object-cover" />
                  </div>
                )}
                <div className={`prose prose-sm dark:prose-invert max-w-none ${m.role === 'user' ? 'prose-invert' : ''}`}>
                  {isFastAnswer ? (
                    <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-amber-500/20 shadow-inner group">
                      <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                         <Zap size={12} fill="currentColor" /> {language === 'BM' ? 'JAWAPAN PANTAS' : 'QUICK ANSWER'}
                      </div>
                      <div className="w-full">
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                          components={FastAnswerMarkdownComponents}
                        >
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath]} 
                      rehypePlugins={[rehypeKatex]}
                      components={m.role === 'model' ? ChatMarkdownComponents : {}}
                    >
                      {m.text}
                    </ReactMarkdown>
                  )}
                  {isStreaming && m.text.trim() === '' && (
                    <div className="flex items-center gap-3 py-1 text-indigo-500 dark:text-indigo-400">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] animate-pulse">
                        {language === 'BM' ? 'BERFIKIR...' : 'THINKING...'}
                      </span>
                    </div>
                  )}
                </div>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <ExternalLink size={12} /> Sources & References
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {m.citations.map((cite, idx) => (
                        <a 
                          key={idx} 
                          href={cite.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center gap-1.5"
                        >
                          {cite.title} <ChevronRight size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] pb-safe">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
          {selectedFile && (
            <div className="mb-4 flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400"><FileText size={16} /> {selectedFile.name}</div>
              <button type="button" onClick={() => setSelectedFile(null)} className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-xl transition-all"><X size={16} /></button>
            </div>
          )}
          <div className="flex items-center gap-3 md:gap-4 bg-slate-50 dark:bg-[#1e293b] rounded-2xl p-2 pl-3 md:pl-4 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              className="p-2 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-all active:scale-90"
            >
              <Paperclip size={20} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a problem or upload photo."
              className="flex-1 bg-transparent border-none py-3 text-[14px] text-slate-900 dark:text-slate-100 focus:ring-0 outline-none resize-none min-h-[24px] max-h-[200px] custom-scrollbar transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600"
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  handleSubmit(); 
                } 
              }}
            />
            <button 
              type="submit" 
              disabled={(!input.trim() && !selectedFile) || isLoading || isProcessing} 
              className={`p-2.5 rounded-xl transition-all ${(!input.trim() && !selectedFile) || isLoading || isProcessing ? 'text-slate-300 dark:text-slate-700' : 'text-indigo-600 dark:text-indigo-400 hover:scale-110 active:scale-95'}`}
            >
              <Send size={20} />
            </button>
          </div>
          <div className="mt-3 text-center text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em]">Precision Guided Learning AI</div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
