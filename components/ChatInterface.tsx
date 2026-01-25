
// components/ChatInterface.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, UserLevel, FileAttachment, ChatMode, ImageSize } from '../types';
import { Send, User, Bot, Loader2, Paperclip, FileText, Brain, Zap, Scale, Image as ImageIcon, ExternalLink, X, Info, GraduationCap, Trophy, Mic, MicOff, Volume2, AlertCircle, FileType, Upload, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { generateIllustration } from '../services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, mode: ChatMode, attachment?: FileAttachment, generatedImage?: string) => void;
  isLoading: boolean;
  level: UserLevel;
  activeMode: ChatMode | null;
  setActiveMode: (mode: ChatMode) => void;
  onError: (msg: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for high-res study docs

const MODE_METADATA: Record<ChatMode, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  learning: { label: 'LEARNING', icon: <GraduationCap size={10} />, desc: 'Step-by-step guidance & analogies', color: 'text-emerald-500' },
  exam: { label: 'EXAM', icon: <Trophy size={10} />, desc: 'Formal steps & mark-winning tips', color: 'text-indigo-500' },
  fast: { label: 'FAST ANSWER', icon: <Zap size={10} />, desc: 'DIRECT MATH DERIVATION, NO TEXT', color: 'text-amber-500' }
};

const getFileTypeLabel = (mime: string) => {
  if (mime.includes('pdf')) return 'PDF DOCUMENT';
  if (mime.includes('image')) return 'IMAGE PREVIEW';
  return 'FILE ATTACHMENT';
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading, level, activeMode, setActiveMode, onError }) => {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileAttachment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isIllustrating, setIsIllustrating] = useState(false);
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  
  // Live Voice State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [input]);

  // --- File Logic ---

  const processFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      onError("File too large. Max is 10MB.");
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      onError("Please upload an image (JPG/PNG/WEBP) or a PDF.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedFile({ 
        data: base64, 
        mimeType: file.type, 
        name: file.name 
      });
    };
    reader.readAsDataURL(file);
  }, [onError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // --- Voice Logic (Live API) ---

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const stopLiveSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsLiveActive(false);
    setIsLiveConnecting(false);
  };

  const startLiveSession = async () => {
    if (isLiveActive) {
      stopLiveSession();
      return;
    }

    if (!navigator.onLine) {
      onError("Internet connection is required for voice features.");
      return;
    }

    setIsLiveConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLiveActive(true);
            setIsLiveConnecting(false);
            const source = inputContext.createMediaStreamSource(stream);
            const scriptProcessor = inputContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const binary = String.fromCharCode(...new Uint8Array(int16.buffer));
              const base64 = btoa(binary);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopLiveSession(),
          onerror: (e) => {
            console.error("Live session error", e);
            onError("Voice session interrupted.");
            stopLiveSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: `You are MathMentor AI, a patient math tutor. Current Mode: ${activeMode}. Level: ${level}. Help the student understand math through voice. Be concise and friendly.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Live session failed", err);
      onError("Could not access microphone or connect to AI.");
      setIsLiveConnecting(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((input.trim() || selectedFile) && !isLoading) {
      let illustrationUrl: string | undefined = undefined;
      
      if (isIllustrating) {
        try {
          const result = await generateIllustration(input, imageSize, true);
          if (result) illustrationUrl = result;
        } catch (error: any) {
          onError("Illustration generation failed.");
        } finally {
          setIsIllustrating(false);
        }
      }

      onSendMessage(input, activeMode || 'learning', selectedFile || undefined, illustrationUrl);
      setInput('');
      setSelectedFile(null);
    }
  };

  const processText = (text: string) => {
    let clean = text.trim();
    if (clean.startsWith('=')) {
      clean = clean.substring(1).trim();
    }
    return clean;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header with Modes */}
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50/50 dark:bg-slate-900/50 gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex bg-slate-200/50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 self-start">
            {(['learning', 'exam', 'fast'] as ChatMode[]).map((m) => (
              <button 
                key={m}
                type="button"
                onClick={() => setActiveMode(m)}
                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-tight transition-all flex items-center gap-1.5 ${
                  activeMode === m 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                {MODE_METADATA[m].icon}
                {MODE_METADATA[m].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
            <Info size={10} className="text-slate-300" />
            <span className="uppercase tracking-widest leading-none">{activeMode ? MODE_METADATA[activeMode].desc : 'Choose a mode to begin'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
           <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">{level.split(' (')[0]}</span>
        </div>
      </div>

      {/* Message Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-900/30">
              <Bot size={32} />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">MathMentor Ready</h3>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium max-w-[240px]">Ask a question or upload a photo of your problem.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm border ${
              m.role === 'user' 
                ? 'bg-indigo-600 border-indigo-500 text-white' 
                : (m.error ? 'bg-red-100 border-red-200 text-red-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-500')
            }`}>
              {m.role === 'user' ? <User size={16} /> : (m.error ? <AlertCircle size={16} /> : <Bot size={16} />)}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] border shadow-sm h-fit self-start leading-relaxed ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white border-indigo-500' 
                : (m.error 
                    ? 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700')
            }`}>
              {m.image && <img src={m.image} className="mb-4 rounded-xl border-2 dark:border-slate-700 shadow-md max-h-72 w-auto mx-auto hover:scale-[1.02] transition-transform" />}
              {m.attachment && (
                <div className="mb-3 p-2 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2 text-[10px] font-bold">
                  <FileText size={14} /> <span className="truncate">{m.attachment.name}</span>
                </div>
              )}
              
              <div className={`prose prose-xs max-w-none ${m.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {processText(m.text)}
                </ReactMarkdown>
              </div>
              
              {m.citations && m.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-full mb-1">Academic Sources:</span>
                  {m.citations.map((cite, idx) => (
                    <a key={idx} href={cite.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] text-indigo-500 hover:text-indigo-600 transition-colors">
                      <ExternalLink size={10} /> {cite.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-500 shadow-sm"><Bot size={16} /></div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] text-slate-400 font-bold uppercase shadow-sm">
              <Loader2 size={12} className="animate-spin text-indigo-500" /> 
              <span className="animate-pulse tracking-widest">Generating Insight...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form 
        onSubmit={handleSubmit} 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] transition-all ${isDragging ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
      >
        {selectedFile && (
          <div className="mb-3 flex items-center justify-between px-3 py-2.5 bg-slate-900 dark:bg-slate-800 rounded-2xl border border-indigo-500/30 animate-in slide-in-from-bottom-3 duration-300 shadow-lg ring-1 ring-indigo-500/20">
            <div className="flex items-center gap-4">
              {selectedFile.mimeType.startsWith('image/') ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-500/50 bg-black shadow-inner">
                  <img src={`data:${selectedFile.mimeType};base64,${selectedFile.data}`} className="w-full h-full object-cover" alt="Preview" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <FileType size={24} />
                </div>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-white truncate max-w-[180px] tracking-tight">{selectedFile.name}</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[8px] font-black uppercase tracking-wider">
                    <CheckCircle2 size={8} /> Ready
                  </div>
                </div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                  {getFileTypeLabel(selectedFile.mimeType)}
                </span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedFile(null)} 
              className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all active:scale-90"
              title="Remove Attachment"
            >
              <X size={16} strokeWidth={3} />
            </button>
          </div>
        )}

        {isDragging && !selectedFile && (
          <div className="mb-3 p-4 border-2 border-dashed border-indigo-400 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 flex items-center justify-center gap-3 animate-pulse">
            <Upload className="text-indigo-500" size={20} />
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Drop Study Doc Here</span>
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5 mb-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
              title="Attach Problem Screenshot/PDF"
            >
              <Paperclip size={20} />
            </button>
            
            <button
              type="button"
              onClick={startLiveSession}
              disabled={isLiveConnecting}
              className={`p-2.5 rounded-xl transition-all border relative ${
                isLiveActive 
                  ? 'text-white bg-red-500 border-red-600 shadow-md shadow-red-500/20 animate-pulse' 
                  : 'text-slate-400 border-transparent hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              } ${isLiveConnecting ? 'opacity-50' : ''}`}
            >
              {isLiveConnecting ? <Loader2 size={20} className="animate-spin" /> : isLiveActive ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>
          
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
          
          <div className="flex-1 relative bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus-within:border-indigo-400/50 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all shadow-sm group">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isLiveActive}
              placeholder={isLiveActive ? "Voice Chat Active..." : `Paste or type your math problem...`}
              className="w-full bg-transparent border-none py-3.5 px-4 pr-12 text-[13px] text-slate-700 dark:text-slate-200 focus:outline-none resize-none min-h-[80px] leading-relaxed custom-scrollbar"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            {isLiveActive && (
              <div className="absolute inset-0 bg-indigo-50/10 dark:bg-indigo-900/5 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                  <Volume2 size={12} className="animate-pulse" /> Live Mentoring
                </div>
              </div>
            )}
            <button
              type="submit"
              onClick={() => handleSubmit()}
              disabled={(!input.trim() && !selectedFile) || isLoading || isLiveActive}
              className={`absolute right-2 bottom-2 p-2.5 rounded-xl transition-all flex items-center justify-center ${
                (!input.trim() && !selectedFile) || isLoading || isLiveActive
                  ? 'text-slate-300 dark:text-slate-700'
                  : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95'
              }`}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </form>
      {/* Paste & Drop Hint */}
      {!selectedFile && !input && (
        <div className="px-4 pb-2 bg-white dark:bg-slate-900 text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em] text-center">
          Pro Tip: Ctrl+V to paste screenshots directly
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
