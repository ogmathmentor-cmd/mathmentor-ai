import React from 'react';
import { GraduationCap, Sparkles, BrainCircuit, BookOpen, Rocket, ArrowRight, Moon, Sun, Menu, User as UserIcon, Mail, Instagram, Phone, Star } from 'lucide-react';
import { Feedback } from '../types';

interface User {
  name: string;
  email: string;
  pfp: string;
}

interface HomeScreenProps {
  onStart: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenMenu: () => void;
  onLogin: () => void;
  user: User | null;
  feedbacks: Feedback[];
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onStart, isDarkMode, toggleTheme, onOpenMenu, onLogin, user, feedbacks }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center relative overflow-x-hidden transition-colors duration-500">
      {/* Background Decorative Blurs */}
      <div className="fixed top-[-10%] left-[-10%] w-[80%] md:w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[80%] md:w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Top Navigation Bar - Mobile Optimized */}
      <nav className="w-full sticky top-0 z-50 px-4 md:px-8 py-4 flex items-center justify-between bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 pt-safe transition-all">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMenu}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95 transition-transform"
          >
            <Menu size={20} />
          </button>
          <div className="hidden xs:flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <GraduationCap size={18} />
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">MathMentor</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 active:scale-95 transition-transform"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm">
              <span className="hidden sm:block text-[10px] font-black text-slate-900 dark:text-white px-2">
                {user.name.split(' ')[0]}
              </span>
              <img src={user.pfp} className="w-7 h-7 rounded-lg border border-indigo-600 shadow-sm" alt="Profile" />
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2 transition-all"
            >
              <UserIcon size={14} /> <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl w-full px-6 text-center z-10 flex flex-col items-center justify-center py-12 md:py-24 animate-in fade-in zoom-in-95 duration-1000">
        <div className="flex flex-col items-center gap-6 mb-8 md:mb-12">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 rotate-3 hover:rotate-0 transition-transform duration-500">
            <GraduationCap size={40} className="md:size-12" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white">
              MathMentor <span className="text-indigo-600 dark:text-indigo-400">AI</span>
            </h1>
            <p className="text-base md:text-2xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto px-4">
              Your personal mathematical tutor that adapts to your unique learning style.
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-3xl mb-12">
          {[
            { icon: <Sparkles className="text-amber-500" size={20} />, title: "Adaptive Logic", desc: "Learns how you learn" },
            { icon: <BrainCircuit className="text-indigo-500" size={20} />, title: "Step-by-Step", desc: "Clear, logical reasoning" },
            { icon: <BookOpen className="text-emerald-500" size={20} />, title: "All Levels", desc: "Beginner to Professional" }
          ].map((item, i) => (
            <div key={i} className="flex md:flex-col items-center gap-4 md:gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group text-left md:text-center">
              <div className="p-3 md:p-0 bg-slate-50 dark:bg-slate-800 rounded-xl md:bg-transparent">
                {item.icon}
              </div>
              <div>
                <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">{item.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 w-full px-4 mb-24">
          <button
            onClick={onStart}
            className="group relative w-full sm:w-auto px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black text-lg md:text-xl shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
          >
            <Rocket className="w-5 h-5 md:w-6 md:h-6 animate-bounce" />
            Start Learning
            <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
            <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping -z-10" />
          </button>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Join 5,000+ Students Worldwide
          </p>
        </div>

        {/* Feedback Section (Wall of Love) */}
        <div className="w-full max-w-5xl px-4 mb-24 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="text-center mb-8">
             <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-4">Wall of Love</h2>
             <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Student Success Stories</h3>
          </div>
          
          {/* Scrollable Feedback Box */}
          <div className="bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 p-6 md:p-8">
            <div className="max-h-[500px] md:max-h-[600px] overflow-y-auto custom-scrollbar pr-4 -mr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                {feedbacks.map((fb, i) => (
                  <div 
                    key={fb.id} 
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group hover:-translate-y-1"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-sm">
                        <img src={fb.userPfp} alt={fb.userName} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{fb.userName}</p>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, idx) => (
                            <Star key={idx} size={10} fill={idx < fb.rating ? "currentColor" : "none"} className={idx < fb.rating ? "text-amber-400" : "text-slate-300 dark:text-slate-700"} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-left text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed font-medium">
                      "{fb.message}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full mt-auto relative z-20 pb-safe">
        <div className="max-w-5xl mx-auto px-4 pb-8 md:pb-12">
          <div className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-[2rem] p-6 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                 <GraduationCap size={20} />
               </div>
               <div className="text-left">
                 <span className="block text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.15em] leading-none mb-1">OG MathMentor</span>
                 <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tutoring Redefined</span>
               </div>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 md:flex md:items-center gap-4 w-full md:w-auto">
              <a 
                href="mailto:ogmathmentor@gmail.com" 
                className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <Mail size={14} className="text-indigo-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Email</span>
              </a>
              
              <a 
                href="https://instagram.com/ogmathmentor" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all group"
              >
                <Instagram size={14} className="text-pink-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Instagram</span>
              </a>

              <a 
                href="tel:+60102345693" 
                className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group"
              >
                <Phone size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Call Now</span>
              </a>
            </div>

            <div className="hidden lg:flex items-center gap-3 opacity-30">
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">© 2025 AI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomeScreen;