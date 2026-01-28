
// components/QuickNotesView.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Language, FileAttachment } from '../types';
import { 
  Upload, FileText, Zap, Loader2, Copy, Check, 
  X, Sparkles, FileType, Mic, 
  Type as TypeIcon, Info, Plus, Hash,
  Square, Trash2
} from 'lucide-react';
import { generateStudyNotes } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface QuickNotesViewProps {
  language: Language;
  onBack: () => void;
}

interface FileMetadata {
  size: string;
  type: string;
  extension: string;
}

type SourceType = 'files' | 'text' | 'audio';

const MAX_SIZE_MB = 35;
const MAX_FILE_SIZE = MAX_SIZE_MB * 1024 * 1024;
const MAX_FILES = 8;
const TIMEOUT_MS = 90000; // 1 minute 30 seconds

const QuickNotesView: React.FC<QuickNotesViewProps> = ({ language, onBack }) => {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [metas, setMetas] = useState<FileMetadata[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSource, setActiveSource] = useState<SourceType>('files');
  const [textContent, setTextContent] = useState('');
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFile = (selectedFile: File) => {
    if (files.length >= MAX_FILES) {
      alert(`Limit of ${MAX_FILES} files reached.`);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      alert(`File "${selectedFile.name}" is too large (${formatFileSize(selectedFile.size)}). Max allowed is ${MAX_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      const extension = selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE';
      
      const newFile: FileAttachment = {
        data: base64,
        mimeType: selectedFile.type,
        name: selectedFile.name
      };

      const newMeta: FileMetadata = {
        size: formatFileSize(selectedFile.size),
        type: selectedFile.type.startsWith('image/') ? 'IMAGE' : (selectedFile.type.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT'),
        extension: extension
      };

      setFiles(prev => [...prev, newFile]);
      setMetas(prev => [...prev, newMeta]);
      setNotes(null);
    };
    reader.readAsDataURL(selectedFile);
  };

  // Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `Recording_${new Date().getTime()}.webm`, { type: 'audio/webm' });
        processFile(audioFile);
        setIsRecording(false);
        setRecordingTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start();
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      Array.from(selectedFiles).forEach((file: File) => processFile(file));
    }
    e.target.value = ''; 
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles) {
      Array.from(droppedFiles).forEach((file: File) => processFile(file));
    }
  };

  const handleGenerate = async () => {
    let payload: FileAttachment[] = [];
    if (activeSource === 'files' && files.length > 0) payload = files;
    else if (activeSource === 'text' && textContent.trim()) payload = [{ data: btoa(textContent), mimeType: 'text/plain', name: 'Text Input' }];
    else if (activeSource === 'audio' && files.length > 0) payload = files;

    if (payload.length === 0) return;
    setIsGenerating(true);
    setNotes(null);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)
    );

    try {
      const result = await Promise.race([
        generateStudyNotes(payload, language),
        timeoutPromise
      ]) as string;
      
      setNotes(result);
    } catch (error: any) {
      console.error(error);
      if (error.message === 'TIMEOUT') {
        alert(language === 'BM' 
          ? "Sistem tidak dapat memproses fail ini. Pemprosesan mengambil masa terlalu lama (melebihi 1m 30s)." 
          : "The AI cannot process this file. Processing took too long (over 1m 30s).");
      } else {
        alert("Analysis failed. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!notes) return;
    navigator.clipboard.writeText(notes);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReset = () => {
    setFiles([]);
    setMetas([]);
    setNotes(null);
    setTextContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setMetas(prev => prev.filter((_, i) => i !== index));
  };

  const MarkdownComponents: any = {
    h1: ({ children }: any) => (
      <h1 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-6 pb-4 border-b border-indigo-500/20 tracking-tight">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="flex items-center gap-3 text-xl font-black text-slate-900 dark:text-white mt-10 mb-4 group">
        <span className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:scale-110 transition-transform"><Hash size={18} className="text-indigo-600 dark:text-indigo-400" /></span>
        <span className="uppercase tracking-tight leading-none">{children}</span>
      </h2>
    ),
    p: ({ children }: any) => <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4 font-medium tracking-tight text-base">{children}</p>,
    ul: ({ children }: any) => <ul className="space-y-3 mb-6 ml-2">{children}</ul>,
    li: ({ children }: any) => (
      <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 group">
        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500/30 group-hover:bg-indigo-500 transition-all flex-shrink-0" />
        <div className="flex-1 text-base leading-relaxed font-semibold">{children}</div>
      </li>
    ),
    code: ({ children, inline }: any) => (
      inline 
        ? <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 rounded-md font-mono text-[0.9em] border border-slate-200 dark:border-slate-700 mx-0.5 font-bold">{children}</code>
        : <div className="my-6 p-6 bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar flex flex-col items-center justify-center font-mono text-lg shadow-inner">{children}</div>
    )
  };

  const sources: { id: SourceType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'files', label: 'FILES', icon: <FileText size={18} />, color: 'bg-indigo-600' },
    { id: 'text', label: 'TEXT', icon: <TypeIcon size={18} />, color: 'bg-purple-600' },
    { id: 'audio', label: 'AUDIO', icon: <Mic size={18} />, color: 'bg-blue-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white custom-scrollbar animate-in fade-in duration-700 relative">
      <div className="max-w-4xl mx-auto px-6 py-6 lg:py-12 h-full flex flex-col justify-center">
        <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 relative overflow-hidden flex flex-col gap-6 transition-all min-h-[600px]">
          
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Create from</h2>
            <button onClick={onBack} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90">
              <X size={28} />
            </button>
          </div>

          <div className="flex flex-col gap-6 flex-1">
              {/* Source Grid */}
              <div className="flex flex-wrap justify-between gap-3 relative z-10">
                {sources.map((s) => (
                  <button key={s.id} onClick={() => { setActiveSource(s.id); if (files.length > 0 || textContent) handleReset(); }}
                    className={`flex-1 min-w-[100px] flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border-2 transition-all group ${activeSource === s.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-[0_0_15px_rgba(79,70,229,0.1)]' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                    <div className={`p-2.5 rounded-xl flex items-center justify-center text-white shadow-lg ${s.color} transition-transform group-hover:scale-110`}>{s.icon}</div>
                    <span className={`text-[9px] font-black uppercase tracking-widest text-center ${activeSource === s.id ? 'text-indigo-600 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic Workspace based on Active Source */}
              <div className={`relative rounded-[2rem] transition-all flex flex-col items-center justify-center overflow-hidden border-2 border-dashed flex-1 min-h-[300px] cursor-default group ${files.length > 0 || textContent ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'}`}>
                
                {/* 1. Files Source */}
                {activeSource === 'files' && files.length === 0 && (
                  <div 
                    className="flex flex-col items-center text-center p-8 animate-in fade-in w-full h-full justify-center cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain" className="hidden" />
                    <div className="w-14 h-14 bg-white dark:bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 group-hover:scale-110 transition-transform shadow-sm border border-slate-100 dark:border-slate-700">
                      <Upload size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Drag & drop files to upload</h3>
                    <p className="text-[10px] text-slate-500 font-medium max-w-sm px-4 leading-relaxed tracking-wide">
                      Supported types: PDF, Word, PPT, TXT, JPG, PNG, <br /> HEIC, WebP (Max {MAX_SIZE_MB}MB)
                    </p>
                  </div>
                )}

                {/* 2. Text Source */}
                {activeSource === 'text' && (
                  <div className="w-full p-6 flex flex-col gap-4 animate-in fade-in h-full">
                    <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Paste your study material here..." className="w-full flex-1 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-sm text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:outline-none transition-all custom-scrollbar resize-none font-medium leading-relaxed" />
                  </div>
                )}

                {/* 3. Audio Source */}
                {activeSource === 'audio' && (
                  <div className="w-full p-8 flex flex-col items-center justify-center gap-8 animate-in fade-in h-full">
                    <input type="file" ref={audioInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
                    
                    {files.length === 0 ? (
                      <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl relative ${isRecording ? 'bg-rose-500 animate-pulse text-white' : 'bg-indigo-600 hover:scale-110 text-white'}`}
                          >
                            {isRecording ? <Square size={32} fill="white" /> : <Mic size={32} />}
                            {isRecording && <div className="absolute inset-[-10px] border-2 border-rose-500 rounded-full animate-ping opacity-20" />}
                          </button>
                          
                          <div className="h-20 w-px bg-slate-200 dark:bg-slate-800 mx-4" />

                          <button 
                            onClick={() => audioInputRef.current?.click()}
                            className="w-20 h-20 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full flex items-center justify-center transition-all hover:scale-110 text-slate-400 border border-slate-200 dark:border-slate-700"
                          >
                            <Upload size={32} />
                          </button>
                        </div>
                        
                        <div className="text-center">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">
                            {isRecording ? `Recording... ${formatTime(recordingTime)}` : 'Audio Input'}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium">Record a lecture snippet or upload an audio file</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex items-center gap-4 animate-in zoom-in-95 shadow-sm">
                         <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
                           <Mic size={24} />
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{files[0].name}</p>
                           <p className="text-[9px] font-black text-slate-500 uppercase">Ready for Analysis</p>
                         </div>
                         <button onClick={handleReset} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                           <Trash2 size={18} />
                         </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Shared File List Display (for Files results) */}
                {activeSource !== 'text' && activeSource !== 'audio' && files.length > 0 && (
                  <div className="w-full h-full p-6 flex flex-col animate-in zoom-in-95 overflow-y-auto custom-scrollbar absolute inset-0 bg-white/95 dark:bg-slate-900/95 z-20">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{files.length} Selected</span>
                        <button onClick={handleReset} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Clear All</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {files.map((f, idx) => (
                        <div key={idx} className="relative group/file">
                          <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col items-center justify-center relative overflow-hidden group-hover/file:scale-[1.02] transition-transform p-3">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 mb-2">
                               {metas[idx]?.type === 'IMAGE' ? <FileType size={24} /> : (metas[idx]?.type === 'AUDIO' ? <Mic size={24} /> : <FileText size={24} />)}
                            </div>
                            <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 truncate w-full text-center px-2 tracking-tight">{f.name}</p>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeFile(idx); }} 
                              className="absolute top-2 right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-all shadow-lg opacity-100 md:opacity-0 group-hover/file:opacity-100 active:scale-90"
                            >
                              <X size={12} strokeWidth={4} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {files.length < MAX_FILES && (
                        <div 
                          onClick={() => {
                            if (activeSource === 'files') fileInputRef.current?.click();
                          }}
                          className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 transition-all gap-2 bg-slate-50 dark:bg-slate-900/30 group/add hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
                        >
                          <Plus size={24} strokeWidth={1.5} className="group-hover/add:scale-110 transition-transform" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Add More</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {isDragging && (
                  <div className="absolute inset-0 bg-indigo-600/5 backdrop-blur-[2px] pointer-events-none border-2 border-indigo-500 rounded-[2rem] z-50 flex items-center justify-center">
                     <Upload size={48} className="text-indigo-600 animate-bounce" />
                  </div>
                )}
              </div>

              {/* Info Message */}
              <div className="flex items-center gap-2.5 text-slate-500 px-2">
                <Info size={14} />
                <span className="text-[10px] font-medium leading-tight tracking-wide">QuickNotes AI analyzes all sources together to build a unified sheet.</span>
              </div>

              {/* Integrated Notes Button */}
              <div className="relative">
                <button 
                  onClick={handleGenerate} 
                  disabled={(files.length === 0 && !textContent.trim()) || isGenerating || isRecording}
                  className={`w-full py-4.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-xl relative overflow-hidden group/btn ${(files.length === 0 && !textContent.trim()) || isGenerating || isRecording ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 opacity-50' : 'bg-slate-900 dark:bg-slate-950 hover:bg-black dark:hover:bg-black text-white border border-slate-700 dark:border-slate-700'}`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-indigo-500" />
                      <span className="animate-pulse tracking-widest uppercase text-xs">Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={18} fill="currentColor" className="group-hover/btn:scale-110 transition-transform text-indigo-400" />
                      <span className="tracking-wide">Generate Integrated Notes</span>
                    </>
                  )}
                  {isGenerating && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 animate-[loading_5s_infinite_linear]" />
                    </div>
                  )}
                </button>
              </div>
          </div>
        </div>
      </div>

      {/* RESULT MODAL */}
      {notes && (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 md:p-8 bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-500`}>
          <div 
            className={`bg-white dark:bg-[#0f172a] w-full max-w-5xl h-full md:h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-8 duration-700`}
          >
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0f172a] z-20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-none mb-1">Study Sheet</h3>
                   <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{files.length || 1} Sources Analyzed</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleCopy} 
                  className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {isCopied ? 'COPIED' : 'COPY ALL'}
                </button>
                <button 
                  onClick={() => setNotes(null)} 
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-10 md:p-16 custom-scrollbar bg-slate-50 dark:bg-[#020617]/40 relative">
               <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
               <div className="prose prose-slate dark:prose-invert prose-indigo max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                    components={MarkdownComponents}
                  >
                    {notes}
                  </ReactMarkdown>
               </div>
               
               <div className="mt-16 flex justify-center pb-10 pt-10 border-t border-slate-200 dark:border-slate-800">
                  <button onClick={handleReset} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all">
                    <Plus size={18} /> New Session
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .py-4.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }
      `}</style>
    </div>
  );
};

export default QuickNotesView;
