
// components/Tools.tsx

import React, { useState, useEffect } from 'react';
import { UserLevel, Quiz, QuizDifficulty, Language } from '../types';
import { 
  ClipboardCheck, RefreshCw, Trophy, Award, CheckCircle2, 
  XCircle, Info, ChevronRight, ArrowLeft, History, 
  BookOpen, AlertTriangle, 
  Lightbulb as LightbulbIcon, Maximize2, X, Target
} from 'lucide-react';
import { generateQuiz } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MathRenderer from './MathRenderer';

interface FocusAreaOption {
  label: string;
  color: string;
  inactiveColor: string;
}

interface ToolsPanelProps {
  level: UserLevel;
  subLevel: string | null;
  setLevel?: (level: UserLevel, subLevel?: string | null) => void;
  activeFocusAreas: string[];
  toggleFocusArea?: (label: string) => void;
  focusOptions?: FocusAreaOption[];
  language: Language;
}

const UI_TRANSLATIONS: Record<Language, Record<string, string>> = {
  BM: {
    quizCenter: 'Pusat Kuiz',
    setupTitle: 'APAKAH YANG INGIN ANDA PELAJARI?',
    setupSubtitle: 'Kuiz ringkas untuk',
    focusMode: 'Mod Tumpuan Aktif',
    focusDesc: 'Kuiz ini akan mengutamakan topik yang anda pilih di bar sisi.',
    customTopic: 'TOPIK TERSUAI (PILIHAN)',
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
    easy: 'MUDAH',
    medium: 'SEDERHANA',
    hard: 'SUKAR',
    adaptive: 'ADAPTIF',
    focusAreas: 'Kawasan Tumpuan',
    learningLevel: 'Tahap Pembelajaran',
    commonPitfalls: 'Perangkap Biasa',
    altMethods: 'Kaedah Alternatif',
    questionCount: 'BILANGAN SOALAN',
    questions: 'Soalan'
  },
  EN: {
    quizCenter: 'Quiz Center',
    setupTitle: 'WHAT DO YOU WANT TO LEARN?',
    setupSubtitle: 'Short quiz for',
    focusMode: 'Focus Mode Active',
    focusDesc: 'The quiz will prioritize the topics you selected in the sidebar.',
    customTopic: 'CUSTOM TOPIC (OPTIONAL)',
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
    easy: 'EASY',
    medium: 'MEDIUM',
    hard: 'HARD',
    adaptive: 'ADAPTIVE',
    focusAreas: 'Focus Areas',
    learningLevel: 'Learning Level',
    commonPitfalls: 'Common Pitfalls',
    altMethods: 'Alternative Methods',
    questionCount: 'NUMBER OF QUESTIONS',
    questions: 'Questions'
  }
};

const QuizMarkdownComponents: any = {
  p: ({ children }: any) => <div className="mb-2 leading-relaxed">{children}</div>,
  code: ({ children, inline, className }: any) => {
    const isMath = className?.includes('language-math');
    if (isMath && !inline) {
      return (
        <div className="my-3 flex justify-center">
          <MathRenderer latex={String(children).replace(/\n$/, '')} displayMode={true} />
        </div>
      );
    }
    return inline 
      ? <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[0.9em]">{children}</code>
      : <pre className="p-2 bg-slate-50 dark:bg-black/30 rounded-lg overflow-x-auto"><code>{children}</code></pre>
  },
  math: ({ value }: any) => <MathRenderer latex={value} displayMode={true} />,
  inlineMath: ({ value }: any) => <MathRenderer latex={value} displayMode={false} />
};

