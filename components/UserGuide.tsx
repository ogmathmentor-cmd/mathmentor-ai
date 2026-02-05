
import React, { useState } from 'react';
import { 
  X, ChevronRight, ChevronLeft, GraduationCap, 
  MessageSquare, Zap, Target, BookOpen, 
  MousePointer2, Sparkles, CheckCircle2 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { UserLevel, Language } from '../types';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
  level: UserLevel;
  language: Language;
}

const UserGuide: React.FC<UserGuideProps> = ({ isOpen, onClose, level, language }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const content = {
    EN: {
      steps: [
        {
          title: "Welcome to MathMentor AI",
          desc: `I am your personal mathematical tutor. I've tailored my workspace for your ${level} studies.`,
          icon: <GraduationCap className="text-indigo-500" size={32} />,
          hint: "Let's take a 60-second tour of your new tools."
        },
        {
          title: "1. Choose Your Mode",
          desc: "Look at the top of the chat. Switch between **Learning** (detailed help), **Exam** (formal tips), and **Fast Answer** (just the math).",
          icon: <Zap className="text-amber-500" size={32} />,
          // Fix: UserLevel.BEGINNER removed as it doesn't exist in types.ts
          hint: level === UserLevel.INTERMEDIATE ? "Try 'Learning' first!" : "Use 'Exam' mode for KSSM papers."
        },
        {
          title: "2. Ask Anything",
          desc: "Type a problem at the bottom or click the paperclip to upload a photo of your homework. I can read handwriting too!",
          icon: <MessageSquare className="text-indigo-500" size={32} />,
          hint: "Be specific! Ask 'How do I solve this?' rather than just 'What is the answer?'"
        },
        {
          title: "3. Interactive Tools",
          desc: "On the right (Desktop) or in the menu (Mobile), find the **Quiz Center**. Generate custom tests for any topic.",
          icon: <Target className="text-emerald-500" size={32} />,
          hint: "Try generating a 'Fractions' quiz to test your skills."
        },
        {
          title: "4. Read Better",
          desc: "Need bigger formulas? Use the **Zoom Buttons** (+/-) in the chat header to adjust the math size to your liking.",
          icon: <MousePointer2 className="text-violet-500" size={32} />,
          hint: "Your zoom setting is saved automatically!"
        }
      ],
      footer: "Ready to master math?",
      finish: "Start Learning",
      next: "Next Step",
      back: "Back"
    },
    BM: {
      steps: [
        {
          title: "Selamat Datang ke MathMentor AI",
          desc: `Saya tutor matematik peribadi anda. Saya telah menyesuaikan ruang kerja untuk tahap ${level === UserLevel.INTERMEDIATE ? 'Menengah' : 'Pre-U'} anda.`,
          icon: <GraduationCap className="text-indigo-500" size={32} />,
          hint: "Mari kita lihat alatan anda dalam masa 60 saat."
        },
        {
          title: "1. Pilih Mod Anda",
          desc: "Lihat di bahagian atas sembang. Tukar antara **Learning** (bimbingan terperinci), **Exam** (tips peperiksaan), dan **Fast Answer** (jawapan terus).",
          icon: <Zap className="text-amber-500" size={32} />,
          // Fix: UserLevel.BEGINNER removed as it doesn't exist in types.ts
          hint: level === UserLevel.INTERMEDIATE ? "Cuba 'Learning' dahulu!" : "Gunakan mod 'Exam' untuk kertas KSSM."
        },
        {
          title: "2. Tanya Apa Sahaja",
          desc: "Taip soalan di bawah atau klik ikon klip kertas untuk muat naik foto kerja rumah anda. Saya boleh baca tulisan tangan!",
          icon: <MessageSquare className="text-indigo-500" size={32} />,
          hint: "Tanya secara spesifik! 'Bagaimana nak selesaikan ini?' lebih baik daripada 'Apa jawapannya?'"
        },
        {
          title: "3. Alatan Interaktif",
          desc: "Di sebelah kanan (Desktop) atau dalam menu (Mobile), cari **Pusat Kuiz**. Bina ujian tersuai untuk mana-mana topik.",
          icon: <Target className="text-emerald-500" size={32} />,
          hint: "Cuba bina kuiz 'Pecahan' untuk menguji kemahiran anda."
        },
        {
          title: "4. Penglihatan Jelas",
          desc: "Perlukan formula lebih besar? Gunakan **Butang Zoom** (+/-) di bahagian atas untuk melaras saiz teks matematik.",
          icon: <MousePointer2 className="text-violet-500" size={32} />,
          hint: "Tetapan zoom anda disimpan secara automatik!"
        }
      ],
      footer: "Sedia untuk kuasai matematik?",
      finish: "Mula Belajar",
      next: "Seterusnya",
      back: "Kembali"
    }
  };

  const t = content[language] || content.EN;
  const current = t.steps[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose} />
      
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-800">
          <div 
            className="h-full bg-indigo-600 transition-all duration-500" 
            style={{ width: `${((step + 1) / t.steps.length) * 100}%` }}
          />
        </div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 md:p-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-[#1e293b] rounded-3xl flex items-center justify-center mb-8 shadow-inner border border-slate-100 dark:border-slate-800">
            {current.icon}
          </div>

          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            {current.title}
          </h3>

          <div className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-8 max-w-sm">
            <ReactMarkdown components={{
              p: ({children}) => <p className="mb-0">{children}</p>,
              strong: ({children}) => <strong className="font-black text-indigo-600 dark:text-indigo-400">{children}</strong>
            }}>
              {current.desc}
            </ReactMarkdown>
          </div>

          <div className="w-full p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 flex items-center gap-3 text-left mb-10">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <Sparkles size={14} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none mb-1">Expert Hint</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 italic">"{current.hint}"</p>
            </div>
          </div>

          <div className="flex gap-3 w-full">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft size={16} /> {t.back}
              </button>
            )}
            <button
              onClick={() => step < t.steps.length - 1 ? setStep(step + 1) : onClose()}
              className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {step === t.steps.length - 1 ? (
                <>
                  {t.finish} <CheckCircle2 size={16} />
                </>
              ) : (
                <>
                  {t.next} <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>

          <p className="mt-8 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">
            Precision Tutoring Experience • v1.2
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
