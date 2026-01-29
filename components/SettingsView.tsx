// components/SettingsView.tsx

import React, { useState, useRef } from 'react';
import { 
  User, Shield, Moon, Sun, Monitor, Languages, Brain, 
  ChevronLeft, Camera, Image as ImageIcon, Check, Lock, 
  ArrowRight, Trash2, X, CheckCircle2, Info, Mail, Save,
  Cloud, ExternalLink, Globe, Sparkles
} from 'lucide-react';
import { UserLevel } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface SettingsViewProps {
  user: { name: string; email: string; pfp: string } | null;
  activeTab: 'account' | 'preferences';
  setTab: (tab: 'account' | 'preferences') => void;
  onBack: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  level: UserLevel;
  subLevel: string | null;
  socraticEnabled: boolean;
  setSocraticEnabled: (enabled: boolean) => void;
  reasoningMode: 'fast' | 'deep';
  setReasoningMode: (mode: 'fast' | 'deep') => void;
  onUpdateUser: (updates: { name?: string; pfp?: string }) => void;
  onDeleteData: () => void;
}

const AVATAR_SEEDS = [
  'Coco', 'Buddy', 'Milo', 'Bear', 'Panda', 'Fox', 'Owl', 
  'Lion', 'Tiger', 'Bunny', 'Kitty', 'Puppy', 'Froggy', 'Duck'
];

