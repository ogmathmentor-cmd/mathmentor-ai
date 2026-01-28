import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { X, Mic, MicOff, Sparkles, Loader2, Info, Key, RotateCcw, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MathRenderer from './MathRenderer';

interface LiveVoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  level: string;
  language: string;
}

// Manual decoding logic as required by SDK rules
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const SubtitleMarkdownComponents: any = {
  p: ({ children }: any) => <span className="inline">{children}</span>,
  math: ({ value }: any) => <MathRenderer latex={value} displayMode={false} className="text-inherit mx-1" />,
  inlineMath: ({ value }: any) => <MathRenderer latex={value} displayMode={false} className="text-inherit mx-1" />,
  strong: ({ children }: any) => <strong className="font-black text-indigo-600 dark:text-indigo-400">{children}</strong>,
};

const LiveVoiceOverlay: React.FC<LiveVoiceOverlayProps> = ({ isOpen, onClose, level, language }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'closed' | 'error' | 'key-required'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [userTranscription, setUserTranscription] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [userAudioLevel, setUserAudioLevel] = useState(0); // 0 to 1
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const handleKeySelection = async () => {
    try {
      if (window.aistudio && typeof (window as any).aistudio.openSelectKey === 'function') {
        await (window as any).aistudio.openSelectKey();
        startSession();
      }
    } catch (err) {
      console.error("Failed to open key selector", err);
    }
  };

  const stopAllAiAudio = () => {
    for (const source of sourcesRef.current.values()) {
      try { source.stop(); } catch(e) {}
      sourcesRef.current.delete(source);
    }
    nextStartTimeRef.current = 0;
    setIsAiSpeaking(false);
  };

  const startSession = async () => {
    // Cleanup previous session if any
    if (sessionRef.current) sessionRef.current.close();
    stopAllAiAudio();
    
    setStatus('connecting');
    setErrorMessage(null);
    setTranscription('');
    setUserTranscription('');
    
    if (window.aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setStatus('key-required');
        return;
      }
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setErrorMessage("API Key missing");
      setStatus('error');
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputAudioContext;
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioContextRef.current = inputAudioContext;

      if (outputAudioContext.state === 'suspended') await outputAudioContext.resume();
      if (inputAudioContext.state === 'suspended') await inputAudioContext.resume();

      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        setErrorMessage("Microphone access denied. Please enable microphone permissions.");
        setStatus('error');
        return;
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('active');
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              if (isMuted) {
                setUserAudioLevel(0);
                return;
              }
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              
              // Simple volume detection for visual feedback
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setUserAudioLevel(Math.min(rms * 10, 1)); // Scale for visibility

              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsAiSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAiSpeaking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
            }
            if (message.serverContent?.inputTranscription) {
              setUserTranscription(prev => prev + message.serverContent!.inputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              // Optionally clear user transcription after a turn is fully processed
              setUserTranscription('');
            }
            if (message.serverContent?.interrupted) {
              stopAllAiAudio();
              setTranscription('(Interrupted)');
            }
          },
          onclose: (e) => setStatus('closed'),
          onerror: (e: any) => {
            console.error("Live API Error:", e);
            const msg = e.message || "";
            if (msg.includes("Requested entity was not found")) {
              setStatus('key-required');
            } else {
              setErrorMessage(msg || "Network connection failed.");
              setStatus('error');
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            // Zephyr is often clearer and more conversational for tutoring
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: `You are an expert Math Mentor conducting an EFFICIENT LIVE voice lesson for a ${level} level student in ${language}. 

PEDAGOGY PROTOCOL:
- VOICE-FIRST: Say math naturally (e.g., "x squared" instead of "x power 2").
- LATEX SUBTITLES: For formulas or technical terms that appear in the transcription, wrap them in single dollar signs (e.g., $x^2 + y^2 = r^2$) so they render correctly for the student to see. 
- EXTREME CONCISENESS: Keep every response under 15 seconds. Use short sentences.
- SOCRATIC: Ask ONE leading question at a time. Do not lecture. 
- INTERACTIVE: If the student stops talking, offer a brief hint or encouragement.
- TURN-TAKING: Acknowledge the student with brief filler words like "I see," "Good point," or "Go on" to make it feel real.
- ERROR ANALYSIS: If the student's verbal logic is flawed, point it out immediately but kindly.

Your goal is to maximize understanding through verbal dialogue supported by clear visual subtitles.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Failed to start session:", err);
      const msg = err.message || "";
      if (msg.includes("Requested entity was not found")) {
        setStatus('key-required');
      } else {
        setErrorMessage(msg || "Connection failed.");
        setStatus('error');
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (sessionRef.current) sessionRef.current.close();
      return;
    }
    startSession();
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
      if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-2xl animate-in fade-in duration-500">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col p-8 md:p-12 items-center text-center">
        
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-110 active:scale-90"
        >
          <X size={24} />
        </button>

        <div className="mb-12 flex flex-col items-center">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-6">
                <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-[0.1em]">MathMentor Live</h2>
            <div className="flex items-center gap-2 mt-3">
                <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : status === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {status === 'active' ? 'Dynamic Tutoring Active' : 
                   status === 'connecting' ? 'Syncing Neural Pathways...' : 
                   status === 'key-required' ? 'API Authorization Required' :
                   status === 'error' ? 'Handshake Error' : 'Stream Terminated'}
                </span>
            </div>
        </div>

        {status === 'key-required' ? (
          <div className="flex flex-col items-center gap-6 py-10 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center mb-4">
              <Key size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Paid API Key Required</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">Live Tutoring requires a personal API key from a paid project. This enables ultra-low latency voice processing.</p>
            </div>
            <button 
              onClick={handleKeySelection}
              className="px-10 py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
            >
              Select API Key
            </button>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-slate-400 hover:text-indigo-600 underline uppercase tracking-widest">Billing Documentation</a>
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-6 py-10 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/20 text-rose-500 rounded-3xl flex items-center justify-center mb-4">
              <Info size={40} />
            </div>
            <div className="space-y-2 px-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Neural Link Failure</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{errorMessage}</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={startSession}
                className="px-8 py-4 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                Reconnect Now
              </button>
              <button 
                onClick={onClose}
                className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-3xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                {/* AI Activity Ring */}
                <div className={`absolute inset-0 rounded-full border-4 border-indigo-500/20 transition-all duration-700 ${isAiSpeaking ? 'scale-110 opacity-30' : 'scale-100 opacity-5'}`} />
                <div className={`absolute inset-4 rounded-full border-2 border-indigo-400/30 transition-all duration-1000 ${isAiSpeaking ? 'scale-105' : 'scale-100'}`} />
                
                {/* User Mic Activity Ring */}
                <div 
                  className="absolute inset-[-20px] rounded-full border-[10px] border-indigo-500/10 transition-all duration-75"
                  style={{ 
                    transform: `scale(${1 + userAudioLevel * 0.3})`,
                    opacity: userAudioLevel > 0.1 ? userAudioLevel : 0,
                    filter: 'blur(4px)'
                  }} 
                />

                <div className={`w-40 h-40 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isAiSpeaking ? 'bg-indigo-600 scale-110' : 'bg-slate-100 dark:bg-slate-800 scale-100'}`}>
                    {status === 'connecting' ? (
                        <Loader2 size={48} className="text-indigo-600 dark:text-white animate-spin" />
                    ) : (
                        <div className="flex gap-1.5 items-end h-8">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} 
                                    className={`w-1.5 rounded-full transition-all duration-150 ${isAiSpeaking ? 'bg-white animate-bounce' : 'bg-indigo-600 dark:bg-slate-600 h-1.5'}`}
                                    style={{ 
                                        animationDelay: `${i * 100}ms`,
                                        height: isAiSpeaking ? '100%' : '6px'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full max-w-md h-32 flex flex-col items-center justify-center gap-4 mb-12">
                {userTranscription && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium italic animate-in fade-in slide-in-from-bottom-2">
                        <Mic size={14} className="flex-shrink-0" />
                        <div className="truncate max-w-[300px]">
                          " <ReactMarkdown 
                              remarkPlugins={[remarkMath]} 
                              rehypePlugins={[rehypeKatex]} 
                              components={SubtitleMarkdownComponents}
                            >
                              {userTranscription}
                            </ReactMarkdown> "
                        </div>
                    </div>
                )}
                {transcription && (
                    <div className="flex items-start gap-2 text-slate-900 dark:text-white text-lg font-black tracking-tight leading-relaxed animate-in fade-in slide-in-from-top-2">
                        <Volume2 size={20} className="mt-1 flex-shrink-0 text-indigo-500" />
                        <div>
                          <ReactMarkdown 
                            remarkPlugins={[remarkMath]} 
                            rehypePlugins={[rehypeKatex]} 
                            components={SubtitleMarkdownComponents}
                          >
                            {transcription}
                          </ReactMarkdown>
                        </div>
                    </div>
                )}
                {!transcription && !userTranscription && (
                    <p className="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                        {status === 'active' ? 'Speak naturally. I am listening...' : 'Initializing Neural Engine...'}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-4 md:gap-6">
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-5 rounded-3xl transition-all shadow-xl active:scale-90 ${isMuted ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'}`}
                    title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                >
                    {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                </button>

                <button 
                    onClick={onClose}
                    className="px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-3xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl"
                >
                    End Session
                </button>

                <button 
                    onClick={startSession}
                    className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-all active:scale-90"
                    title="Restart Session"
                >
                    <RotateCcw size={28} />
                </button>
            </div>
          </>
        )}

        <div className="mt-12 flex items-center gap-2 text-slate-400 dark:text-slate-600">
            <Info size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Bypassing Latency • Direct Neural PCM</span>
        </div>
      </div>
    </div>
  );
};

export default LiveVoiceOverlay;