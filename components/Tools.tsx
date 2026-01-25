
import React, { useState, useEffect } from 'react';
import { UserLevel, Quiz, QuizQuestion, QuizDifficulty, Language } from '../types';
import { ClipboardCheck, RefreshCw, Trophy, Award, CheckCircle2, XCircle, Info, ChevronRight, ArrowLeft, History, BookOpen, Sparkles } from 'lucide-react';
import { generateQuiz } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface ToolsPanelProps {
  level: UserLevel;
  activeFocusAreas: string[];
  language: Language;
}

const UI_TRANSLATIONS: Record<Language, Record<string, string>> = {
  BM: {
    quizCenter: 'Pusat Kuiz',
    setupTitle: 'Apakah yang ingin anda pelajari?',
    setupSubtitle: 'Kuiz ringkas untuk level',
    focusMode: 'Mod Tumpuan Aktif',
    focusDesc: 'Kuiz ini hanya akan mengandungi soalan dari bahagian ini.',
    customTopic: 'Topik Tersuai (Pilihan)',
    placeholder: 'cth. Pecahan...',
    refine: 'Perhalusi kuiz anda...',
    suggestions: 'Cadangan',
    startQuiz: 'Mula Kuiz',
    startFocusQuiz: 'Mula Kuiz Tumpuan',
    inProgress: 'Kuiz Sedang Berlangsung',
    question: 'Soalan',
    correct: 'Betul',
    explanation: 'Penjelasan',
    howItWorks: 'Cara Kerja',
    score: 'Skor',
    result: 'Keputusan',
    seeAnswers: 'Lihat Jawapan',
    tryAnother: 'Cuba Kuiz Lain',
    reviewTitle: 'Semak Jawapan',
    wrong: 'Salah',
    submit: 'Hantar Jawapan',
    next: 'Soalan Seterusnya',
    finalScore: 'Lihat Skor Akhir',
    easy: 'Mudah',
    medium: 'Sederhana',
    hard: 'Sukar',
    adaptive: 'Adaptif'
  },
  EN: {
    quizCenter: 'Quiz Center',
    setupTitle: 'What do you want to learn?',
    setupSubtitle: 'Short quiz for',
    focusMode: 'Focus Mode Active',
    focusDesc: 'The quiz will only contain questions about these areas.',
    customTopic: 'Custom Topic (Optional)',
    placeholder: 'e.g. Fractions...',
    refine: 'Refine your quiz...',
    suggestions: 'Suggestions',
    startQuiz: 'Start Quiz',
    startFocusQuiz: 'Start Focus Quiz',
    inProgress: 'Quiz in Progress',
    question: 'Question',
    correct: 'Correct',
    explanation: 'Explanation',
    howItWorks: 'How it works',
    score: 'Score',
    result: 'Result',
    seeAnswers: 'See Answers',
    tryAnother: 'Try Another Quiz',
    reviewTitle: 'Review Answers',
    wrong: 'Wrong',
    submit: 'Submit Answer',
    next: 'Next Question',
    finalScore: 'See Final Score',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    adaptive: 'Adaptive'
  }
};

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ level, activeFocusAreas, language }) => {
  const t = UI_TRANSLATIONS[language];
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <div className="flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400">
          <ClipboardCheck size={18} />
          {t.quizCenter}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <QuizCenter level={level} activeFocusAreas={activeFocusAreas} language={language} />
      </div>
    </div>
  );
};