const OptionMarkdownComponents: any = {
  p: ({ children }: any) => <span className="leading-normal">{children}</span>,
  math: ({ value }: any) => <MathRenderer latex={value} displayMode={false} className="inline-block" />,
  inlineMath: ({ value }: any) => <MathRenderer latex={value} displayMode={false} />
};

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ level, subLevel, setLevel, activeFocusAreas, toggleFocusArea, focusOptions, language }) => {
  const t = UI_TRANSLATIONS[language];
  const [isEnlarged, setIsEnlarged] = useState(false);

  // Shared Quiz State
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<{ selected: number; isCorrect: boolean; explanation: string }[]>([]);
  const [quizState, setQuizState] = useState<'setup' | 'active' | 'review' | 'finished'>('setup');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Reset quiz if level or language changes
  useEffect(() => {
    setQuiz(null);
    setQuizState('setup');
    setTopic('');
  }, [level, language]);

  const handleGenerateQuiz = async () => {
    const effectiveTopic = topic || (activeFocusAreas.length > 0 ? activeFocusAreas.join(' and ') : 'General Math');
    
    setLoading(true);
    try {
      const q = await generateQuiz(effectiveTopic, level, language, difficulty, activeFocusAreas, questionCount);
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

  const quizProps = {
    level,
    subLevel,
    activeFocusAreas,
    focusOptions,
    language,
    topic,
    setTopic,
    difficulty,
    setDifficulty,
    questionCount,
    setQuestionCount,
    quiz,
    loading,
    currentIndex,
    score,
    results,
    quizState,
    setQuizState,
    selectedOption,
    setSelectedOption,
    isAnswered,
    handleGenerateQuiz,
    handleCheckAnswer,
    handleNextQuestion
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f172a] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
      
      <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e293b]/30 items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          <ClipboardCheck size={16} />
          {t.quizCenter}
        </div>
        <button 
          onClick={() => setIsEnlarged(true)}
          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-90"
          title="Enlarge Quiz Center"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0f172a]">
        <QuizCenter {...quizProps} />
      </div>

      {/* Enlarged Modal View */}
      {isEnlarged && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.quizCenter}</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Enhanced Mode</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEnlarged(false)}
                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all active:scale-95"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <QuizCenter {...quizProps} isEnlarged={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface QuizCenterProps {
  level: UserLevel;
  subLevel: string | null;
  activeFocusAreas: string[];
  focusOptions?: FocusAreaOption[];
  language: Language;
  topic: string;
  setTopic: (t: string) => void;
  difficulty: QuizDifficulty;
  setDifficulty: (d: QuizDifficulty) => void;
  questionCount: number;
  setQuestionCount: (c: number) => void;
  quiz: Quiz | null;
  loading: boolean;
  currentIndex: number;
  score: number;
  results: { selected: number; isCorrect: boolean; explanation: string }[];
  quizState: 'setup' | 'active' | 'review' | 'finished';
  setQuizState: (s: 'setup' | 'active' | 'review' | 'finished') => void;
  selectedOption: number | null;
  setSelectedOption: (o: number | null) => void;
  isAnswered: boolean;
  handleGenerateQuiz: () => void;
  handleCheckAnswer: () => void;
  handleNextQuestion: () => void;
  isEnlarged?: boolean;
}