const SettingsView: React.FC<SettingsViewProps> = ({ 
  user, activeTab, setTab, onBack, isDarkMode, toggleTheme, 
  level, subLevel, socraticEnabled, setSocraticEnabled, 
  reasoningMode, setReasoningMode,
  onUpdateUser, onDeleteData 
}) => {
  const [subView, setSubView] = useState<'main' | 'security' | 'customize-pfp'>('main');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passChanged, setPassChanged] = useState(false);
  
  const [recoveryEmail, setRecoveryEmail] = useState('recovery@example.com');
  const [isUpdatingRecovery, setIsUpdatingRecovery] = useState(false);
  const [recoveryUpdated, setRecoveryUpdated] = useState(false);

  const handlePfpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onUpdateUser({ pfp: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const selectAvatar = (seed: string) => {
    onUpdateUser({ pfp: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9` });
  };

  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert("New passwords do not match!");
      return;
    }
    setPassChanged(true);
    setTimeout(() => {
      setPassChanged(false);
      setSubView('main');
    }, 2000);
    setPasswords({ current: '', new: '', confirm: '' });
  };

  const handleRecoveryEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingRecovery(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsUpdatingRecovery(false);
    setRecoveryUpdated(true);
    setTimeout(() => setRecoveryUpdated(false), 3000);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50/50 dark:bg-[#0b0f1a] custom-scrollbar animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 pb-24 md:pb-12">
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={subView === 'main' ? onBack : () => setSubView('main')}
            className="p-2.5 rounded-xl bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:scale-105 transition-all shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {subView === 'customize-pfp' ? 'Customize Profile' : subView === 'security' ? 'Security' : 'Settings'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {subView === 'customize-pfp' ? 'Pick a unique avatar or upload your own' : 'Manage your MathMentor experience'}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-64 space-y-1">
            <button
              onClick={() => { setTab('account'); setSubView('main'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'account' && subView === 'main'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white dark:bg-[#111827] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm'
              }`}
            >
              <User size={18} /> My Account
            </button>
            <button
              onClick={() => { setTab('preferences'); setSubView('main'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'preferences' && subView === 'main'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white dark:bg-[#111827] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm'
              }`}
            >
              <Shield size={18} /> Preferences
            </button>
          </div>

          <div className="flex-1">
            {activeTab === 'account' ? (
              <div className="animate-in slide-in-from-right-4 duration-500">
                {subView === 'main' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative group cursor-pointer" onClick={() => setSubView('customize-pfp')}>
                          <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-indigo-600/20 dark:border-indigo-500/30 relative bg-slate-100 dark:bg-slate-800">
                            <img 
                              src={user?.pfp || 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=guest'} 
                              alt="Profile" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            />
                            <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="text-white" size={24} />
                            </div>
                          </div>
                          <button className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform border-2 border-white dark:border-[#111827]">
                            <Camera size={14} />
                          </button>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{user?.name || 'Guest Scholar'}</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{user?.email || 'Sign in to sync your progress'}</p>
                          <div className="flex flex-wrap justify-center md:justify-start gap-2">
                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/30">
                              {level.split(' (')[0]}
                            </span>
                            {subLevel && (
                              <span className="px-3 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-violet-100 dark:border-violet-900/30">
                                {subLevel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
                      <button 
                        onClick={() => setSubView('security')}
                        className="w-full px-6 py-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Lock size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Security & Password</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">Manage your password and security</div>
                          </div>
                        </div>
                        <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                      
                      <button 
                        onClick={() => setIsConfirmingDelete(true)}
                        className="w-full px-6 py-5 text-left hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4 text-red-500">
                          <div className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl">
                            <Trash2 size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-bold">Delete My Data</div>
                            <div className="text-[11px] text-red-400/70">Wipe all progress and local data</div>
                          </div>
                        </div>
                        <ArrowRight size={18} className="text-red-400 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                )}

                {subView === 'customize-pfp' && (
                  <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-8 animate-in zoom-in-95 duration-300 flex flex-col items-center">
                    <div className="flex flex-col items-center gap-4 w-full">
                       <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-indigo-600 shadow-2xl relative bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                          <img 
                            src={user?.pfp || 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=guest'} 
                            className="w-full h-full object-cover" 
                            alt="Selected Avatar" 
                          />
                       </div>
                       <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">Live Preview</p>
                    </div>

                    <div className="w-full space-y-6">
                      <div className="flex items-center justify-between">
                        {/* Fix: Added missing opening bracket for h4 tag */}
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Choose an Avatar</h4>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-bold transition-all shadow-sm border border-slate-200 dark:border-slate-700"
                        >
                          <ImageIcon size={14} /> From Gallery
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handlePfpUpload} className="hidden" accept="image/*" />
                      </div>
                      
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-4">
                        {AVATAR_SEEDS.map((seed) => {
                          const avatarUrl = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                          const isSelected = user?.pfp === avatarUrl;
                          return (
                            <button
                              key={seed}
                              onClick={() => selectAvatar(seed)}
                              className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-110 active:scale-90 relative ${
                                isSelected 
                                  ? 'border-indigo-600 bg-indigo-600/10 shadow-[0_0_15px_rgba(79,70,229,0.3)] scale-110 z-10' 
                                  : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-[#111827]/50 hover:border-indigo-300 dark:hover:border-indigo-800'
                              }`}
                            >
                              <img src={avatarUrl} className="w-full h-full object-cover p-1.5" alt={seed} />
                              {isSelected && (
                                <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                                  <div className="bg-indigo-600 text-white rounded-full p-0.5 shadow-lg">
                                    <Check size={10} strokeWidth={4} />
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button 
                      onClick={() => setSubView('main')}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      Save Changes
                    </button>
                  </div>
                )}

                {subView === 'security' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                          <Lock size={16} />
                        </div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Update Password</h4>
                      </div>
                      <form onSubmit={handleSecuritySubmit} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
                          <input 
                            type="password" 
                            required
                            value={passwords.current}
                            onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-[#0b0f1a] border border-slate-200 dark:border-slate-800 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all text-slate-900 dark:text-white" 
                            placeholder="••••••••"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                          <input 
                            type="password" 
                            required
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-[#0b0f1a] border border-slate-200 dark:border-slate-800 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all text-slate-900 dark:text-white" 
                            placeholder="At least 8 characters"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                          <input 
                            type="password" 
                            required
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-[#0b0f1a] border border-slate-200 dark:border-slate-800 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all text-slate-900 dark:text-white" 
                            placeholder="Repeat new password"
                          />
                        </div>
                        
                        {passChanged && (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3 animate-in fade-in zoom-in-95">
                            <CheckCircle2 size={18} /> Password updated successfully!
                          </div>
                        )}

                        <button 
                          type="submit"
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                          Update Security
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Monitor size={20} />
                    </div>
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest">Appearance</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => !isDarkMode && toggleTheme()}
                      className={`flex flex-col items-center gap-4 p-8 rounded-3xl border-2 transition-all ${
                        isDarkMode 
                          ? 'border-indigo-600 bg-indigo-600/5 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/5' 
                          : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-indigo-200'
                      }`}
                    >
                      <Moon size={32} />
                      <span className="text-sm font-black">Dark Mode</span>
                    </button>
                    <button 
                      onClick={() => isDarkMode && toggleTheme()}
                      className={`flex flex-col items-center gap-4 p-8 rounded-3xl border-2 transition-all ${
                        !isDarkMode 
                          ? 'border-indigo-600 bg-indigo-600/5 text-indigo-600 shadow-lg shadow-indigo-500/5' 
                          : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-indigo-200'
                      }`}
                    >
                      <Sun size={32} />
                      <span className="text-sm font-black">Light Mode</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                   <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-xl">
                      <Brain size={20} />
                    </div>
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest">AI & Tutoring</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-[#0b0f1a] rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Socratic Guidance</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">AI asks leading questions first</div>
                      </div>
                      <button 
                        onClick={() => setSocraticEnabled(!socraticEnabled)}
                        className={`w-14 h-8 rounded-full relative transition-all duration-300 ${socraticEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        {/* Fix: Added missing opening bracket for div tag */}
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 transform ${socraticEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal 
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={onDeleteData}
        title="Wipe My Data?"
        message="This will permanently delete your chat history, focus area progress, and local profile. This cannot be undone."
        confirmLabel="Yes, Wipe Everything"
      />
    </div>
  );
};

export default SettingsView;