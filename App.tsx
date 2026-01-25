
// App.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserLevel, Message, FileAttachment, ChatMode, ImageSize, Citation, Language, Toast as ToastType } from './types';
import Header from './components/Header';
import HomeScreen from './components/HomeScreen';
import ChatInterface from './components/ChatInterface';
import { ToolsPanel } from './components/Tools';
import NavigationDrawer from './components/NavigationDrawer';
import AuthScreen from './components/AuthScreen';
import SettingsView from './components/SettingsView';
import FeedbackModal from './components/FeedbackModal';
import QuickNotesView from './components/QuickNotesView';
import Toast from './components/Toast';
import { solveMathProblem, generateIllustration } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, ChevronLeft, ChevronRight, WifiOff } from 'lucide-react';

interface FocusArea {
  label: string;
  color: string;
  inactiveColor: string;
}

const LEVEL_COLORS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-rose-600',
  'bg-amber-600', 'bg-indigo-600', 'bg-cyan-600', 'bg-violet-600'
];

const PRIMARY_TRANSLATIONS: Record<string, string> = {
  'Whole Numbers (1 - 100)': 'Nombor Bulat (1 - 100)',
  'Basic Operations': 'Operasi Asas',
  'Fractions': 'Pecahan',
  'Money': 'Wang',
  'Time': 'Masa',
  'Measurement': 'Ukuran dan Sukatan',
  'Space': 'Ruang',
  'Data Management': 'Pengurusan Data',
  'Whole Numbers': 'Nombor Bulat',
  'Whole Numbers up to 1000': 'Nombor Bulat hingga 1000',
  'Fractions and Decimals': 'Pecahan dan Perpuluhan',
  'Whole Numbers up to 10000': 'Nombor Bulat hingga 10000',
  'Fractions, Decimals and Percentages': 'Pecahan, Perpuluhan dan Peratus',
  'Coordinates': 'Koordinat',
  'Numbers and Operations': 'Nombor dan Operasi',
  'Fractions, Decimals And Percentages': 'Pecahan, Perpuluhan Dan Peratus',
  'Coordinates, Ratio And Proportion': 'Koordinat, Nisbah Dan Kadaran',
  'Data Handling': 'Pengendalian Data',
  'Whole Numbers and Operations': 'Nombor Bulat dan Operasi',
  'Coordinates, Ratio and Proportions': 'Koordinat, Nisbah dan Kadaran',
  'Whole Numbers and Basic Operations': 'Nombor Bulat dan Operasi Asas',
  'Data Handling and Likelihood': 'Pengendalian Data dan Kebarangkalian'
};

const KSSM_INTERMEDIATE_DATA: Record<string, { EN: string[], BM: string[] }> = {
  'Form 1': {
    EN: ['Rational Numbers', 'Factors & Multiples', 'Squares, Roots, Cubes', 'Ratios, Rates & Proportions', 'Algebraic Expressions', 'Linear Equations', 'Geometry & Area', 'Data Handling'],
    BM: ['Nombor Rasional', 'Faktor & Gandaan', 'Kuasa Dua, Punca Kuasa Dua, Kuasa Tiga & Punca Kuasa Tiga', 'Nisbah, Kadar & Perkadaran', 'Ungkapan Algebra', 'Persamaan Linear', 'Geometri & Luas', 'Pengendalian Data']
  },
  'Form 2': {
    EN: ['Patterns and Sequences', 'Factorisation & Fractions', 'Algebraic Formulae', 'Polygons', 'Circles', '3D Geometry', 'Coordinate Geometry', 'Graphs and Functions', 'Motion (Speed/Acc.)', 'Gradient', 'Transformations', 'Central Tendency', 'Simple Probability'],
    BM: ['Pola dan Jujukan', 'Pemfaktoran & Pecahan Algebra', 'Rumus Algebra', 'Poligon', 'Bulatan', 'Geometri Tiga Dimensi', 'Geometri Koordinat', 'Graf Fungsi', 'Laju dan Pecutan', 'Kecerunan Garis Lurus', 'Transformasi Isometri', 'Sukatan Kecenderungan Memusat', 'Kebarangkalian Mudah']
  },
  'Form 3': {
    EN: ['Indices', 'Standard Form', 'Consumer Math (Savings)', 'Scaled Drawings', 'Trigonometric Ratios', 'Angles & Tangents', 'Angles & Tangents', 'Plans & Elevations', 'Locus in 2D', 'Straight Lines'],
    BM: ['Indeks', 'Bentuk Piawai', 'Matematik Pengguna: Simpanan...', 'Lukisan Berskala', 'Nisbah Trigonometri', 'Sudut & Tangen dalam Bulatan', 'Pelan & Dongakan', 'Lokus dalam Dua Dimensi', 'Garis Lurus']
  },
  'Form 4': {
    EN: ['Quadratic Functions', 'Number Fundamentals', 'Logical Reasoning', 'Set Operations', 'Graph Theory', 'Linear Inequalities', 'Motion Graphs', 'Dispersion (Ungrouped)', 'Combined Probability', 'Consumer Math (Finance)'],
    BM: ['Fungsi & Persamaan Kuadratik', 'Asas Nombor', 'Penaakulan Logik', 'Operasi Set', 'Rangkaian dalam Teori Graf', 'Ketaksamaan Linear', 'Graf Gerakan', 'Sukatan Serakan Data Tak Terkumpul', 'Kebarangkalian Peristiwa Bergabung', 'Matematik Pengguna: Pengurusan Kewangan']
  },
  'Form 5': {
    EN: ['Variation', 'Matrices', 'Consumer Math (Insurance)', 'Consumer Math (Taxation)', 'Congruency & Enlargement', 'Trig Functions & Graphs', 'Dispersion (Grouped)', 'Mathematical Modelling'],
    BM: ['Ubahan', 'Matriks', 'Matematik Pengguna: Insurans', 'Matematik Pengguna: Percukaian', 'Kesebangunan, Pembesaran...', 'Nisbah dan Graf Fungsi Trigonometri', 'Sukatan Serakan Data Terkumpul', 'Pemodelan Matematik']
  }
};