const QuizCenter: React.FC<{ level: UserLevel; activeFocusAreas: string[]; language: Language }> = ({ level, activeFocusAreas, language }) => {
  const t = UI_TRANSLATIONS[language];
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<{ selected: number; isCorrect: boolean; explanation: string }[]>([]);
  const [quizState, setQuizState] = useState<'setup' | 'active' | 'review' | 'finished'>('setup');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    setQuiz(null);
    setQuizState('setup');
    setTopic('');
  }, [level, language]);

  const handleGenerateQuiz = async () => {
    const effectiveTopic = topic || (activeFocusAreas.length > 0 ? activeFocusAreas.join(' and ') : 'General Math');
    
    setLoading(true);
    try {
      const q = await generateQuiz(effectiveTopic, level, language, difficulty, activeFocusAreas);
      setQuiz(q);
      setCurrentIndex(0);
      setScore(0);
      setResults([]);
      setQuizState('active');
      setIsAnswered(false);
      setSelectedOption(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || !quiz) return;
    const currentQuestion = quiz.questions[currentIndex];
    const isCorrect = selectedOption === currentQuestion.correctAnswerIndex;
    
    const newResults = [...results, { 
      selected: selectedOption, 
      isCorrect, 
      explanation: currentQuestion.explanation 
    }];
    setResults(newResults);
    if (isCorrect) setScore(score + 1);
    setIsAnswered(true);
  };

  const handleNextQuestion = () => {
    if (!quiz) return;
    if (currentIndex + 1 < quiz.questions.length) {
      setCurrentIndex(currentIndex + 1);
      setIsAnswered(false);
      setSelectedOption(null);
    } else {
      setQuizState('finished');
    }
  };

  const getDifficultyColor = (d: QuizDifficulty) => {
    switch (d) {
      case 'easy': return 'bg-emerald-600';
      case 'medium': return 'bg-amber-500';
      case 'hard': return 'bg-rose-600';
      case 'adaptive': return 'bg-indigo-600';
      default: return 'bg-indigo-600';
    }
  };

  if (quizState === 'setup') {
    const suggestions = {
      [UserLevel.BEGINNER]: language === 'BM' ? ['Sifir', 'Bentuk', 'Tambah', 'Wang'] : ['Times Tables', 'Shapes', 'Addition', 'Money'],
      [UserLevel.INTERMEDIATE]: language === 'BM' ? ['Algebra', 'Segitiga', 'Kebarangkalian', 'Graf'] : ['Algebra', 'Triangles', 'Probability', 'Graphs'],
      [UserLevel.ADVANCED]: ['Calculus', 'Matrices', 'Vectors', 'Complex Numbers'],
      [UserLevel.OPENAI]: ['Number Theory', 'Teaching Math', 'Modern Proofs', 'Topology'],
    };

    return (
      <div className="p-5 space-y-6 animate-in fade-in duration-500">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <BookOpen size={14} className="text-indigo-600" /> {t.setupTitle}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.setupSubtitle} {level.split(' (')[0]}.</p>
        </div>

        {activeFocusAreas.length > 0 && (
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest">{t.focusMode}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeFocusAreas.map(area => (
                <span key={area} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded text-[9px] font-bold">
                  {area}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic">{t.focusDesc}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.customTopic}</span>
            <input
              type="text"
              placeholder={activeFocusAreas.length > 0 ? t.refine : t.placeholder}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['easy', 'medium', 'hard', 'adaptive'] as QuizDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                  difficulty === d
                    ? `${getDifficultyColor(d)} text-white border-transparent shadow-md`
                    : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-indigo-300'
                }`}
              >
                {t[d]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.suggestions}</span>
            <div className="flex flex-wrap gap-2">
              {suggestions[level]?.map((s) => (
                <button
                  key={s}
                  onClick={() => setTopic(s)}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-500 dark:text-slate-400 hover:text-indigo-600 text-[10px] font-bold rounded-md transition-all border border-transparent hover:border-indigo-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerateQuiz}
            disabled={loading || (!topic && activeFocusAreas.length === 0)}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <ClipboardCheck size={18} />}
            {activeFocusAreas.length > 0 ? t.startFocusQuiz : t.startQuiz}
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'active' && quiz) {
    const q = quiz.questions[currentIndex];
    
    return (
      <div className="p-5 space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">{t.inProgress}</h4>
            <p className="text-xs font-bold text-slate-400">{t.question} {currentIndex + 1} {language === 'BM' ? 'daripada' : 'of'} {quiz.questions.length}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-slate-900 dark:text-white">{score}/{quiz.questions.length}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">{t.correct}</div>
          </div>
        </div>

        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(99,102,241,0.5)]"
            style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / quiz.questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="text-slate-800 dark:text-slate-200 font-bold leading-relaxed prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.question}</ReactMarkdown>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {q.options.map((opt, i) => {
            let statusClass = 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300';
            let checkIcon = null;

            if (isAnswered) {
              if (i === q.correctAnswerIndex) {
                statusClass = 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400';
                checkIcon = <CheckCircle2 size={16} />;
              } else if (i === selectedOption) {
                statusClass = 'border-red-400 bg-red-50/30 dark:bg-red-900/10 text-red-500 dark:text-red-400';
                checkIcon = <XCircle size={16} />;
              } else {
                statusClass = 'border-slate-100 dark:border-slate-800 opacity-50 text-slate-300 dark:text-slate-600';
              }
            } else if (selectedOption === i) {
              statusClass = 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300';
            }

            return (
              <button
                key={i}
                onClick={() => !isAnswered && setSelectedOption(i)}
                disabled={isAnswered}
                className={`group text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 relative overflow-hidden ${statusClass}`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors shadow-sm ${
                  selectedOption === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <div className="flex-1 text-[13px] font-medium leading-normal prose-xs dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                </div>
                {checkIcon}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
            <div className="p-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border-l-4 border-indigo-600 text-slate-600 dark:text-slate-300">
               <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                  <Info size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t.explanation}</span>
               </div>
               <div className="text-[12px] leading-relaxed prose prose-xs dark:prose-invert">
                 <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.explanation}</ReactMarkdown>
               </div>
            </div>
            <button
              onClick={handleNextQuestion}
              className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
            >
              {currentIndex + 1 === quiz.questions.length ? t.finalScore : t.next}
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {!isAnswered && (
          <button
            onClick={handleCheckAnswer}
            disabled={selectedOption === null}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:grayscale"
          >
            {t.submit}
          </button>
        )}
      </div>
    );
  }

  if (quizState === 'finished' && quiz) {
    const performance = (score / quiz.questions.length) * 100;
    
    return (
      <div className="p-5 space-y-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
        <div className="relative pt-6">
          <div className="w-28 h-28 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner relative border-2 border-indigo-100 dark:border-indigo-900/50">
             <Trophy size={56} className={`${performance >= 80 ? 'animate-bounce' : ''}`} />
             <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin-slow opacity-20" />
          </div>
          <div className="absolute top-4 -right-2 bg-amber-400 text-white rounded-full p-2 shadow-xl border-2 border-white dark:border-slate-900">
            <Award size={20} />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{language === 'BM' ? 'Kuiz Selesai!' : 'Quiz Finished!'}</h3>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{quiz.title}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
           <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
             <div className="text-2xl font-black text-slate-900 dark:text-white">{score}/{quiz.questions.length}</div>
             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{t.score}</div>
           </div>
           <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
             <div className="text-2xl font-black text-slate-900 dark:text-white">{Math.round(performance)}%</div>
             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{t.result}</div>
           </div>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={() => setQuizState('review')}
            className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
          >
            <History size={18} />
            {t.seeAnswers}
          </button>
          <button
            onClick={() => setQuizState('setup')}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/10 active:scale-[0.98]"
          >
            {t.tryAnother}
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'review' && quiz) {
    return (
      <div className="p-5 space-y-6 animate-in slide-in-from-left-4 duration-300 h-full flex flex-col">
        <div className="flex items-center justify-between">
           <button 
             onClick={() => setQuizState('finished')}
             className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:scale-105 transition-all"
           >
             <ArrowLeft size={18} />
           </button>
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t.reviewTitle}</h3>
           <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar">
           {quiz.questions.map((q, i) => {
             const result = results[i];
             return (
               <div key={i} className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase">{t.question} {i+1}</span>
                    {result?.isCorrect ? (
                      <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase"><CheckCircle2 size={10} /> {t.correct}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-black text-red-400 uppercase"><XCircle size={10} /> {t.wrong}</span>
                    )}
                 </div>
                 <div className="text-[13px] font-bold text-slate-800 dark:text-slate-200 prose-xs dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.question}</ReactMarkdown>
                 </div>
                 <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/20 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 prose-xs dark:prose-invert">
                    <div className="font-black text-indigo-600 dark:text-indigo-400 uppercase text-[9px] mb-1 tracking-widest">{t.howItWorks}</div>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.explanation}</ReactMarkdown>
                 </div>
               </div>
             );
           })}
        </div>

        <button
          onClick={() => setQuizState('setup')}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
        >
          {t.tryAnother}
        </button>
      </div>
    );
  }

  return null;
};
