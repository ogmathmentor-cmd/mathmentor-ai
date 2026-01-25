
import React from 'react';
import { GraduationCap, Sparkles, BrainCircuit, BookOpen, Rocket, ArrowRight, Moon, Sun, Menu, User as UserIcon, Mail, Instagram, Phone } from 'lucide-react';

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
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onStart, isDarkMode, toggleTheme, onOpenMenu, onLogin, user }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Top Left Menu Trigger */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={onOpenMenu}
          className="p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform shadow-sm"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Top Right Auth/Theme */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:scale-110 transition-transform"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {user ? (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 pl-3 shadow-sm pr-1.5">
            <span className="text-xs font-black text-slate-900 dark:text-white">{user.name.split(' ')[0]}</span>
            <img src={user.pfp} className="w-8 h-8 rounded-xl border border-indigo-600 shadow-sm" alt="Profile" />
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <UserIcon size={16} /> Sign In
          </button>
        )}
      </div>

      <div className="max-w-3xl w-full text-center z-10 space-y-8 animate-in fade-in zoom-in-95 duration-1000 pb-24 md:pb-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 rotate-3 hover:rotate-0 transition-transform duration-500">
            <GraduationCap size={48} />
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white">
            MathMentor <span className="text-indigo-600 dark:text-indigo-400">AI</span>
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
          Your personal mathematical tutor that adapts to your unique learning style. Master any concept from primary counting to advanced proofs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
          {[
            { icon: <Sparkles className="text-amber-500" />, title: "Adaptive Logic", desc: "Learns how you learn" },
            { icon: <BrainCircuit className="text-indigo-500" />, title: "Step-by-Step", desc: "Clear, logical reasoning" },
            { icon: <BookOpen className="text-emerald-500" />, title: "All Levels", desc: "Beginner to Professional" }
          ].map((item, i) => (
            <div key={i} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
              <div className="mb-3 flex justify-center">{item.icon}</div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-500 transition-colors">{item.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 flex flex-col items-center gap-6">
          <button
            onClick={onStart}
            className="group relative px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black text-xl shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
          >
            <Rocket className="w-6 h-6 animate-bounce" />
            Start Learning
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            
            <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping -z-10" />
          </button>
        </div>
      </div>

      {/* Sleek Minimalist Contact Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 z-20">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-full py-2.5 px-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl shadow-indigo-500/5">
          <div className="flex items-center gap-3 group">
             <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg group-hover:rotate-6 transition-transform">
               <GraduationCap size={14} />
             </div>
             <div className="hidden sm:block">
               <span className="block text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-[0.15em] leading-none">OG MathMentor</span>
               <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tutoring Services</span>
             </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-7">
            <a 
              href="mailto:ogmathmentor@gmail.com" 
              className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group"
            >
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:scale-110 transition-transform">
                <Mail size={13} />
              </div>
              <span className="text-[10px] font-bold tracking-tight">ogmathmentor@gmail.com</span>
            </a>
            
            <a 
              href="https://instagram.com/ogmathmentor" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 hover:text-pink-500 dark:hover:text-pink-400 transition-all group"
            >
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:scale-110 transition-transform">
                <Instagram size={13} />
              </div>
              <span className="text-[10px] font-bold tracking-tight">@ogmathmentor</span>
            </a>

            <a 
              href="tel:+60102345693" 
              className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all group"
            >
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:scale-110 transition-transform">
                <Phone size={13} />
              </div>
              <span className="text-[10px] font-bold tracking-tight">+60102345693</span>
            </a>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">© 2025 AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
