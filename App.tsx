
// App.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { UserLevel, Message, FileAttachment, ChatMode, Language, Toast as ToastType, Feedback } from './types';
import Header from './components/Header';
import HomeScreen from './components/HomeScreen';
import ChatInterface from './components/ChatInterface';
import { ToolsPanel } from './components/Tools';
import NavigationDrawer from './components/NavigationDrawer';
import AuthScreen from './components/AuthScreen';
import SettingsView from './components/SettingsView';
import FeedbackModal from './components/FeedbackModal';
import QuickNotesView from './components/QuickNotesView';
import Toast from './components/Toast';
import { solveMathProblemStream, generateIllustration } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, ChevronLeft, ChevronRight, WifiOff } from 'lucide-react';

interface FocusArea {
  label: string;
  color: string;
  inactiveColor: string;
}

const STORAGE_KEYS = {
  MESSAGES: 'math_mentor_messages',
  LEVEL: 'math_mentor_level',
  SUBLEVEL: 'math_mentor_sublevel',
  LANGUAGE: 'math_mentor_language',
  CHATMODE: 'math_mentor_chatmode',
  FOCUS_AREAS: 'math_mentor_focusareas',
  USER_SESSION: 'math_mentor_user_session',
  FEEDBACKS: 'math_mentor_feedbacks'
};

