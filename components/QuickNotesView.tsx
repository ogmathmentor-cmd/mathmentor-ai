
// components/QuickNotesView.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Language, FileAttachment } from '../types';
import { 
  Upload, FileText, Zap, Loader2, Copy, Check, 
  RefreshCw, X, Sparkles, FileType, Mic, HardDrive, 
  Layout, Type as TypeIcon, Info, Link as LinkIcon,
  CheckCircle2, BookOpen, Key, Hash, Lightbulb, Target, ListChecks, Plus
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
const MAX_FILES = 5;

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
      alert(`File is too large. Limit is ${MAX_SIZE_MB}MB.`);
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
      setActiveSource('files');
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

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
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
    try {
      const result = await generateStudyNotes(payload, language);
      setNotes(result);
    } catch (error) {
      console.error(error);
      alert("Analysis failed. Please try again.");
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
      <h1 className="text-3xl font-black text-indigo-700 dark:text-indigo-400 mb-8 pb-4 border-b border-indigo-200 dark:border-indigo-500/20 tracking-tight">{children}</h1>
    ),
    h2: ({ children }: any) => {
      const text = children?.toString() || "";
      let icon = <Hash size={18} className="text-indigo-600" />;
      if (text.toLowerCase().includes("concept")) icon = <BookOpen size={18} className="text-indigo-500" />;
      if (text.toLowerCase().includes("definition")) icon = <Key size={18} className="text-amber-600" />;
      if (text.toLowerCase().includes("formula")) icon = <Lightbulb size={18} className="text-emerald-600" />;
      if (text.toLowerCase().includes("step") || text.toLowerCase().includes("process")) icon = <ListChecks size={18} className="text-blue-600" />;
      if (text.toLowerCase().includes("exam") || text.toLowerCase().includes("focus")) icon = <Target size={18} className="text-rose-600" />;
      return (
        <h2 className="flex items-center gap-3 text-xl font-black text-slate-900 dark:text-white mt-12 mb-6 group">
          <span className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:scale-110 transition-transform shadow-sm">{icon}</span>
          <span className="uppercase tracking-tight">{children}</span>
        </h2>
      );
    },
    h3: ({ children }: any) => (
      <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-8 mb-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
        {children}
      </h3>
    ),
    p: ({ children }: any) => <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4 font-medium tracking-tight">{children}</p>,
    ul: ({ children }: any) => <ul className="space-y-4 mb-8 ml-1">{children}</ul>,
    li: ({ children }: any) => (
      <li className="flex items-start gap-4 text-slate-700 dark:text-slate-300 group">
        <div className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-600/30 dark:bg-indigo-500/50 group-hover:bg-indigo-600 transition-colors flex-shrink-0" />
        <div className="flex-1 text-[14px] leading-relaxed font-semibold">{children}</div>
      </li>
    ),
    blockquote: ({ children }: any) => (
      <div className="my-10 p-8 bg-indigo-50 dark:bg-indigo-600/5 border-l-4 border-indigo-600 dark:border-indigo-500 rounded-r-[2rem] animate-in slide-in-from-left-4 duration-500 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400 font-black text-[10px] uppercase tracking-[0.25em]">
          <Sparkles size={16} /> Synthesis Insight
        </div>
        <div className="italic text-slate-800 dark:text-slate-200 font-bold leading-relaxed">{children}</div>
      </div>
    ),
    code: ({ children }: any) => (
      <code className="px-2 py-0.5 bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 rounded-md font-mono text-[0.85em] border border-indigo-100 dark:border-slate-700 mx-0.5 font-bold">{children}</code>
    )
  };

  const sources: { id: SourceType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'files', label: 'Files', icon: <FileText size={20} />, color: 'bg-indigo-600' },
    { id: 'text', label: 'Text', icon: <TypeIcon size={20} />, color: 'bg-purple-600' },
    { id: 'audio', label: 'Audio', icon: <Mic size={20} />, color: 'bg-blue-500' },
    { id: 'drive', label: 'Google Drive', icon: <HardDrive size={20} />, color: 'bg-emerald-600' },
    { id: 'quizlet', label: 'Quizlet', icon: <Layout size={20} />, color: 'bg-indigo-900' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white custom-scrollbar animate-in fade-in duration-700">
      <div 
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="max-w-4xl mx-auto px-6 py-8 lg:py-12 h-full flex flex-col"
      >
        <div className={`bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] p-6 lg:p-10 relative overflow-hidden flex flex-col gap-8 transition-all duration-500 h-full ${isDragging ? 'ring-4 ring-indigo-500/50 scale-[1.01] bg-indigo-50/30 dark:bg-[#1a1f35]' : ''}`}>
          
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Create from</h2>
            <button onClick={onBack} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90">
              <X size={28} />
            </button>
          </div>

          {!notes ? (
            <>
              {/* Source Grid */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 relative z-10">
                {sources.map((s) => (
                  <button key={s.id} onClick={() => { setActiveSource(s.id); if (files.length > 0 || textContent) handleReset(); }}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group ${activeSource === s.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-600/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                    <div className={`w-12 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${s.color} transition-transform group-hover:scale-110`}>{s.icon}</div>
                    <span className={`text-[10px] font-black uppercase tracking-tight text-center ${activeSource === s.id ? 'text-indigo-600 dark:text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Upload Dropzone Area */}
              <div className={`relative rounded-[2.5rem] transition-all flex flex-col items-center justify-center overflow-hidden border-2 flex-1 ${(files.length > 0 || textContent) ? 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/5' : isDragging ? 'border-indigo-500 bg-indigo-100/50 dark:bg-indigo-500/20 border-dashed shadow-[0_0_40px_rgba(79,70,229,0.1)]' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:border-indigo-500/30 border-dashed'}`}>
                
                {isDragging && (
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-600/5 dark:bg-indigo-600/10 backdrop-blur-[2px] pointer-events-none animate-in fade-in duration-300">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl animate-bounce mb-4">
                      <Upload size={40} strokeWidth={3} />
                    </div>
                    <p className="text-indigo-600 dark:text-indigo-400 font-black text-xl uppercase tracking-widest">Drop to Upload</p>
                  </div>
                )}

                {activeSource === 'files' && files.length === 0 && (
                  <div className="flex flex-col items-center text-center p-8 animate-in fade-in w-full">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="application/pdf,image/*" className="hidden" />
                    
                    {/* Visual Card Stack Graphic */}
                    <div className="relative w-48 h-24 mb-6 cursor-pointer hover:scale-105 transition-transform duration-500" onClick={() => fileInputRef.current?.click()}>
                      <div className="absolute left-0 bottom-2 w-12 h-16 bg-amber-400 rounded-lg shadow-xl -rotate-12 flex items-center justify-center text-white font-black text-xs">A</div>
                      <div className="absolute left-10 bottom-4 w-12 h-16 bg-blue-500 rounded-lg shadow-xl -rotate-6 flex items-center justify-center text-white text-xs font-black">W</div>
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-12 h-16 bg-purple-500 rounded-lg shadow-xl z-10 flex items-center justify-center text-white">
                        <Upload size={18} strokeWidth={3} />
                      </div>
                      <div className="absolute right-10 bottom-4 w-12 h-16 bg-red-500 rounded-lg shadow-xl rotate-6 flex items-center justify-center text-white font-black text-xs">T</div>
                      <div className="absolute right-0 bottom-2 w-12 h-16 bg-orange-500 rounded-lg shadow-xl rotate-12 flex items-center justify-center text-white font-black text-xs">P</div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Drag & drop files to upload</h3>
                    <p className="text-[11px] text-slate-500 font-medium mb-1 max-w-sm px-4">
                      Supported types: PDF, Word, PPT, TXT, JPG, JPEG, PNG,
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mb-1 max-w-sm px-4">
                      HEIC, WebP
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mb-6 max-w-sm px-4">
                      Max file size: {MAX_SIZE_MB}MB • Up to {MAX_FILES} files
                    </p>
                    
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-10 py-3.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-black rounded-2xl transition-all shadow-md dark:shadow-xl border border-slate-200 dark:border-slate-700"
                    >
                      Select files
                    </button>
                  </div>
                )}

                {/* Multi-File Preview Status */}
                {activeSource === 'files' && files.length > 0 && (
                  <div className="w-full h-full p-6 flex flex-col animate-in zoom-in-95 h-full overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {files.map((f, idx) => (
                        <div key={idx} className="relative group">
                          <div className="aspect-[4/3] bg-slate-100 dark:bg-[#020617] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col items-center justify-center relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                            {f.mimeType.startsWith('image/') ? (
                              <img src={`data:${f.mimeType};base64,${f.data}`} className="w-full h-full object-contain p-2 opacity-80" alt="Preview" />
                            ) : (
                              <FileType size={40} strokeWidth={1.2} className="text-indigo-600 dark:text-indigo-400" />
                            )}
                            
                            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors pointer-events-none" />
                            
                            {/* File Info Overlay */}
                            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-900/80 to-transparent">
                               <p className="text-[9px] font-black text-white truncate px-1">{f.name}</p>
                            </div>

                            <button 
                              onClick={() => removeFile(idx)} 
                              className="absolute top-2 right-2 p-1.5 bg-rose-500/90 hover:bg-rose-600 text-white rounded-lg transition-all shadow-lg opacity-0 group-hover:opacity-100 active:scale-90"
                            >
                              <X size={12} strokeWidth={4} />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add more slot if under limit */}
                      {files.length < MAX_FILES && (
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 flex flex-col items-center justify-center text-slate-400 transition-all gap-1 group"
                        >
                          <Plus size={24} className="group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Add More</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-indigo-500/20 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black">{files.length}</div>
                         <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Files Selected</span>
                       </div>
                       <button onClick={handleReset} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1.5 rounded-lg transition-all">Clear All</button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="application/pdf,image/*" className="hidden" />
                  </div>
                )}

                {activeSource === 'text' && (
                  <div className="w-full p-8 flex flex-col gap-4 animate-in fade-in h-full">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Paste Content</span>
                    <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Paste your study material..." className="w-full flex-1 bg-slate-50 dark:bg-black rounded-3xl border border-slate-200 dark:border-slate-800 p-6 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none transition-all custom-scrollbar" />
                  </div>
                )}

                {activeSource === 'audio' && (
                  <div className="w-full p-12 flex flex-col items-center gap-6 animate-in fade-in justify-center">
                    {files.length === 0 ? <button onClick={() => audioInputRef.current?.click()} className="flex flex-col items-center gap-6 group"><input type="file" ref={audioInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" /><div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-xl group-hover:scale-110 transition-transform"><Mic size={40} /></div><div className="text-center"><h3 className="text-xl font-bold text-slate-900 dark:text-white">Upload Audio Recording</h3><p className="text-sm text-slate-500 mt-2">MP3, WAV, or M4A (Max {MAX_SIZE_MB}MB)</p></div></button> : <div className="w-full max-w-sm bg-slate-100 dark:bg-slate-900 rounded-[2rem] border border-blue-500/30 p-6 flex flex-col items-center gap-4"><Mic size={48} className="text-blue-500" /><span className="text-sm font-bold truncate w-full text-center text-slate-800 dark:text-white">{files[0].name}</span><button onClick={handleReset} className="text-xs font-black text-red-500 uppercase tracking-widest hover:bg-red-500/10 px-4 py-2 rounded-lg transition-all">Remove</button></div>}
                  </div>
                )}
              </div>

              {/* Limit Hint */}
              <div className="flex items-center gap-2.5 text-slate-500 px-2 mt-auto">
                <Info size={16} />
                <span className="text-xs font-bold">QuickNotes AI analyzes all sources together to build a unified sheet.</span>
              </div>

              {/* Large Bottom Generate Button */}
              <button onClick={handleGenerate} disabled={(files.length === 0 && !textContent.trim()) || isGenerating}
                className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] ${(files.length === 0 && !textContent.trim()) || isGenerating ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700' : 'bg-slate-900 dark:bg-slate-950 hover:bg-indigo-600 text-white shadow-indigo-500/10 hover:shadow-indigo-500/40 hover:scale-[1.01] border border-slate-700 dark:border-slate-700'}`}>
                {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} fill="currentColor" />}
                {isGenerating ? 'Synthesizing Knowledge...' : 'Generate Integrated Notes'}
              </button>
            </>
          ) : (
            /* Results Presentation View */
            <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-6 flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
                 <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 animate-pulse"><Sparkles size={18} className="text-white" /></div>
                   <div>
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Study Ready Results</span>
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5 max-w-[200px] truncate">{files.length > 1 ? `Multi-File Integrated Sheet` : files.length === 1 ? files[0].name : activeSource.toUpperCase() + ' INPUT'}</p>
                   </div>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-md">
                     {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                     Salin
                   </button>
                   <button onClick={handleReset} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all active:scale-95 shadow-md">
                     <RefreshCw size={18} />
                   </button>
                 </div>
              </div>

              {/* Integrated Study Sheet Container */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-xl dark:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden relative group flex-1">
                 {/* Aesthetic Decor */}
                 <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-700 to-indigo-500" />
                 <div className="absolute top-12 right-12 opacity-[0.05] dark:opacity-10 pointer-events-none rotate-12"><BookOpen size={200} className="text-indigo-600" /></div>
                 
                 {/* Grid Pattern Background */}
                 <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }} />

                 <div className="p-10 md:p-16 lg:p-24 relative z-10 overflow-x-hidden h-full overflow-y-auto custom-scrollbar">
                   <div className="prose dark:prose-invert prose-indigo max-w-none">
                     <ReactMarkdown 
                       remarkPlugins={[remarkMath]} 
                       rehypePlugins={[rehypeKatex]}
                       components={MarkdownComponents}
                     >
                       {notes}
                     </ReactMarkdown>
                   </div>
                 </div>
              </div>

              <div className="flex justify-center pt-8">
                <button 
                  onClick={handleReset}
                  className="px-10 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-[11px] font-black text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400/50 uppercase tracking-[0.25em] transition-all flex items-center gap-4 shadow-xl active:scale-[0.98] group"
                >
                  <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                  Analyze New Set of Sources
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickNotesView;
