
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
    <div className="min-h-screen bg-[#020617] flex flex-col items-center relative overflow-x-hidden transition-colors duration-500">
      {/* Background Decorative Blurs */}
      <div className="fixed top-[-10%] left-[-10%] w-[80%] md:w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[80%] md:w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Top Navigation Bar */}
      <nav className="w-full sticky top-0 z-50 px-4 md:px-8 py-4 flex items-center justify-between bg-[#020617]/60 backdrop-blur-xl border-b border-slate-800/50 pt-safe transition-all">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMenu}
            className="p-2.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 active:scale-95 transition-transform"
          >
            <Menu size={20} />
          </button>
          <div className="hidden xs:flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <GraduationCap size={18} />
            </div>
            <span className="text-sm font-black text-white uppercase tracking-tight">MathMentor</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 active:scale-95 transition-transform"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-sm">
              <span className="hidden sm:block text-[10px] font-black text-white px-2">
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
      <div className="max-w-4xl w-full px-6 text-center z-10 flex flex-col items-center justify-center py-12 md:py-16 animate-in fade-in zoom-in-95 duration-1000">
        <div className="flex flex-col items-center gap-6 mb-8 md:mb-12">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 rotate-3 hover:rotate-0 transition-transform duration-500">
            <GraduationCap size={32} className="md:size-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-7xl font-black tracking-tight text-white">
              MathMentor <span className="text-indigo-400">AI</span>
            </h1>
            <p className="text-base md:text-xl text-slate-400 font-medium leading-relaxed max-w-xl mx-auto px-4">
              Your personal mathematical tutor that adapts to your unique learning style.
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-4 w-full max-w-3xl mb-12">
          {[
            { icon: <Sparkles className="text-amber-500" size={18} />, title: "Adaptive Logic", desc: "Learns how you learn" },
            { icon: <BrainCircuit className="text-indigo-400" size={18} />, title: "Step-by-Step", desc: "Clear, logical reasoning" },
            { icon: <BookOpen className="text-emerald-400" size={18} />, title: "All Levels", desc: "Beginner to Professional" }
          ].map((item, i) => (
            <div key={i} className="flex md:flex-col items-center gap-4 md:gap-2 p-4 bg-slate-900/40 rounded-2xl border border-slate-800 shadow-sm hover:border-slate-700 transition-all group text-left md:text-center">
              <div className="p-2 md:p-0 bg-slate-800 rounded-xl md:bg-transparent">
                {item.icon}
              </div>
              <div>
                <h3 className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">{item.title}</h3>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 w-full px-4 mb-24">
          <button
            onClick={onStart}
            className="group relative w-full sm:w-auto px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black text-lg shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
          >
            <Rocket className="w-5 h-5 animate-bounce" />
            Start Learning
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping -z-10" />
          </button>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">
            Join 5,000+ Students Worldwide
          </p>
        </div>

        {/* Feedback Section (Wall of Love Window) */}
        <div className="w-full max-w-6xl px-4 mb-24">
          <div className="text-center mb-10">
             <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Wall of Love</h2>
             <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">Student Success Stories</h3>
          </div>
          
          {/* Scrollable Feedback Box / Window */}
          <div className="bg-[#0f172a]/20 border border-slate-800 rounded-[2.5rem] p-4 md:p-8 shadow-inner overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-2 px-1">
                {feedbacks.map((fb, i) => (
                  <div 
                    key={fb.id} 
                    className="bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800/80 p-6 rounded-[1.5rem] shadow-xl transition-all group hover:-translate-y-2 hover:bg-[#1e293b]/60 hover:border-indigo-500/40 flex flex-col items-start gap-4 h-full"
                  >
                    <div className="flex items-start gap-4 w-full">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-500/50 shadow-md shrink-0 bg-slate-800">
                        <img src={fb.userPfp} alt={fb.userName} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate mb-1">{fb.userName}</p>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, idx) => (
                            <Star 
                              key={idx} 
                              size={10} 
                              fill={idx < fb.rating ? "#fbbf24" : "none"} 
                              className={idx < fb.rating ? "text-amber-400" : "text-slate-700"} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-left w-full h-full">
                      <p className="text-sm text-slate-400 italic leading-relaxed font-medium">
                        "{fb.message}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Scroll to see more success stories</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full mt-auto relative z-20 pb-safe">
        <div className="max-w-5xl mx-auto px-4 pb-8">
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-[2rem] p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                 <GraduationCap size={18} />
               </div>
               <div className="text-left">
                 <span className="block text-xs font-black text-white uppercase tracking-[0.15em] leading-none mb-1">OG MathMentor</span>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tutoring Redefined</span>
               </div>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 md:flex md:items-center gap-4 w-full md:w-auto">
              <a 
                href="mailto:ogmathmentor@gmail.com" 
                className="flex items-center gap-3 p-2.5 bg-slate-800/50 rounded-xl hover:bg-indigo-900/20 transition-all group border border-slate-700/50"
              >
                <Mail size={14} className="text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-300">Email</span>
              </a>
              
              <a 
                href="https://instagram.com/ogmathmentor" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-3 p-2.5 bg-slate-800/50 rounded-xl hover:bg-pink-900/20 transition-all group border border-slate-700/50"
              >
                <Instagram size={14} className="text-pink-400" />
                <span className="text-[10px] font-bold text-slate-300">Instagram</span>
              </a>

              <a 
                href="tel:+60102345693" 
                className="flex items-center gap-3 p-2.5 bg-slate-800/50 rounded-xl hover:bg-emerald-900/20 transition-all group border border-slate-700/50"
              >
                <Phone size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-300">Call Now</span>
              </a>
            </div>

            <div className="hidden lg:flex items-center gap-3 opacity-30">
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">© 2025 AI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomeScreen;
