
import React, { useState } from 'react';
import { X, MessageSquare, Mail, Star, ChevronRight, Lock, LogIn } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string, rating: number) => void;
  user: { name: string; email: string; pfp: string } | null;
  onSignIn: () => void;
}

// Slur Filter Dictionary
const SLURS = [
  /n[i1]gga/gi,
  /bodoh/gi,
  /babi/gi,
  /anjing/gi,
  /pukimak/gi,
  /pantat/gi,
  /sial/gi,
  /stupid/gi,
  /bastard/gi,
  /fuc?k/gi,
  /shit/gi,
  /dick/gi,
  /pussy/gi,
  /bangang/gi,
  /celaka/gi
];

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, user, onSignIn }) => {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  if (!isOpen) return null;

  const applyCensorship = (text: string) => {
    let censored = text;
    SLURS.forEach(pattern => {
      censored = censored.replace(pattern, (match) => '*'.repeat(match.length));
    });
    return censored;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || !user || rating === 0) return;

    // Apply censorship before submission
    const safeFeedback = applyCensorship(feedback);

    onSubmit(safeFeedback, rating);
    
    // Clear form and close
    setFeedback('');
    setRating(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Give Feedback</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Help us improve MathMentor</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {!user ? (
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                <Lock size={40} />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Sign In Required</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-[280px] mx-auto">Please sign in to send feedback to our developers.</p>
              </div>
              <button
                onClick={onSignIn}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <LogIn size={20} />
                Sign In to Continue
              </button>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className={`p-1.5 transition-all transform active:scale-90 ${
                        (hoverRating || rating) >= star 
                          ? 'text-amber-400 scale-110' 
                          : 'text-slate-200 dark:text-slate-800'
                      }`}
                    >
                      <Star size={32} fill={(hoverRating || rating) >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Message</label>
                <textarea
                  required
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What's on your mind?..."
                  className="w-full h-40 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all resize-none text-slate-900 dark:text-white placeholder:text-slate-400 leading-relaxed"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                  <img src={user.pfp} className="w-8 h-8 rounded-lg shadow-sm" alt="User" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none mb-1">Sending as:</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{user.name}</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!feedback.trim() || rating === 0}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95"
                >
                  <Mail size={20} />
                  Submit Feedback
                  <ChevronRight size={18} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
