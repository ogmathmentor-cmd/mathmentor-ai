
import React, { useState, useEffect } from 'react';
import { GraduationCap, Sparkles, BrainCircuit, BookOpen, Rocket, ArrowRight, Moon, Sun, Menu, User as UserIcon, Mail, Instagram, Phone, Star, ShieldCheck, ChevronRight, Zap, Target, Lightbulb } from 'lucide-react';
import { Feedback } from '../types';
import MathRenderer from './MathRenderer';

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
  const [activeConcept, setActiveConcept] = useState(0);
  const concepts = [
    { title: "Calculus", eq: "\\int x^2 dx = \\frac{x^3}{3} + C", desc: "Understanding area under curves." },
    { title: "Algebra", eq: "a^2 + b^2 = c^2", desc: "Mastering relationships in space." },
    { title: "Matrices", eq: "A \\cdot A^{-1} = I", desc: "Solving systems of linear equations." }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveConcept((prev) => (prev + 1) % concepts.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const filteredFeedbacks = feedbacks.filter(fb => 
    fb.message.trim() !== "This website really help me for understanding math. For me this website is already perfect" &&
    fb.message.trim() !== "This website really help me for understanding math. For me this website is already perfect "
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center relative overflow-x-hidden transition-colors duration-500">
      <div className="fixed top-[-10%] left-[-10%] w-[80%] md:w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[80%] md:w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none select-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>

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

      <div className="max-w-6xl w-full px-6 text-center z-10 flex flex-col items-center justify-center py-12 md:py-24">
        <div className="flex flex-col items-center gap-6 mb-8 md:mb-12">
          <div className="w-20 h-20 md:w-28 md:h-28 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 rotate-3 hover:rotate-0 transition-transform duration-500 relative group">
            <GraduationCap size={44} className="md:size-14" />
            <div className="absolute -top-2 -right-2 bg-amber-400 p-2 rounded-xl shadow-lg border-4 border-white dark:border-slate-950 animate-bounce">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl md:text-8xl font-black tracking-tight text-slate-900 dark:text-white leading-[0.9]">
              Advanced <span className="text-indigo-600 dark:text-indigo-400">Math AI</span>
            </h1>
            <p className="text-base md:text-2xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto px-4">
              An open-minded, concise, and logical tutor designed to help you navigate the complex beauty of mathematics.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 w-full px-4 mb-24">
          <button
            onClick={onStart}
            className="group relative w-full sm:w-auto px-12 py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black text-xl md:text-2xl shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
          >
            <Rocket className="w-6 h-6 animate-bounce" />
            Solve Any Problem
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping -z-10" />
          </button>
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open-Minded & Adaptable</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Concise & Precise Answers</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-32">
          {[
            { icon: <Target className="text-indigo-500" size={24} />, title: "Logic First", desc: "Our AI prioritizes clarity and logical patient explanations for every problem." },
            { icon: <Lightbulb className="text-amber-500" size={24} />, title: "Any Difficulty", desc: "From elementary addition to advanced tensor calculus, we solve it all." },
            { icon: <BrainCircuit className="text-emerald-500" size={24} />, title: "Adaptable Style", desc: "Choose between detailed Socratic tutoring or ultra-concise fast answers." }
          ].map((item, i) => (
            <div key={i} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-8 rounded-[2rem] text-left hover:border-indigo-500/50 transition-all group">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{item.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-32 text-left">
          <div className="space-y-6">
            <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Advanced Tutoring</h2>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              A smarter way to <span className="text-indigo-600">Solve</span> and <span className="text-emerald-500">Learn</span>.
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Experience a math tutor that truly understands context. Whether you need a quick result or a deep conceptual dive, our AI adapts its reasoning to match your goal.
            </p>
            <div className="space-y-4">
               {[
                 "Open-minded handling of unconventional queries.",
                 "Strict LaTeX formatting for textbook-quality results.",
                 "Logical, patient, and multi-modal support."
               ].map((point, i) => (
                 <div key={i} className="flex items-center gap-3">
                   <div className="p-1 bg-emerald-500/10 text-emerald-500 rounded-lg">
                     <ChevronRight size={16} strokeWidth={3} />
                   </div>
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{point}</span>
                 </div>
               ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-indigo-600 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col items-center justify-center p-12 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-700 opacity-90 group-hover:scale-110 transition-transform duration-1000"></div>
              
              <div className="relative z-10 w-full bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 animate-in slide-in-from-bottom-8 duration-1000">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-widest">{concepts[activeConcept].title} Concept</span>
                </div>
                <div className="mb-4 transition-all duration-500 transform">
                  <MathRenderer 
                    latex={concepts[activeConcept].eq} 
                    displayMode={true} 
                    className="text-xl md:text-2xl font-bold text-white drop-shadow-md" 
                  />
                </div>
                <p className="text-sm text-indigo-100 font-medium">
                  {concepts[activeConcept].desc}
                </p>
              </div>

              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-amber-400 rounded-full blur-[80px] opacity-40"></div>
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-violet-400 rounded-full blur-[80px] opacity-40"></div>
            </div>
          </div>
        </div>

        <div id="wall-of-love" className="w-full max-w-5xl px-4 mb-24 scroll-mt-24">
          <div className="text-center mb-12">
             <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-4">Wall of Love</h2>
             <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Student Success Stories</h3>
          </div>
          
          <div className="bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 p-6 md:p-8">
            <div className="max-h-[500px] md:max-h-[600px] overflow-y-auto custom-scrollbar pr-4 -mr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                {filteredFeedbacks.map((fb, i) => (
                  <div 
                    key={fb.id} 
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-sm">
                        <img src={fb.userPfp} alt={fb.userName} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-left min-w-0 flex-1">
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

      <footer className="w-full mt-auto relative z-20 pb-safe">
        <div className="max-w-6xl mx-auto px-4 pb-8 md:pb-12">
          <div className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-[3rem] p-8 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                 <GraduationCap size={24} />
               </div>
               <div className="text-left">
                 <span className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.15em] leading-none mb-1">OG MathMentor</span>
                 <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tutoring Redefined</span>
               </div>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:flex md:items-center gap-4 w-full md:w-auto">
              <a href="mailto:ogmathmentor@gmail.com" className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
                <Mail size={16} className="text-indigo-500" />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Email</span>
              </a>
              <a href="https://instagram.com/ogmathmentor" target="_blank" className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all">
                <Instagram size={16} className="text-pink-500" />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Instagram</span>
              </a>
              <a href="tel:+60102345693" className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                <Phone size={16} className="text-emerald-500" />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Call Now</span>
              </a>
            </div>
            <div className="hidden lg:flex flex-col items-end opacity-40">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">© 2025 AI POWERED STUDY HUB</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">v1.1.0 Optimized Reasoning</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomeScreen;