const LEVEL_FOCUS_MAP: Record<UserLevel, FocusArea[]> = {
  [UserLevel.BEGINNER]: [
    { label: 'Whole Numbers (1 - 100)', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Basic Operations', color: 'bg-blue-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Fractions', color: 'bg-purple-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Money', color: 'bg-rose-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Time', color: 'bg-amber-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Measurement', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Space', color: 'bg-indigo-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Data Management', color: 'bg-cyan-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
  ],
  [UserLevel.INTERMEDIATE]: [], // Handled by KSSM_INTERMEDIATE_DATA and language toggle
  [UserLevel.ADVANCED]: [
    { label: 'Calculus', color: 'bg-rose-600 text-white', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Linear Algebra', color: 'bg-indigo-600 text-white', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Differential Eq.', color: 'bg-amber-600 text-white', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Discrete Math', color: 'bg-emerald-600 text-white', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
  ],
  [UserLevel.OPENAI]: []
};

const SUB_LEVEL_FOCUS_MAP: Record<string, FocusArea[]> = {
  'Standard 1': [
    { label: 'Whole Numbers', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Basic Operations', color: 'bg-blue-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Fractions', color: 'bg-purple-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Money', color: 'bg-rose-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Time', color: 'bg-amber-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Measurement', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Space', color: 'bg-indigo-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Data Management', color: 'bg-cyan-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
  ],
  'Standard 2': [
    { label: 'Whole Numbers up to 1000', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Basic Operations', color: 'bg-blue-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Fractions and Decimals', color: 'bg-purple-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Money', color: 'bg-rose-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Time', color: 'bg-amber-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Measurement', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Space', color: 'bg-indigo-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Data Management', color: 'bg-cyan-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
  ],
  'Standard 3': [
    { label: 'Whole Numbers up to 10000', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Basic Operations', color: 'bg-blue-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Fractions, Decimals and Percentages', color: 'bg-purple-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Money', color: 'bg-rose-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Time', color: 'bg-amber-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Measurement', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Space', color: 'bg-indigo-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Coordinates', color: 'bg-violet-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Data Management', color: 'bg-cyan-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
  ],
  'Standard 4': [
    { label: 'Numbers and Operations', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Fractions, Decimals And Percentages', color: 'bg-blue-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Money', color: 'bg-rose-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Time', color: 'bg-amber-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Measurement', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Space', color: 'bg-indigo-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Coordinates, Ratio And Proportion', color: 'bg-violet-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Data Handling', color: 'bg-cyan-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
  ],
  'Standard 5': [
    { label: 'Numbers and Operations', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Whole Numbers and Operations', color: 'bg-teal-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Fractions, Decimals and Percentages', color: 'bg-blue-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Money', color: 'bg-rose-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Time', color: 'bg-amber-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Measurement', color: 'bg-lime-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Space', color: 'bg-indigo-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Coordinates, Ratio and Proportions', color: 'bg-violet-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Data Handling', color: 'bg-cyan-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
  ],
  'Standard 6': [
    { label: 'Whole Numbers and Basic Operations', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Fractions, Decimals And Percentages', color: 'bg-blue-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Money', color: 'bg-rose-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Time', color: 'bg-amber-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Measurement', color: 'bg-lime-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Space', color: 'bg-indigo-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Coordinates, Ratio And Proportion', color: 'bg-violet-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Data Handling and Likelihood', color: 'bg-cyan-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
  ],
  'Essential Mathematics': [
    { label: 'Fundamentals Of Algebra', color: 'bg-indigo-600 text-white', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Functions And Graphs', color: 'bg-violet-600 text-white', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Matrices', color: 'bg-blue-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Sequence and Series', color: 'bg-emerald-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Derivative', color: 'bg-amber-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
    { label: 'Integration', color: 'bg-rose-600 text-white shadow-sm', inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
  ],
};

interface User {
  name: string;
  email: string;
  pfp: string;
}

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'app' | 'settings' | 'quicknotes'>('home');
  const [settingsTab, setSettingsTab] = useState<'account' | 'preferences'>('preferences');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [language, setLanguage] = useState<Language>('EN');
  const [level, setLevel] = useState<UserLevel>(UserLevel.INTERMEDIATE);
  const [subLevel, setSubLevel] = useState<string | null>('Form 1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFocusMinimized, setIsFocusMinimized] = useState(false);
  const [socraticEnabled, setSocraticEnabled] = useState(true);
  const [reasoningMode, setReasoningMode] = useState<'fast' | 'deep'>('deep');
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  const [pendingProblem, setPendingProblem] = useState<{text: string; attachment?: FileAttachment} | null>(null);

  // Connectivity monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast("Connection restored.", 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast("You are currently offline.", 'error');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync scroll lock for the body
  useEffect(() => {
    if (view !== 'home') {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [view]);
  
  const currentFocusOptions = useMemo(() => {
    if (level === UserLevel.OPENAI) return [];
    
    // Logic for INTERMEDIATE (Secondary/KSSM) - Always stays translated when available
    if (level === UserLevel.INTERMEDIATE && subLevel && KSSM_INTERMEDIATE_DATA[subLevel]) {
      const labels = KSSM_INTERMEDIATE_DATA[subLevel][language];
      return labels.map((label, idx) => ({
        label,
        color: `${LEVEL_COLORS[idx % LEVEL_COLORS.length]} text-white shadow-sm`,
        inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
      }));
    }

    // Logic for BEGINNER (Primary) - localized to BM when requested
    let options = (subLevel && SUB_LEVEL_FOCUS_MAP[subLevel]) 
      ? [...SUB_LEVEL_FOCUS_MAP[subLevel]] 
      : [...(LEVEL_FOCUS_MAP[level] || [])];

    // ONLY apply localization to BEGINNER labels
    if (language === 'BM' && level === UserLevel.BEGINNER) {
      return options.map(area => ({
        ...area,
        label: PRIMARY_TRANSLATIONS[area.label] || area.label
      }));
    }

    // ADVANCED and others remain in original (English)
    return options;
  }, [level, subLevel, language]);

  const [activeFocusAreas, setActiveFocusAreas] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDarkMode]);

  const handleLevelChange = (newLevel: UserLevel, newSubLevel: string | null = null) => {
    setLevel(newLevel);
    setSubLevel(newSubLevel);
    setActiveFocusAreas([]);
    setMessages([]);
    setChatMode(newLevel === UserLevel.OPENAI ? 'learning' : null);
    setPendingProblem(null);
  };

  const toggleFocusArea = (label: string) => {
    setActiveFocusAreas(prev => prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label]);
  };

  const executeSolve = async (text: string, mode: ChatMode, attachment?: FileAttachment, manualImage?: string, history: Message[] = []) => {
    if (!isOnline) {
      addToast("Network issue detected. Please check your connection.", 'error');
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: language === 'BM' ? "Maaf, anda sedang luar talian." : "Sorry, you are currently offline.", 
        timestamp: new Date(),
        error: true
      }]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await solveMathProblem(text, history, level, mode, language, attachment, activeFocusAreas, subLevel, socraticEnabled, reasoningMode);
      let responseText = response.text;

      const illustrateMatch = responseText.match(/\[ILLUSTRATE:\s*([\s\S]*?)\]/);
      let autoGeneratedImage = manualImage;

      if (illustrateMatch && !autoGeneratedImage) {
        const prompt = illustrateMatch[1];
        const imgResult = await generateIllustration(prompt, '1K', false);
        if (imgResult) autoGeneratedImage = imgResult;
        responseText = responseText.replace(/\[ILLUSTRATE:[\s\S]*?\]/g, '');
      }

      setMessages(prev => [...prev, {
        role: 'model',
        text: responseText,
        timestamp: new Date(),
        image: autoGeneratedImage,
        citations: response.citations,
        error: response.isError
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Technical error processing that message.", timestamp: new Date(), error: true }]);
      addToast("Communication error with AI service.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string, mode: ChatMode, attachment?: FileAttachment, manualImage?: string) => {
    const userMessage: Message = { role: 'user', text, timestamp: new Date(), attachment };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    if (level === UserLevel.OPENAI) {
      executeSolve(text, 'learning', attachment, manualImage, messages);
      return;
    }

    if (!chatMode) {
      const normalizedText = text.trim().toLowerCase();
      const modeKeywords: Record<string, ChatMode> = { 
        'fast': 'fast', 'fast answer': 'fast',
        'exam': 'exam', 'exam mode': 'exam',
        'learning': 'learning', 'learning mode': 'learning'
      };

      if (modeKeywords[normalizedText]) {
        const selectedMode = modeKeywords[normalizedText];
        setChatMode(selectedMode);
        if (pendingProblem) {
          executeSolve(pendingProblem.text, selectedMode, pendingProblem.attachment, undefined, newMessages);
          setPendingProblem(null);
        } else {
          setMessages(prev => [...prev, { 
            role: 'model', 
            text: `Mode set to **${selectedMode.toUpperCase()}**. I'm ready for your next math challenge!`, 
            timestamp: new Date() 
          }]);
        }
        return;
      }

      setPendingProblem({ text, attachment });
      
      const promptText = language === 'BM' 
        ? "Sila pilih mod bimbingan untuk sesi ini sebelum kita teruskan:\n\n1. **Learning**: Bimbingan langkah demi langkah\n2. **Exam**: Persediaan peperiksaan & tips\n3. **Fast Answer**: Jawapan matematik terus\n\nBalas dengan \"**Fast**\", \"**Exam**\", atau \"**Learning**\"."
        : "Please choose a tutoring mode for this session before we continue:\n\n1. **Learning**: Step-by-step guidance\n2. **Exam**: Formal derivation & tips\n3. **Fast Answer**: Raw math only\n\nReply with \"**Fast**\", \"**Exam**\", or \"**Learning**\".";

      setMessages(prev => [...prev, {
        role: 'model',
        text: promptText,
        timestamp: new Date()
      }]);
    } else {
      executeSolve(text, chatMode, attachment, manualImage, messages);
    }
  };

  const handleNavigate = (v: 'home' | 'app' | 'settings' | 'quicknotes', tab?: 'account' | 'preferences') => {
    setView(v);
    if (tab) setSettingsTab(tab);
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    } else {
       setUser({ name: 'Guest Scholar', email: 'guest@example.com', pfp: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=guest', ...updates });
    }
  };

  const handleDeleteData = () => {
    setMessages([]);
    setActiveFocusAreas([]);
    setUser(null);
    setView('home');
  };

  const handleSubmitFeedback = async (feedback: string, rating: number) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const destinationEmail = 'ogmathmentor@gmail.com';

    try {
      await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `USER FEEDBACK SESSION:
Rating: ${rating}/5 stars
Feedback: "${feedback}"
User Context: Level ${level}, Sublevel ${subLevel}, Language: ${language}
Operator Email: ${destinationEmail}

Analyze this feedback for the MathMentor AI app. Log sentiment and key improvements for the technical operator at ${destinationEmail}.`,
        config: {
          systemInstruction: "You are a quality assurance analyst for MathMentor AI. Process user feedback and prepare a brief report for the engineering lead."
        }
      });
      
      const subject = encodeURIComponent(`MathMentor Feedback: ${rating} Stars`);
      const body = encodeURIComponent(
        `Rating: ${rating}/5 Stars\n\n` +
        `User Feedback:\n"${feedback}"\n\n` +
        `--- Technical Context ---\n` +
        `Learner Level: ${level}\n` +
        `Current Sub-level: ${subLevel || 'N/A'}\n` +
        `Language: ${language}\n` +
        `Platform: MathMentor AI WebApp`
      );

      window.location.href = `mailto:${destinationEmail}?subject=${subject}&body=${body}`;

    } catch (err) {
      console.error("Feedback Processing Error:", err);
      addToast("Failed to process feedback automatically, but you can still send email.", 'info');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      <NavigationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onNavigate={handleNavigate} 
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        currentView={view} 
      />
      
      <Toast toasts={toasts} removeToast={removeToast} />

      {isAuthModalOpen && (
        <AuthScreen onBack={() => setIsAuthModalOpen(false)} onLogin={(u) => { setUser(u); setIsAuthModalOpen(false); }} />
      )}

      <FeedbackModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => setIsFeedbackModalOpen(false)} 
        onSubmit={handleSubmitFeedback} 
      />

      {view === 'home' ? (
        <HomeScreen onStart={() => setView('app')} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} onOpenMenu={() => setIsDrawerOpen(true)} onLogin={() => setIsAuthModalOpen(true)} user={user} />
      ) : (
        <div className="flex flex-col h-screen overflow-hidden">
          <Header 
            level={level} 
            subLevel={subLevel} 
            setLevel={handleLevelChange} 
            isDarkMode={isDarkMode} 
            toggleTheme={() => setIsDarkMode(!isDarkMode)} 
            onOpenMenu={() => setIsDrawerOpen(true)} 
            onLogin={() => setIsAuthModalOpen(true)} 
            onLogout={() => { setUser(null); setView('home'); }} 
            user={user} 
            onNavigate={handleNavigate}
            language={language}
            setLanguage={setLanguage}
            showLevels={view !== 'quicknotes'}
          />

          {!isOnline && (
            <div className="bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 px-4 flex items-center justify-center gap-2">
              <WifiOff size={12} /> Offline Mode - Some features restricted
            </div>
          )}
          
          {view === 'settings' ? (
            <SettingsView 
              user={user} 
              activeTab={settingsTab} 
              setTab={setSettingsTab} 
              onBack={() => setView('app')} 
              isDarkMode={isDarkMode} 
              toggleTheme={() => setIsDarkMode(!isDarkMode)} 
              level={level} 
              subLevel={subLevel} 
              socraticEnabled={socraticEnabled} 
              setSocraticEnabled={setSocraticEnabled}
              reasoningMode={reasoningMode}
              setReasoningMode={setReasoningMode}
              onUpdateUser={handleUpdateUser}
              onDeleteData={handleDeleteData}
            />
          ) : view === 'quicknotes' ? (
            <QuickNotesView language={language} onBack={() => setView('app')} />
          ) : (
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
              {level !== UserLevel.OPENAI && (
                <div className={`hidden lg:flex flex-col gap-6 transition-all duration-500 ease-in-out ${isFocusMinimized ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
                  <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 overflow-hidden h-full flex flex-col transition-all duration-500`}>
                    <div className={`flex items-center justify-between mb-4 w-full`}>
                      {!isFocusMinimized && <h2 className="text-sm font-bold flex items-center gap-2 tracking-tight"><Sparkles size={18} className="text-indigo-50" /> {language === 'BM' ? 'Kawasan Tumpuan' : 'Focus Areas'}</h2>}
                      <button onClick={() => setIsFocusMinimized(!isFocusMinimized)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        {isFocusMinimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                      </button>
                    </div>
                    {!isFocusMinimized && (
                      <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        {currentFocusOptions.map((area) => (
                          <button key={area.label} onClick={() => toggleFocusArea(area.label)} className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${activeFocusAreas.includes(area.label) ? 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                            <span className={`text-[13px] font-bold ${activeFocusAreas.includes(area.label) ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>{area.label}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition-all duration-300 ${activeFocusAreas.includes(area.label) ? area.color : area.inactiveColor}`}>{activeFocusAreas.includes(area.label) ? (language === 'BM' ? 'Aktif' : 'Active') : (language === 'BM' ? 'Tidak Aktif' : 'Inactive')}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={`flex flex-col min-h-[500px] h-full overflow-hidden transition-all duration-500 ${level === UserLevel.OPENAI ? 'lg:col-span-9' : (isFocusMinimized ? 'lg:col-span-8' : 'lg:col-span-6')}`}>
                <ChatInterface 
                  messages={messages} 
                  onSendMessage={handleSendMessage} 
                  isLoading={isLoading} 
                  level={level} 
                  activeMode={chatMode} 
                  setActiveMode={setChatMode}
                  onError={addToast}
                />
              </div>

              <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
                <ToolsPanel level={level} activeFocusAreas={activeFocusAreas} language={language} />
              </div>
            </main>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
