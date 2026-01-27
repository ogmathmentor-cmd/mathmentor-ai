
// App.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { UserLevel, Message, FileAttachment, ChatMode, Language, Toast as ToastType, Feedback } from './types';
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
import { solveMathProblemStream, generateIllustration } from './services/geminiService';
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
    BM: ['Pola dan Jujukan', 'Pemfaktoran & Pecahan Algebra', 'Rumus Algebra', 'Poligon', 'Bulatan', 'Geometri Tiga Dimensi', 'Geometri Koordinat', 'Graf Fungsi', 'Laju dan Pecutan', 'Kecerunan Geris Lurus', 'Transformasi Isometri', 'Sukatan Kecenderungan Memusat', 'Kebarangkalian Mudah']
  },
  'Form 3': {
    EN: ['Indices', 'Standard Form', 'Consumer Math (Savings)', 'Scaled Drawings', 'Trigonometric Ratios', 'Angles & Tangents', 'Plans & Elevations', 'Locus in 2D', 'Straight Lines'],
    BM: ['Indeks', 'Bentuk Piawai', 'Matematik Pengguna: Simpanan...', 'Lukisan Berskala', 'Nisbah Trigonometri', 'Sudut & Tangen dalam Bulatan', 'Pelan & Dongakan', 'Lokus dalam Dua Dimensi', 'Garis Lurus']
  },
  'Form 4': {
    EN: ['Quadratic Functions', 'Number Fundamentals', 'Logical Reasoning', 'Set Operations', 'Graph Theory', 'Linear Inequalities', 'Motion Graphs', 'Dispersion (Ungrouped)', 'Combined Probability', 'Consumer Math (Finance)'],
    BM: ['Fungsi & Persamaan Kuadratik', 'Asas Nombor', 'Penaakulan Logik', 'Operasi Set', 'Rangkaian dalam Teori Graf', 'Ketaksamaan Linear', 'Graf Gerakan', 'Sukatan Serakan Data Tak Terkumpul', 'Kebarangkalian Peristiwa Bergabung', 'Matematik Pengguna: Pengurusan Kewangan']
  },
  'Form 5': {
    EN: ['Variation', 'Matrices', 'Consumer Math (Insurans)', 'Consumer Math (Taxation)', 'Congruency & Enlargement', 'Trig Functions & Graphs', 'Dispersion (Grouped)', 'Mathematical Modelling'],
    BM: ['Ubahan', 'Matriks', 'Matematik Pengguna: Insurans', 'Matematik Pengguna: Percukaian', 'Kesebangunan, Pembesaran...', 'Nisbah dan Graf Fungsi Trigonometri', 'Sukatan Serakan Data Terumpul', 'Pemodelan Matematik']
  },
  'Form 4 (Add Math)': {
    EN: ['Functions', 'Quadratic Functions', 'Systems of Linear Equations', 'Indices, Surds and Logarithms', 'Arithmetic and Geometric Progressions', 'Linear Law', 'Coordinate Geometry', 'Vectors', 'Solution of Triangles', 'Index Numbers'],
    BM: ['Fungsi', 'Fungsi Kuadratik', 'Sistem Persamaan Linear', 'Indeks, Surd dan Logaritma', 'Jujukan Aritmetik dan Geometri', 'Hukum Linear', 'Geometri Koordinat', 'Vektor', 'Penyelesaian Segi Tiga', 'Nombor Indeks']
  },
  'Form 5 (Add Math)': {
    EN: ['Circular Measure', 'Coordinate Geometry – Advanced', 'Vectors – Advanced', 'Trigonometric Functions', 'Differentiation', 'Integration', 'Permutation and Combination', 'Probability Distribution', 'Linear Programming', 'Kinematics of Linear Motion'],
    BM: ['Ukuran Bulatan', 'Geometri Koordinat Lanjutan', 'Vektor Lanjutan', 'Fungsi Trigonometri', 'Pembezaan', 'Pengamiran', 'Penyusunan dan Gabungan', 'Taburan Kebarangkalian', 'Pengaturcaraan Linear', 'Kinematik Gerakan Linear']
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
  [UserLevel.INTERMEDIATE]: [],
  [UserLevel.ADVANCED]: [],
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

const STORAGE_KEYS = {
  MESSAGES: 'math_mentor_messages',
  LEVEL: 'math_mentor_level',
  SUBLEVEL: 'math_mentor_sublevel',
  LANGUAGE: 'math_mentor_language',
  CHATMODE: 'math_mentor_chatmode',
  FOCUS_AREAS: 'math_mentor_focusareas',
  USER_SESSION: 'math_mentor_user_session',
  FEEDBACKS: 'math_mentor_feedbacks'
};

const DEFAULT_FEEDBACKS: Feedback[] = [
  { id: '1', userName: 'Ahmad Daniel', userPfp: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Ahmad', rating: 5, message: "Sangat membantu untuk Add Math! Penjelasan langkah demi langkah memang power.", timestamp: new Date(2025, 0, 15) },
  { id: '2', userName: 'Sarah Lim', userPfp: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sarah', rating: 5, message: "The step-by-step guidance is amazing. I finally understand Matrices!", timestamp: new Date(2025, 0, 18) },
  { id: '3', userName: 'Joey Tan', userPfp: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Joey', rating: 4, message: "UI cantik gila. Senang nak guna kat phone.", timestamp: new Date(2025, 0, 20) }
];

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'app' | 'settings' | 'quicknotes'>('home');
  const [settingsTab, setSettingsTab] = useState<'account' | 'preferences'>('preferences');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(DEFAULT_FEEDBACKS);
  
  const [language, setLanguage] = useState<Language>('EN');
  const [level, setLevel] = useState<UserLevel>(UserLevel.INTERMEDIATE);
  const [subLevel, setSubLevel] = useState<string | null>('Form 1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFocusMinimized, setIsFocusMinimized] = useState(false);
  const [socraticEnabled, setSocraticEnabled] = useState(true);
  const [reasoningMode, setReasoningMode] = useState<'fast' | 'deep'>('deep');
  const [chatMode, setChatMode] = useState<ChatMode | null>('learning');
  const [pendingProblem, setPendingProblem] = useState<{text: string; attachment?: FileAttachment} | null>(null);
  const [activeFocusAreas, setActiveFocusAreas] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load state from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const savedLevel = localStorage.getItem(STORAGE_KEYS.LEVEL);
    const savedSublevel = localStorage.getItem(STORAGE_KEYS.SUBLEVEL);
    const savedLanguage = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    const savedChatmode = localStorage.getItem(STORAGE_KEYS.CHATMODE);
    const savedFocus = localStorage.getItem(STORAGE_KEYS.FOCUS_AREAS);
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    const savedFeedbacks = localStorage.getItem(STORAGE_KEYS.FEEDBACKS);

    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) { console.error("Failed to load history", e); }
    }
    if (savedLevel) setLevel(savedLevel as UserLevel);
    if (savedSublevel) setSubLevel(savedSublevel === 'null' ? null : savedSublevel);
    if (savedLanguage) setLanguage(savedLanguage as Language);
    if (savedChatmode) setChatMode(savedChatmode === 'null' ? null : savedChatmode as ChatMode);
    if (savedFocus) {
      try { setActiveFocusAreas(JSON.parse(savedFocus)); } catch (e) {}
    }
    if (savedFeedbacks) {
      try { 
        const parsed = JSON.parse(savedFeedbacks);
        setFeedbacks(parsed.map((f: any) => ({ ...f, timestamp: new Date(f.timestamp) })));
      } catch (e) {}
    }
    if (savedUser) {
      try { 
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setTimeout(() => {
          addToast(language === 'BM' 
            ? `Selamat kembali, ${parsedUser.name.split(' ')[0]}! Sedia untuk belajar lagi?` 
            : `Welcome back, ${parsedUser.name.split(' ')[0]}! Ready for more math?`, 
          'success');
        }, 800);
      } catch (e) { console.error("Failed to load user session", e); }
    }
  }, []);

  // Save feedbacks
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FEEDBACKS, JSON.stringify(feedbacks));
  }, [feedbacks]);

  // Save state to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEVEL, level);
    localStorage.setItem(STORAGE_KEYS.SUBLEVEL, String(subLevel));
  }, [level, subLevel]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHATMODE, String(chatMode));
  }, [chatMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FOCUS_AREAS, JSON.stringify(activeFocusAreas));
  }, [activeFocusAreas]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    }
  }, [user]);

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
    
    // Check if subLevel corresponds to KSSM/Add Math data
    if (subLevel && KSSM_INTERMEDIATE_DATA[subLevel]) {
      const labels = KSSM_INTERMEDIATE_DATA[subLevel][language];
      return labels.map((label, idx) => ({
        label,
        color: `${LEVEL_COLORS[idx % LEVEL_COLORS.length]} text-white shadow-sm`,
        inactiveColor: 'bg-slate-100 text-slate-400 dark:bg-[#1e293b] dark:text-slate-500'
      }));
    }

    // Default to mapped focus areas for standard levels
    let options = (subLevel && SUB_LEVEL_FOCUS_MAP[subLevel]) 
      ? [...SUB_LEVEL_FOCUS_MAP[subLevel]] 
      : [...(LEVEL_FOCUS_MAP[level] || [])];

    if (language === 'BM' && level === UserLevel.BEGINNER) {
      return options.map(area => ({
        ...area,
        label: PRIMARY_TRANSLATIONS[area.label] || area.label
      }));
    }

    return options;
  }, [level, subLevel, language]);

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
    setChatMode('learning'); 
    setPendingProblem(null);
  };

  const toggleFocusArea = (label: string) => {
    setActiveFocusAreas(prev => prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label]);
  };

  const handleKeySelection = async () => {
    const isKeySelected = await (window as any).aistudio.hasSelectedApiKey();
    if (!isKeySelected) {
      addToast("Pro Models require a paid API key. Please select your key.", "info");
      await (window as any).aistudio.openSelectKey();
    }
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

    const isPro = level === UserLevel.ADVANCED || level === UserLevel.OPENAI;
    if (isPro) {
      await handleKeySelection();
    }

    setIsLoading(true);
    
    // Add an initial placeholder model message for streaming
    setMessages(prev => [...prev, {
      role: 'model',
      text: "",
      timestamp: new Date()
    }]);

    try {
      const response = await solveMathProblemStream(
        text, 
        history, 
        level, 
        mode, 
        language, 
        (streamedText) => {
          setMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = { 
                ...updated[updated.length - 1], 
                text: streamedText 
              };
            }
            return updated;
          });
        },
        attachment, 
        activeFocusAreas, 
        subLevel, 
        socraticEnabled, 
        reasoningMode
      );
      
      let finalResponseText = response.text || "";
      const illustrateMatch = finalResponseText ? finalResponseText.match(/\[ILLUSTRATE:\s*([\s\S]*?)\]/) : null;
      let autoGeneratedImage = manualImage;

      if (illustrateMatch && !autoGeneratedImage) {
        const prompt = illustrateMatch[1];
        try {
          const imgResult = await generateIllustration(prompt, '1K', false);
          if (imgResult) autoGeneratedImage = imgResult;
          finalResponseText = finalResponseText.replace(/\[ILLUSTRATE:[\s\S]*?\]/g, '');
        } catch (imgErr) {
          console.warn("Auto-illustration failed", imgErr);
        }
      }

      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            role: 'model',
            text: finalResponseText,
            timestamp: new Date(),
            image: autoGeneratedImage,
            citations: response.citations,
            error: response.isError
          };
        }
        return updated;
      });
    } catch (error: any) {
      console.error("Final Execution error after retries", error);
      const message = error?.message || "";
      const isTransient = message.includes('503') || message.includes('429') || message.includes('overloaded') || message.includes('Resource has been exhausted');
      
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = { 
            role: 'model', 
            text: isTransient 
              ? (language === 'BM' ? "Sistem AI sangat sibuk buat masa ini. Sila cuba lagi sebentar." : "The AI service is very busy right now. Please try again in a few moments.")
              : (message.includes('not found') ? "API Key error. Pro models require a personal API key from a paid GCP project." : "Technical error processing that message. Please try again."), 
            timestamp: new Date(), 
            error: true 
          };
        }
        return updated;
      });
      addToast("AI Service Interrupted.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string, mode: ChatMode, attachment?: FileAttachment, manualImage?: string) => {
    const userMessage: Message = { role: 'user', text, timestamp: new Date(), attachment };
    let updatedHistory: Message[] = [];
    
    setMessages(prev => {
        updatedHistory = [...prev, userMessage];
        return updatedHistory;
    });

    if (level === UserLevel.OPENAI) {
      executeSolve(text, 'learning', attachment, manualImage, updatedHistory);
    } else if (!chatMode) {
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
          executeSolve(pendingProblem.text, selectedMode, pendingProblem.attachment, undefined, updatedHistory);
          setPendingProblem(null);
        } else {
          setMessages(m => [...m, { 
            role: 'model', 
            text: `Mode set to **${selectedMode.toUpperCase()}**. I'm ready for your next math challenge!`, 
            timestamp: new Date() 
          }]);
        }
      } else {
        setPendingProblem({ text, attachment });
        const promptText = language === 'BM' 
          ? "Sila pilih mod bimbingan untuk sesi ini sebelum kita teruskan:\n\n1. **Learning**: Bimbingan langkah demi langkah\n2. **Exam**: Persediaan peperiksaan & tips\n3. **Fast Answer**: Jawapan matematik terus\n\nBalas dengan \"**Fast**\", \"**Exam**\", atau \"**Learning**\"."
          : "Please choose a tutoring mode for this session before we continue:\n\n1. **Learning**: Step-by-step guidance\n2. **Exam**: Formal derivation & tips\n3. **Fast Answer**: Raw math only\n\nReply with \"**Fast**\", \"**Exam**\", or \"**Learning**\"." ;

        setMessages(m => [...m, {
          role: 'model',
          text: promptText,
          timestamp: new Date()
        }]);
      }
    } else {
      executeSolve(text, chatMode, attachment, manualImage, updatedHistory);
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

  const onDeleteData = () => {
    setMessages([]);
    setActiveFocusAreas([]);
    setUser(null);
    setChatMode('learning');
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    setView('home');
    addToast("All session data cleared.", "success");
  };

  const handleLogout = () => {
    setUser(null);
    setMessages([]);
    setActiveFocusAreas([]);
    setChatMode('learning');
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    setView('home');
    addToast("Logged out successfully.", "success");
  };

  const handleSubmitFeedback = (text: string, rating: number) => {
    if (user) {
      const newFeedback: Feedback = {
        id: Math.random().toString(36).substring(7),
        userName: user.name,
        userPfp: user.pfp,
        rating,
        message: text,
        timestamp: new Date()
      };
      setFeedbacks(prev => [newFeedback, ...prev]);
      addToast("Feedback submitted successfully!", "success");
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
        user={user}
        onSignIn={() => { setIsFeedbackModalOpen(false); setIsAuthModalOpen(true); }}
      />

      {view === 'home' ? (
        <HomeScreen onStart={() => setView('app')} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} onOpenMenu={() => setIsDrawerOpen(true)} onLogin={() => setIsAuthModalOpen(true)} user={user} feedbacks={feedbacks} />
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
            onLogout={handleLogout} 
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
              onDeleteData={onDeleteData}
            />
          ) : view === 'quicknotes' ? (
            <QuickNotesView language={language} onBack={() => setView('app')} />
          ) : (
            <main className="flex-1 max-w-full mx-auto w-full p-0 md:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-0 md:gap-6 overflow-hidden h-full">
              {/* Sidebar Left: Focus Areas (Hidden on mobile) */}
              {level !== UserLevel.OPENAI && (
                <div className={`hidden lg:flex flex-col gap-6 transition-all duration-500 ease-in-out ${isFocusMinimized ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
                  <div className={`bg-white dark:bg-[#0f172a] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 overflow-hidden h-full flex flex-col transition-all duration-500`}>
                    <div className={`flex items-center justify-between mb-6 w-full`}>
                      {!isFocusMinimized && <h2 className="text-xs font-black flex items-center gap-2 tracking-[0.1em] text-slate-800 dark:text-slate-200 uppercase"><Sparkles size={16} className="text-indigo-600" /> Focus Areas</h2>}
                      <button onClick={() => { setIsFocusMinimized(!isFocusMinimized); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
                        {isFocusMinimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                      </button>
                    </div>
                    {!isFocusMinimized && (
                      <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        {currentFocusOptions.map((area) => (
                          <div key={area.label} onClick={() => toggleFocusArea(area.label)} className="group cursor-pointer">
                            <div className="flex items-center justify-between mb-1.5">
                               <span className={`text-[12px] font-bold ${activeFocusAreas.includes(area.label) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'} transition-colors`}>{area.label}</span>
                               <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${activeFocusAreas.includes(area.label) ? area.color : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>{activeFocusAreas.includes(area.label) ? (language === 'BM' ? 'Aktif' : 'ACTIVE') : (language === 'BM' ? 'Sedia' : 'READY')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Center Panes: Chat Interface (Expanded on mobile) */}
              <div className={`flex flex-col h-full overflow-hidden ${level === UserLevel.OPENAI ? 'lg:col-span-12' : (isFocusMinimized ? 'lg:col-span-8' : 'lg:col-span-7')}`}>
                <ChatInterface messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} level={level} activeMode={chatMode} setActiveMode={setChatMode} onError={addToast} language={language} />
              </div>

              {/* Sidebar Right: Quiz Center (Hidden on mobile per request) */}
              <div className={`hidden lg:block ${level === UserLevel.OPENAI ? 'lg:hidden' : 'lg:col-span-3'} h-full overflow-hidden`}>
                  <ToolsPanel level={level} subLevel={subLevel} setLevel={handleLevelChange} activeFocusAreas={activeFocusAreas} toggleFocusArea={toggleFocusArea} focusOptions={currentFocusOptions} language={language} />
              </div>
            </main>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