const QuizCenter: React.FC<QuizCenterProps> = ({ 
  level, subLevel, activeFocusAreas, focusOptions, language,
  topic, setTopic, difficulty, setDifficulty, questionCount, setQuestionCount,
  quiz, loading, currentIndex, score, results, quizState, setQuizState,
  selectedOption, setSelectedOption, isAnswered,
  handleGenerateQuiz, handleCheckAnswer, handleNextQuestion,
  isEnlarged = false 
}) => {
  const t = UI_TRANSLATIONS[language];

  const getDifficultyColor = (d: QuizDifficulty) => {
    switch (d) {
      case 'easy': return 'bg-emerald-500 text-white shadow-emerald-500/20';
      case 'medium': return 'bg-amber-500 text-white shadow-amber-500/20';
      case 'hard': return 'bg-rose-500 text-white shadow-rose-500/20';
      case 'adaptive': return 'bg-purple-600 text-white shadow-purple-600/20';
      default: return 'bg-slate-500 text-white';
    }
  };

  if (quizState === 'setup') {
    const suggestions = {
      [UserLevel.INTERMEDIATE]: language === 'BM' ? ['Algebra', 'Segitiga', 'Kebarangkalian', 'Graf'] : ['Algebra', 'Triangles', 'Probability', 'Graphs'],
      [UserLevel.ADVANCED]: language === 'BM' ? ['Kalkulus', 'Aljabar Linear', 'Persamaan Perbezaan', 'Statistik'] : ['Calculus', 'Linear Algebra', 'Differential Equations', 'Statistics & Probability'],
      [UserLevel.OPENAI]: ['Number Theory', 'Teaching Math', 'Modern Proofs', 'Topology'],
    };

    const countOptions = [5, 10, 15, 20];

    return (
      <div className={`space-y-8 animate-in fade-in duration-500 bg-white dark:bg-[#0f172a] h-full ${isEnlarged ? 'p-10 md:p-16 max-w-4xl mx-auto' : 'p-6'}`}>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
             <BookOpen size={isEnlarged ? 24 : 16} strokeWidth={3} />
             <h3 className={`${isEnlarged ? 'text-2xl' : 'text-[12px]'} font-black uppercase tracking-widest`}>{t.setupTitle}</h3>
          </div>
          <p className={`${isEnlarged ? 'text-lg' : 'text-[11px]'} text-slate-500 font-bold`}>{t.setupSubtitle} {subLevel || level.split(' (')[0]}.</p>
        </div>

        {activeFocusAreas.length > 0 && (
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-3xl animate-in zoom-in-95 duration-500 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-md">
                <Target size={14} />
              </div>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{t.focusMode}</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-4 leading-tight opacity-80">{t.focusDesc}</p>
            <div className="flex flex-wrap gap-2">
              {activeFocusAreas.map((area) => {
                const opt = focusOptions?.find(o => o.label === area);
                return (
                  <span key={area} className={`px-3 py-1.5 rounded-xl text-[10px] font-black shadow-sm border ${opt ? opt.color : 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white border-indigo-100 dark:border-indigo-500'}`}>
                    {area}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className={`space-y-6 ${isEnlarged ? 'mt-12' : ''}`}>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">{t.customTopic}</span>
            <input
              type="text"
              placeholder={t.placeholder}
              className={`w-full bg-slate-50 dark:bg-[#1e293b] border-2 border-transparent rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 ${isEnlarged ? 'text-lg py-5 px-6' : 'text-sm'}`}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">{t.questionCount}</span>
            <div className={`grid gap-2 grid-cols-4`}>
              {countOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setQuestionCount(c)}
                  className={`px-3 py-2.5 rounded-xl font-black transition-all shadow-sm ${isEnlarged ? 'py-5 text-base' : 'text-[11px]'} ${
                    questionCount === c
                      ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                      : 'bg-slate-50 dark:bg-[#1e293b] text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2e3b4e]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid gap-3 ${isEnlarged ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {(['easy', 'medium', 'hard', 'adaptive'] as QuizDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg ${isEnlarged ? 'py-6 text-sm' : 'text-[10px]'} ${
                  difficulty === d
                    ? getDifficultyColor(d)
                    : 'bg-slate-50 dark:bg-[#1e293b] text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2e3b4e]'
                }`}
              >
                {t[d]}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{t.suggestions}</span>
            <div className="flex flex-wrap gap-2">
              {suggestions[level]?.map((s) => (
                <button
                  key={s}
                  onClick={() => setTopic(s)}
                  className={`bg-slate-50 dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:text-indigo-600 transition-all ${isEnlarged ? 'px-6 py-4 text-sm' : 'px-3 py-2 text-[10px]'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerateQuiz}
            disabled={loading || (!topic && activeFocusAreas.length === 0)}
            className={`w-full bg-indigo-600 dark:bg-[#4338ca] text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 mt-4 ${isEnlarged ? 'py-8 text-xl' : 'py-5 text-[12px]'}`}
          >
            {loading ? <RefreshCw size={isEnlarged ? 28 : 18} className="animate-spin" /> : <ClipboardCheck size={isEnlarged ? 28 : 18} />}
            {t.startQuiz}
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'active' && quiz) {
    const q = quiz.questions[currentIndex];
    
    return (
      <div className={`space-y-6 animate-in slide-in-from-right-4 duration-300 bg-white dark:bg-[#0f172a] h-full ${isEnlarged ? 'p-10 md:p-16 max-w-5xl mx-auto' : 'p-6'}`}>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className={`${isEnlarged ? 'text-lg' : 'text-[10px]'} font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]`}>{t.inProgress}</h4>
            <p className={`${isEnlarged ? 'text-base' : 'text-xs'} font-bold text-slate-500`}>{t.question} {currentIndex + 1} of {quiz.questions.length}</p>
            {activeFocusAreas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activeFocusAreas.map(area => (
                  <span key={area} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md text-[8px] font-black uppercase tracking-tighter border border-indigo-100 dark:border-indigo-800">
                    {area}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className={`${isEnlarged ? 'text-3xl' : 'text-sm'} font-black text-slate-900 dark:text-white`}>{score}/{quiz.questions.length}</div>
            <div className={`${isEnlarged ? 'text-xs' : 'text-[9px]'} font-bold text-slate-400 dark:text-slate-500 uppercase`}>{t.correct}</div>
          </div>
        </div>

        <div className={`w-full bg-slate-100 dark:bg-[#1e293b] rounded-full overflow-hidden ${isEnlarged ? 'h-3' : 'h-1.5'}`}>
          <div 
            className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(99,102,241,0.5)]"
            style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / quiz.questions.length) * 100}%` }}
          />
        </div>

        <div className={`bg-slate-50 dark:bg-[#1e293b]/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm ${isEnlarged ? 'p-10' : 'p-5'}`}>
          <div className={`text-slate-800 dark:text-slate-200 font-bold leading-relaxed prose dark:prose-invert max-w-none ${isEnlarged ? 'text-2xl prose-xl' : 'text-[14px] prose-sm'}`}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={QuizMarkdownComponents}>{q.question}</ReactMarkdown>
          </div>
        </div>

        <div className={`grid gap-3 ${isEnlarged ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {q.options.map((opt, i) => {
            let statusClass = 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300';
            let checkIcon = null;

            if (isAnswered) {
              if (i === q.correctAnswerIndex) {
                statusClass = 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400';
                checkIcon = <CheckCircle2 size={isEnlarged ? 24 : 16} />;
              } else if (i === selectedOption) {
                statusClass = 'border-red-400 bg-red-50/10 dark:bg-red-900/10 text-red-500 dark:text-red-400';
                checkIcon = <XCircle size={isEnlarged ? 24 : 16} />;
              } else {
                statusClass = 'border-slate-100 dark:border-slate-800 opacity-50 text-slate-300 dark:text-slate-600';
              }
            } else if (selectedOption === i) {
              statusClass = 'border-indigo-600 bg-indigo-50/10 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300';
            }

            return (
              <button
                key={i}
                onClick={() => !isAnswered && setSelectedOption(i)}
                disabled={isAnswered}
                className={`group text-left rounded-xl border-2 transition-all flex items-center gap-3 relative overflow-hidden shadow-sm ${statusClass} ${isEnlarged ? 'p-8 min-h-[100px]' : 'p-4 min-h-[56px]'}`}
              >
                <span className={`rounded-lg flex-shrink-0 flex items-center justify-center font-black transition-colors shadow-sm ${isEnlarged ? 'w-10 h-10 text-lg' : 'w-7 h-7 text-[10px]'} ${
                  selectedOption === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-[#1e293b] text-slate-400'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <div className={`flex-1 font-medium leading-normal dark:prose-invert ${isEnlarged ? 'text-xl' : 'text-[13px] prose-xs'}`}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]} 
                    components={OptionMarkdownComponents}
                  >
                    {opt.includes('\\') && !opt.includes('$') ? `$${opt}$` : opt}
                  </ReactMarkdown>
                </div>
                {checkIcon}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="animate-in fade-in slide-in-from-top-2 space-y-4 overflow-hidden">
            <div className={`bg-indigo-50/10 dark:bg-indigo-900/10 rounded-2xl border-l-4 border-indigo-600 text-slate-600 dark:text-slate-300 shadow-sm ${isEnlarged ? 'p-8' : 'p-4'}`}>
               <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                  <Info size={isEnlarged ? 20 : 14} />
                  <span className={`${isEnlarged ? 'text-sm' : 'text-[10px]'} font-black uppercase tracking-widest`}>{t.explanation}</span>
               </div>
               <div className={`leading-relaxed dark:prose-invert max-w-full overflow-x-auto ${isEnlarged ? 'text-xl' : 'text-[12px] prose prose-xs'}`}>
                 <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={QuizMarkdownComponents}>{q.explanation}</ReactMarkdown>
               </div>

               {q.pitfalls && (
                 <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={isEnlarged ? 20 : 14} />
                      <span className={`${isEnlarged ? 'text-sm' : 'text-[10px]'} font-black uppercase tracking-widest`}>{t.commonPitfalls}</span>
                    </div>
                    <div className={`leading-relaxed dark:prose-invert italic ${isEnlarged ? 'text-lg' : 'text-[12px] prose prose-xs'}`}>
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={QuizMarkdownComponents}>{q.pitfalls}</ReactMarkdown>
                    </div>
                 </div>
               )}

               {q.alternatives && (
                 <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                      <LightbulbIcon size={isEnlarged ? 20 : 14} />
                      <span className={`${isEnlarged ? 'text-sm' : 'text-[10px]'} font-black uppercase tracking-widest`}>{t.altMethods}</span>
                    </div>
                    <div className={`leading-relaxed dark:prose-invert ${isEnlarged ? 'text-lg' : 'text-[12px] prose prose-xs'}`}>
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={QuizMarkdownComponents}>{q.alternatives}</ReactMarkdown>
                    </div>
                 </div>
               )}
            </div>
            <button
              onClick={handleNextQuestion}
              className={`w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg ${isEnlarged ? 'py-8 text-xl' : 'py-4 text-sm'}`}
            >
              {currentIndex + 1 === quiz.questions.length ? t.finalScore : t.next}
              <ChevronRight size={isEnlarged ? 24 : 18} />
            </button>
          </div>
        )}

        {!isAnswered && (
          <button
            onClick={handleCheckAnswer}
            disabled={selectedOption === null}
            className={`w-full bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:grayscale shadow-xl shadow-indigo-500/10 ${isEnlarged ? 'py-8 text-xl' : 'py-4 text-sm'}`}
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
      <div className={`flex flex-col items-center text-center animate-in zoom-in-95 duration-500 bg-white dark:bg-[#0f172a] h-full ${isEnlarged ? 'p-20 max-w-4xl mx-auto' : 'p-8 space-y-8'}`}>
        <div className="relative pt-6">
          <div className={`${isEnlarged ? 'w-48 h-48' : 'w-28 h-28'} rounded-full bg-slate-50 dark:bg-[#1e293b] flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner relative border-2 border-indigo-100 dark:border-indigo-900/50`}>
             <Trophy size={isEnlarged ? 84 : 56} className={`${performance >= 80 ? 'animate-bounce' : ''}`} />
             <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin-slow opacity-20" />
          </div>
          <div className={`absolute top-4 -right-2 bg-amber-400 text-white rounded-full shadow-xl border-2 border-white dark:border-slate-950 ${isEnlarged ? 'p-4' : 'p-2'}`}>
            <Award size={isEnlarged ? 32 : 20} />
          </div>
        </div>

        <div className={`space-y-2 ${isEnlarged ? 'mt-10 mb-10' : ''}`}>
          <h3 className={`${isEnlarged ? 'text-5xl' : 'text-2xl'} font-black text-slate-900 dark:text-white tracking-tight`}>{language === 'BM' ? 'Kuiz Selesai!' : 'Quiz Finished!'}</h3>
          <p className={`${isEnlarged ? 'text-lg' : 'text-xs'} font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest`}>{quiz.title}</p>
          {activeFocusAreas.length > 0 && (
             <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                {activeFocusAreas.map(area => (
                  <span key={area} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black border border-indigo-100 dark:border-indigo-800">
                    {area}
                  </span>
                ))}
             </div>
          )}
        </div>

        <div className={`grid grid-cols-2 gap-4 w-full ${isEnlarged ? 'mb-12' : ''}`}>
           <div className={`bg-slate-50 dark:bg-[#1e293b]/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-sm ${isEnlarged ? 'p-10' : 'p-4'}`}>
             <div className={`${isEnlarged ? 'text-5xl' : 'text-2xl'} font-black text-slate-900 dark:text-white`}>{score}/{quiz.questions.length}</div>
             <div className={`${isEnlarged ? 'text-sm' : 'text-[9px]'} font-black text-slate-400 uppercase tracking-widest mt-1`}>{t.score}</div>
           </div>
           <div className={`bg-slate-50 dark:bg-[#1e293b]/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center shadow-sm ${isEnlarged ? 'p-10' : 'p-4'}`}>
             <div className={`${isEnlarged ? 'text-5xl' : 'text-2xl'} font-black text-slate-900 dark:text-white`}>{Math.round(performance)}%</div>
             <div className={`${isEnlarged ? 'text-sm' : 'text-[9px]'} font-black text-slate-400 uppercase tracking-widest mt-1`}>{t.result}</div>
           </div>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={() => setQuizState('review')}
            className={`w-full bg-slate-100 dark:bg-[#1e293b] text-slate-900 dark:text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98] shadow-sm border border-slate-200 dark:border-slate-700 ${isEnlarged ? 'py-8 text-xl' : 'py-4 text-sm'}`}
          >
            <History size={isEnlarged ? 24 : 18} />
            {t.seeAnswers}
          </button>
          <button
            onClick={() => setQuizState('setup')}
            className={`w-full bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/10 active:scale-[0.98] ${isEnlarged ? 'py-8 text-xl' : 'py-4 text-sm'}`}
          >
            {t.tryAnother}
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'review' && quiz) {
    return (
      <div className={`animate-in slide-in-from-left-4 duration-300 h-full flex flex-col bg-white dark:bg-[#0f172a] ${isEnlarged ? 'p-10 md:p-16 max-w-5xl mx-auto' : 'p-6 space-y-6'}`}>
        <div className="flex items-center justify-between mb-8">
           <button 
             onClick={() => setQuizState('finished')}
             className={`rounded-xl bg-slate-100 dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 hover:scale-105 transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm ${isEnlarged ? 'p-4' : 'p-2.5'}`}
           >
             <ArrowLeft size={isEnlarged ? 28 : 20} />
           </button>
           <h3 className={`${isEnlarged ? 'text-2xl' : 'text-xs'} font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]`}>{t.reviewTitle}</h3>
           <div className={isEnlarged ? 'w-16' : 'w-9'} />
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar">
           {quiz.questions.map((q, i) => {
             const result = results[i];
             return (
               <div key={i} className={`rounded-2xl bg-slate-50 dark:bg-[#1e293b]/30 border border-slate-100 dark:border-slate-800 shadow-sm ${isEnlarged ? 'p-10' : 'p-4 space-y-3'}`}>
                 <div className="flex items-center justify-between mb-4">
                    <span className={`${isEnlarged ? 'text-sm' : 'text-[10px]'} font-black text-slate-400 dark:text-slate-600 uppercase`}>{t.question} {i+1}</span>
                    {result?.isCorrect ? (
                      <span className={`flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-500 uppercase ${isEnlarged ? 'text-lg' : 'text-[9px]'}`}><CheckCircle2 size={isEnlarged ? 20 : 10} /> {t.correct}</span>
                    ) : (
                      <span className={`flex items-center gap-1 font-black text-red-500 dark:text-red-400 uppercase ${isEnlarged ? 'text-lg' : 'text-[9px]'}`}><XCircle size={20} /> {t.wrong}</span>
                    )}
                 </div>
                 <div className={`font-bold text-slate-800 dark:text-slate-200 dark:prose-invert mb-6 ${isEnlarged ? 'text-2xl prose-xl' : 'text-[13px] prose-xs'}`}>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={QuizMarkdownComponents}>{q.question}</ReactMarkdown>
                 </div>
                 <div className={`rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 leading-relaxed text-slate-700 dark:text-slate-400 dark:prose-invert ${isEnlarged ? 'p-8 text-xl' : 'p-3 text-[11px] prose-xs'}`}>
                    <div className={`font-black text-indigo-600 dark:text-indigo-400 uppercase mb-1 tracking-widest ${isEnlarged ? 'text-xs' : 'text-[9px]'}`}>{t.howItWorks}</div>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={QuizMarkdownComponents}>{q.explanation}</ReactMarkdown>
                 </div>
                 
                 {q.pitfalls && (
                   <div className={`mt-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 ${isEnlarged ? 'p-8' : 'p-3'}`}>
                      <div className={`font-black text-amber-700 dark:text-amber-400 uppercase mb-1 tracking-widest flex items-center gap-1 ${isEnlarged ? 'text-xs' : 'text-[9px]'}`}><AlertTriangle size={isEnlarged ? 16 : 10} /> {t.commonPitfalls}</div>
                      <div className={`text-slate-600 dark:text-slate-400 italic ${isEnlarged ? 'text-lg' : 'text-[11px]'}`}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={QuizMarkdownComponents}>{q.pitfalls}</ReactMarkdown>
                      </div>
                   </div>
                 )}
               </div>
             );
           })}
        </div>

        <button
          onClick={() => setQuizState('setup')}
          className={`w-full bg-indigo-600 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98] ${isEnlarged ? 'py-8 text-xl' : 'py-4'}`}
        >
          {t.tryAnother}
        </button>
      </div>
    );
  }

  return null;
};