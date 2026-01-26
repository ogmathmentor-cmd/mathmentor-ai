
// components/QuickNotesView.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Language, FileAttachment } from '../types';
import { 
  Upload, FileText, Zap, Loader2, Copy, Check, 
  RefreshCw, X, Sparkles, FileType, Mic, HardDrive, 
  Layout, Type as TypeIcon, Info, Plus, Hash, BookOpen, Key, Lightbulb, ListChecks, Target
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

type SourceType = 'files' | 'text' | 'audio' | 'drive' | 'quizlet';

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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
        type: selectedFile.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
        extension: extension
      };

      setFiles(prev => [...prev, newFile]);
      setMetas(prev => [...prev, newMeta]);
      setNotes(null);
    };
    reader.readAsDataURL(selectedFile);
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
      <h1 className="text-3xl font-black text-indigo-400 mb-6 pb-4 border-b border-indigo-500/20 tracking-tight">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="flex items-center gap-3 text-xl font-black text-white mt-10 mb-4 group">
        <span className="p-2 bg-slate-800 rounded-xl group-hover:scale-110 transition-transform"><Hash size={18} className="text-indigo-400" /></span>
        <span className="uppercase tracking-tight leading-none">{children}</span>
      </h2>
    ),
    p: ({ children }: any) => <p className="text-slate-300 leading-relaxed mb-4 font-medium tracking-tight text-base">{children}</p>,
    ul: ({ children }: any) => <ul className="space-y-3 mb-6 ml-2">{children}</ul>,
    li: ({ children }: any) => (
      <li className="flex items-start gap-3 text-slate-300 group">
        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500/30 group-hover:bg-indigo-500 transition-all flex-shrink-0" />
        <div className="flex-1 text-base leading-relaxed font-semibold">{children}</div>
      </li>
    ),
    code: ({ children, inline }: any) => (
      inline 
        ? <code className="px-1.5 py-0.5 bg-slate-800 text-indigo-300 rounded-md font-mono text-[0.9em] border border-slate-700 mx-0.5 font-bold">{children}</code>
        : <div className="my-6 p-6 bg-black/30 rounded-2xl border border-slate-800 overflow-x-auto custom-scrollbar flex flex-col items-center justify-center font-mono text-lg shadow-inner">{children}</div>
    )
  };

  const sources: { id: SourceType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'files', label: 'FILES', icon: <FileText size={18} />, color: 'bg-indigo-600' },
    { id: 'text', label: 'TEXT', icon: <TypeIcon size={18} />, color: 'bg-purple-600' },
    { id: 'audio', label: 'AUDIO', icon: <Mic size={18} />, color: 'bg-blue-500' },
    { id: 'drive', label: 'GOOGLE DRIVE', icon: <HardDrive size={18} />, color: 'bg-emerald-600' },
    { id: 'quizlet', label: 'QUIZLET', icon: <Layout size={18} />, color: 'bg-indigo-900' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#020617] text-white custom-scrollbar animate-in fade-in duration-700 relative">
      <div className="max-w-4xl mx-auto px-6 py-6 lg:py-12 h-full flex flex-col justify-center">
        <div className="bg-[#0f172a] rounded-[2rem] border border-slate-800 shadow-2xl p-6 md:p-8 relative overflow-hidden flex flex-col gap-6 transition-all">
          
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-white">Create from</h2>
            <button onClick={onBack} className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all active:scale-90">
              <X size={28} />
            </button>
          </div>

          <div className="flex flex-col gap-6 flex-1">
              {/* Source Grid - Optimized for visibility and compactness */}
              <div className="flex flex-wrap justify-between gap-3 relative z-10">
                {sources.map((s) => (
                  <button key={s.id} onClick={() => { setActiveSource(s.id); if (files.length > 0 || textContent) handleReset(); }}
                    className={`flex-1 min-w-[100px] flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border-2 transition-all group ${activeSource === s.id ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 hover:border-slate-700'}`}>
                    <div className={`p-2.5 rounded-xl flex items-center justify-center text-white shadow-lg ${s.color} transition-transform group-hover:scale-110`}>{s.icon}</div>
                    <span className={`text-[9px] font-black uppercase tracking-widest text-center ${activeSource === s.id ? 'text-white' : 'text-slate-500'}`}>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Upload Dropzone Area - More compact */}
              <div 
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => {
                   if (activeSource === 'files') fileInputRef.current?.click();
                   if (activeSource === 'audio') audioInputRef.current?.click();
                }}
                className={`relative rounded-[2rem] transition-all flex flex-col items-center justify-center overflow-hidden border-2 border-dashed flex-1 min-h-[220px] md:min-h-[260px] cursor-pointer group ${files.length > 0 || textContent ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/60'}`}>
                
                {activeSource === 'files' && files.length === 0 && (
                  <div className="flex flex-col items-center text-center p-8 animate-in fade-in w-full">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain" className="hidden" />
                    <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Drag & drop files to upload</h3>
                    <p className="text-[10px] text-slate-500 font-medium max-w-sm px-4 leading-relaxed tracking-wide">
                      Supported types: PDF, Word, PPT, TXT, JPG, PNG, <br /> HEIC, WebP (Max {MAX_SIZE_MB}MB)
                    </p>
                  </div>
                )}

                {activeSource === 'files' && files.length > 0 && (
                  <div className="w-full h-full p-6 flex flex-col animate-in zoom-in-95 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {files.map((f, idx) => (
                        <div key={idx} className="relative group/file" onClick={(e) => e.stopPropagation()}>
                          <div className="aspect-[4/3] bg-slate-950 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group-hover/file:scale-[1.02] transition-transform p-3">
                            <div className="p-2.5 bg-indigo-900/20 rounded-xl text-indigo-400 mb-2">
                               <FileType size={24} />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 truncate w-full text-center px-2 tracking-tight">{f.name}</p>
                            <button 
                              onClick={() => removeFile(idx)} 
                              className="absolute top-2 right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-all shadow-lg opacity-0 group-hover/file:opacity-100 active:scale-90"
                            >
                              <X size={12} strokeWidth={4} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {files.length < MAX_FILES && (
                        <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 transition-all gap-2 bg-slate-900/30 group/add hover:border-slate-600">
                          <Plus size={24} strokeWidth={1.5} className="group-hover/add:scale-110 transition-transform" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Add More</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSource === 'text' && (
                  <div className="w-full p-6 flex flex-col gap-4 animate-in fade-in h-full" onClick={(e) => e.stopPropagation()}>
                    <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Paste your study material here..." className="w-full flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-6 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none transition-all custom-scrollbar resize-none font-medium leading-relaxed" />
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
                  disabled={(files.length === 0 && !textContent.trim()) || isGenerating}
                  className={`w-full py-4.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-xl relative overflow-hidden group/btn ${(files.length === 0 && !textContent.trim()) || isGenerating ? 'bg-slate-800 text-slate-600 opacity-50' : 'bg-slate-950 hover:bg-black text-white'}`}
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
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800 overflow-hidden">
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
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 md:p-8 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-500`}>
          <div 
            className={`bg-[#0f172a] w-full max-w-5xl h-full md:h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative border border-slate-800 animate-in slide-in-from-bottom-8 duration-700`}
          >
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-800 flex items-center justify-between bg-[#0f172a] z-20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-white uppercase leading-none mb-1">Study Sheet</h3>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{files.length} Files Analyzed</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleCopy} 
                  className="flex items-center gap-2 px-4 py-3 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-700 transition-all active:scale-95"
                >
                  {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {isCopied ? 'COPIED' : 'COPY ALL'}
                </button>
                <button 
                  onClick={() => setNotes(null)} 
                  className="p-3 bg-slate-800 text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-10 md:p-16 custom-scrollbar bg-[#020617]/40 relative">
               <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
               <div className="prose dark:prose-invert prose-indigo max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                    components={MarkdownComponents}
                  >
                    {notes}
                  </ReactMarkdown>
               </div>
               
               <div className="mt-16 flex justify-center pb-10 pt-10 border-t border-slate-800">
                  <button onClick={handleReset} className="px-8 py-4 bg-white text-slate-950 rounded-full text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all">
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
