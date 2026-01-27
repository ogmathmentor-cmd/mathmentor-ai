
export enum UserLevel {
  BEGINNER = 'Beginner (Primary)',
  INTERMEDIATE = 'Intermediate (Secondary)',
  ADVANCED = 'Advanced (KSSM Add Math / Pre-U)',
  OPENAI = 'OpenAI'
}

export type Language = 'BM' | 'EN';
export type ChatMode = 'learning' | 'exam' | 'fast';
export type ImageSize = '1K' | '2K' | '4K';
export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'adaptive';

export interface Citation {
  title: string;
  uri: string;
}

export interface FileAttachment {
  data: string; // base64
  mimeType: string;
  name: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  attachment?: FileAttachment;
  image?: string; // base64 data url for generated images
  citations?: Citation[];
  error?: boolean;
}

export interface Feedback {
  id: string;
  userName: string;
  userPfp: string;
  rating: number;
  message: string;
  timestamp: Date;
}

export interface MathStep {
  title: string;
  description: string;
  formula?: string;
  reason: string;
}

export interface MathSolution {
  problem: string;
  summary: string;
  steps: MathStep[];
  conceptsUsed: string[];
}

export interface PracticeQuestion {
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hint: string;
  answer: string;
  explanation: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
  difficulty?: QuizDifficulty;
}

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}
