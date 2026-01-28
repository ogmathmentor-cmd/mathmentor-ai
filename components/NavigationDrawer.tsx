
import React from 'react';
import { Home, Brain, StickyNote, X, GraduationCap, Settings, MessageSquare, Zap, HelpCircle } from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: 'home' | 'app' | 'settings' | 'quicknotes') => void;
  onOpenFeedback: () => void;
  onOpenGuide: () => void;
  currentView: 'home' | 'app' | 'settings' | 'quicknotes';
}

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ isOpen, onClose, onNavigate, onOpenFeedback, onOpenGuide, currentView }) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-slate-950 z-[101] shadow-2xl transition-transform duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                <GraduationCap size={20} />
              </div>
              <span className="font-black text-slate-900 dark:text-white tracking-tight">MathMentor AI</span>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 dark:text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => { onNavigate('home'); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                currentView === 'home'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Home size={18} />
              Home
            </button>
            
            <button
              onClick={() => { onNavigate('app'); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                currentView === 'app'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Brain size={18} />
              Learning AI
            </button>

            <button
              onClick={() => { onNavigate('quicknotes'); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                currentView === 'quicknotes'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <StickyNote size={18} />
              QuickNotes AI
            </button>

            <div className="my-4 border-t border-slate-100 dark:border-slate-800" />

            <button
              onClick={() => { onOpenGuide(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
            >
              <HelpCircle size={18} />
              Quick Start Guide
            </button>

            {/* Pro Subscription - Placeholder UI */}
            <button
              onClick={() => { /* Implementation pending */ }}
              className="w-full flex items-center justify-between px-4 py-4 rounded-xl font-black text-sm transition-all bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 group"
            >
              <div className="flex items-center gap-3">
                <Zap size={18} fill="currentColor" className="text-amber-300 group-hover:animate-pulse" />
                Subscription
              </div>
              <span className="text-[8px] bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm uppercase tracking-tighter">Coming Soon</span>
            </button>

            <button
              onClick={() => { onNavigate('settings'); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                currentView === 'settings'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Settings size={18} />
              Settings
            </button>

            <button
              onClick={() => { onOpenFeedback(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
            >
              <MessageSquare size={18} />
              Give Feedback
            </button>
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-900">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>v1.0.6 Study Hub Ready</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NavigationDrawer;