const DEFAULT_FEEDBACKS: Feedback[] = [
  { id: '1', userEmail: 'ahmad@example.com', userName: 'Ahmad Daniel', userPfp: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Ahmad', rating: 5, message: "Sangat membantu untuk Add Math! Penjelasan langkah demi langkah memang power.", timestamp: new Date(2025, 0, 15) },
  { id: '2', userEmail: 'sarah@example.com', userName: 'Sarah Lim', userPfp: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sarah', rating: 5, message: "The step-by-step guidance is amazing. I finally understand Matrices!", timestamp: new Date(2025, 0, 18) },
  { id: '3', userEmail: 'joey@example.com', userName: 'Joey Tan', userPfp: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Joey', rating: 4, message: "UI cantik gila. Senang nak guna kat phone.", timestamp: new Date(2025, 0, 20) }
];

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'app' | 'settings' | 'quicknotes'>('home');
  const [settingsTab, setSettingsTab] = useState<'account' | 'preferences'>('preferences');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Real Feedbacks State - Persisted locally
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FEEDBACKS);
    if (saved) {
      try {
        return JSON.parse(saved).map((f: any) => ({ ...f, timestamp: new Date(f.timestamp) }));
      } catch (e) { return DEFAULT_FEEDBACKS; }
    }
    return DEFAULT_FEEDBACKS;
  });
  
  const [language, setLanguage] = useState<Language>('EN');
  const [level, setLevel] = useState<UserLevel>(UserLevel.INTERMEDIATE);
  const [subLevel, setSubLevel] = useState<string | null>('Form 1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [chatMode, setChatMode] = useState<ChatMode | null>('learning');
  const [activeFocusAreas, setActiveFocusAreas] = useState<string[]>([]);
  const [socraticEnabled, setSocraticEnabled] = useState(true);
  const [reasoningMode, setReasoningMode] = useState<'fast' | 'deep'>('deep');

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync state to local "database" (localStorage)
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDarkMode]);

  const handleLevelChange = (newLevel: UserLevel, newSubLevel: string | null = null) => {
    setLevel(newLevel);
    setSubLevel(newSubLevel);
    setActiveFocusAreas([]);
    setMessages([]);
  };

  // REAL FEEDBACK SUBMISSION
  const handleSubmitFeedback = (text: string, rating: number) => {
    if (user) {
      const alreadySubmitted = feedbacks.some(f => f.userEmail === user.email);
      if (alreadySubmitted) {
        addToast(language === 'BM' ? "Anda sudah memberikan maklum balas!" : "You have already submitted feedback!", "info");
        return;
      }

      const newFeedback: Feedback = {
        id: 'real-' + Math.random().toString(36).substring(7),
        userEmail: user.email,
        userName: user.name,
        userPfp: user.pfp,
        rating,
        message: text,
        timestamp: new Date()
      };
      
      const updated = [newFeedback, ...feedbacks];
      setFeedbacks(updated);
      
      // Update local persistence
      localStorage.setItem(STORAGE_KEYS.FEEDBACKS, JSON.stringify(updated));
      
      addToast("Successfully posted to the global feedback wall!", "success");
    }
  };

  const handleNavigate = (v: 'home' | 'app' | 'settings' | 'quicknotes', tab?: 'account' | 'preferences') => {
    setView(v);
    if (tab) setSettingsTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      <NavigationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onNavigate={handleNavigate} 
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        currentView={view} 
      />
      
      <Toast toasts={toasts} removeToast={removeToast} />

      {isAuthModalOpen && (
        <AuthScreen onBack={() => setIsAuthModalOpen(false)} onLogin={(u) => { setUser(u); setIsAuthModalOpen(false); }} />
      )}

      <FeedbackModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => setIsFeedbackModalOpen(false)} 
        onSubmit={handleSubmitFeedback} 
        user={user}
        onSignIn={() => { setIsFeedbackModalOpen(false); setIsAuthModalOpen(true); }}
      />

      {view === 'home' ? (
        <HomeScreen 
          onStart={() => setView('app')} 
          isDarkMode={isDarkMode} 
          toggleTheme={() => setIsDarkMode(!isDarkMode)} 
          onOpenMenu={() => setIsDrawerOpen(true)} 
          onLogin={() => setIsAuthModalOpen(true)} 
          user={user} 
          feedbacks={feedbacks} 
        />
      ) : (
        <div className="flex flex-col h-screen overflow-hidden">
          <Header 
            level={level} 
            subLevel={subLevel} 
            setLevel={handleLevelChange} 
            isDarkMode={isDarkMode} 
            toggleTheme={() => setIsDarkMode(!isDarkMode)} 
            onOpenMenu={() => setIsDrawerOpen(true)} 
            onLogin={() => setIsAuthModalOpen(true)} 
            onLogout={() => { setUser(null); setView('home'); }} 
            user={user} 
            onNavigate={handleNavigate}
            language={language}
            setLanguage={setLanguage}
            showLevels={view !== 'quicknotes'}
          />

          {view === 'settings' ? (
            <SettingsView 
              user={user} 
              activeTab={settingsTab} 
              setTab={setSettingsTab} 
              onBack={() => setView('app')} 
              isDarkMode={isDarkMode} 
              toggleTheme={() => setIsDarkMode(!isDarkMode)} 
              level={level} 
              subLevel={subLevel} 
              socraticEnabled={socraticEnabled} 
              setSocraticEnabled={setSocraticEnabled}
              reasoningMode={reasoningMode}
              setReasoningMode={setReasoningMode}
              onUpdateUser={(u) => setUser({...user, ...u})}
              onDeleteData={() => {}}
            />
          ) : view === 'quicknotes' ? (
            <QuickNotesView language={language} onBack={() => setView('app')} />
          ) : (
            <main className="flex-1 max-w-full mx-auto w-full p-0 md:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-0 md:gap-6 overflow-hidden h-full">
              <div className="lg:col-span-2 hidden lg:block h-full">
                <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 h-full">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-6">Focus Hub</h2>
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Current Syllabus</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">{subLevel || level.split(' (')[0]}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
                <ChatInterface 
                  messages={messages} 
                  onSendMessage={() => {}} 
                  isLoading={isLoading} 
                  level={level} 
                  activeMode={chatMode} 
                  setActiveMode={setChatMode} 
                  onError={addToast} 
                  language={language} 
                />
              </div>

              <div className="lg:col-span-3 hidden lg:block h-full">
                <ToolsPanel 
                  level={level} 
                  subLevel={subLevel} 
                  activeFocusAreas={activeFocusAreas} 
                  language={language} 
                />
              </div>
            </main>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
