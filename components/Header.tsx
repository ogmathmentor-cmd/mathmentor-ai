import React, { useState, useRef, useEffect } from 'react';
import { UserLevel, Language } from '../types';
import { GraduationCap, Moon, Sun, Menu, ChevronDown, Check, LogOut, Settings, User as UserIcon, Languages } from 'lucide-react';

interface User {
  name: string;
  email: string;
  pfp: string;
}

interface HeaderProps {
  level: UserLevel;
  subLevel: string | null;
  setLevel: (level: UserLevel, subLevel?: string | null) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenMenu: () => void;
  onLogin: () => void;
  onLogout: () => void;
  user: User | null;
  onNavigate: (view: 'home' | 'app' | 'settings' | 'quicknotes', tab?: 'account' | 'preferences') => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  showLevels?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  level, subLevel, setLevel, isDarkMode, toggleTheme, onOpenMenu, onLogin, onLogout, user, onNavigate,
  language, setLanguage, showLevels = true
}) => {
  const [openMenu, setOpenMenu] = useState<UserLevel | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const beginnerOptions = ['Standard 1', 'Standard 2', 'Standard 3', 'Standard 4', 'Standard 5', 'Standard 6'];
  const intermediateOptions = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5'];
  const advancedOptions = ['Form 4 (Add Math)', 'Form 5 (Add Math)', 'Essential Mathematics'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLevelClick = (l: UserLevel) => {
    if (l !== UserLevel.OPENAI) {
      setOpenMenu(openMenu === l ? null : l);
    } else {
      setLevel(l, null);
      setOpenMenu(null);
    }
  };

  const handleOptionSelect = (selectedLevel: UserLevel, option: string) => {
    setLevel(selectedLevel, option);
    setOpenMenu(null);
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="w-full px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button 
            onClick={onOpenMenu}
            className="p-2.5 -ml-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white hidden sm:block tracking-tight">MathMentor AI</h1>
          </div>
        </div>

        {/* Center Section - Level Selectors */}
        <div className="flex-1 flex justify-center">
          {showLevels && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50" ref={menuRef}>
              {(Object.values(UserLevel) as UserLevel[])
                .filter(l => l !== UserLevel.OPENAI)
                .map((l) => {
                  const hasSubmenu = l !== UserLevel.OPENAI;
                  const isMenuOpen = openMenu === l;
                  const isActive = level === l;
                  
                  let options: string[] = [];
                  if (l === UserLevel.BEGINNER) options = beginnerOptions;
                  else if (l === UserLevel.INTERMEDIATE) options = intermediateOptions;
                  else if (l === UserLevel.ADVANCED) options = advancedOptions;

                  return (
                    <div key={l} className="relative">
                      <button
                        onClick={() => handleLevelClick(l)}
                        className={`flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                          isActive
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        {language === 'BM' 
                          ? l.replace('Intermediate (Secondary)', 'Menengah')
                             .replace('Beginner (Primary)', 'Asas')
                             .replace('Advanced (KSSM Add Math / Pre-U)', 'Matematik Tambahan & Lanjutan') 
                          : l.split(' (')[0]}
                        {hasSubmenu && <ChevronDown size={14} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />}
                      </button>

                      {hasSubmenu && isMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                          {options.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => handleOptionSelect(l, opt)}
                              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                                subLevel === opt && level === l
                                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 font-bold' 
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                              }`}
                            >
                              {opt}
                              {subLevel === opt && level === l && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 md:p-1 border border-slate-200 dark:border-slate-700">
               <button 
                onClick={() => setLanguage('BM')}
                className={`px-2 py-1.5 rounded-lg text-[9px] font-black transition-all md:px-3 md:text-[10px] ${language === 'BM' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 BM
               </button>
               <button 
                onClick={() => setLanguage('EN')}
                className={`px-2 py-1.5 rounded-lg text-[9px] font-black transition-all md:px-3 md:text-[10px] ${language === 'EN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 EN
               </button>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-600 shadow-md shadow-indigo-500/10 hover:scale-105 transition-transform flex items-center justify-center"
                >
                  <img src={user.pfp} alt={user.name} className="w-full h-full object-cover" />
                </button>

                {showProfileMenu && (
                  <div className="absolute top-full right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-4 py-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-0.5">{language === 'BM' ? 'Profil Pengguna' : 'User Profile'}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                    </div>
                    
                    <button 
                      onClick={() => { onNavigate('settings', 'account'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                    >
                      <UserIcon size={16} /> {language === 'BM' ? 'Akaun Saya' : 'My Account'}
                    </button>
                    <button 
                      onClick={() => { onNavigate('settings', 'preferences'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                    >
                      <Settings size={16} /> {language === 'BM' ? 'Tetapan' : 'Settings'}
                    </button>
                    <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                    <button 
                      onClick={() => { onLogout(); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 transition-colors"
                    >
                      <LogOut size={16} /> {language === 'BM' ? 'Log Keluar' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-95 whitespace-nowrap"
              >
                {language === 'BM' ? 'Masuk' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;