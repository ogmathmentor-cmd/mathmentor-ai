
// services/geminiService.ts

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UserLevel, Message, FileAttachment, Quiz, ChatMode, ImageSize, Citation, QuizDifficulty, Language } from "../types";

const RESPONSIVE_DIRECTIVE = `
### RESPONSIVENESS & FAILSAFE:
- ALWAYS produce a response. NEVER remain silent.
- Prioritize immediate streaming.
- Be Open-minded: Always attempt to answer, even for unconventional, creative, or applied math questions. Make reasonable assumptions if needed.
`;

const LATEX_FORMATTING_GUIDE = `
### LATEX FORMATTING GUIDE (STRICT):
1. MATRICES: Always use \\begin{pmatrix} ... \\end{pmatrix}.
2. FRACTIONS: Always use \\frac{numerator}{denominator}.
3. ALIGNMENT: For derivations, use \\begin{aligned} ... \\end{aligned}.
4. SYMBOLS: Use proper LaTeX symbols: \\times, \\div, \\pm, \\sqrt{}, \\int, \\sum.
5. DELIMITERS: Use $...$ for inline math and $$...$$ for block math.
`;

const VISUAL_LEARNING_PROTOCOL = `
### VISUAL LEARNING PROTOCOL:
If the problem involves spatial reasoning, geometry, or graphs, include [ILLUSTRATE: description].
`;

const MATH_WORKING_RULES = `
### MATH WORKING RULES (CRITICAL):
1. CLARITY FIRST: Be logical, patient, and flexible.
2. CONCISE BY DEFAULT: Provide short, clear answers first. Only provide full step-by-step workings if the current Mode (Learning/Exam) specifically demands it.
3. EACH mathematical move MUST be on a NEW LINE when showing work.
${LATEX_FORMATTING_GUIDE}
${VISUAL_LEARNING_PROTOCOL}
${RESPONSIVE_DIRECTIVE}
`;

const MMU_CURRICULUM_CONTEXT = `
### MMU CURRICULUM:
CH1: Algebra, CH2: Functions, CH3: Matrices, CH4: Series, CH5: Derivatives, CH6: Integration.
`;

const KSSM_ADDMATH_CONTEXT = `
### KSSM ADDMATH (MALAYSIA):
Expert in Form 4 & 5 syllabus. Use KSSM terminology.
`;

const SYSTEM_PROMPT_CORE = `
### ADVANCED MATH AI TUTOR DIRECTIVE
You are an advanced Math AI tutor. Your task is to help learners understand math through logic, patience, and diagnostic feedback.

### TUTORING TASKS:
1. **Analyze User Answers**: If the user provides a solution or an answer, your task is to analyze it:
   - Identify specific errors in reasoning, calculations, or steps.
   - Provide clear, constructive feedback pointing out exactly what went wrong.
   - Suggest how to correct the mistake without giving away the final answer immediately.
   - Lead the user to the correct path with hints or guided steps.
2. **Diagnostic Approach**: Do not just give the answer. Check their work!
3. **Open-minded**: Answer unconventional or creative math questions.
4. **Formatting**: Use LaTeX ($...$ or $$...$$) strictly.

### CORE PRINCIPLES:
1. **Adaptable**: Adjust style to [USER_LEVEL].
2. **Language**: [LANGUAGE_TOKEN]. 
3. **Currency**: Escape literal dollar signs (\\$60).
${MATH_WORKING_RULES}
`;

const ADVANCED_PROMPT_ADDON = `
### UNIVERSITY LEVEL RIGOR:
Provide formal definitions and rigorous proofs when requested.
${MMU_CURRICULUM_CONTEXT}
`;

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  learning: `MODE: LEARNING (Socratic & Detailed). 
- Focus on DIAGNOSING the user's current understanding.
1. ### 💡 THE BIG IDEA: Brief summary.
2. ### 🛠️ THE STEP-BY-STEP: Detailed derivation, one move per line.
3. ### 🧠 THE ANALOGY: Simple comparison.
4. ### ✅ QUICK CHECK: One question for student engagement.`,

  exam: `MODE: EXAM (Formal & Precise). 
- Focus on formal steps and marking criteria.
- Include "Marking Tips" or pitfall warnings.`,

  fast: `MODE: FAST ANSWER (Brief & Direct).
STRICT: Output ONLY the final answer in LaTeX ($$ ... $$). No extra words.`
};

const handleApiError = (error: any, language: Language): string => {
  console.error("Gemini API Error:", error);
  const status = error?.status || error?.error?.status;
  if (status === 'UNAVAILABLE' || status === 503) {
    return language === 'BM' ? "Pelayan sedang sesak (Overloaded). Sila cuba lagi sebentar." : "The model is overloaded. Please try again in a few moments.";
  }
  return language === 'BM' ? "Sistem AI sedang sibuk. Sila cuba lagi sebentar." : "The AI is currently busy. Please try again in a few moments.";
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status || error?.error?.status;
    const isRetryable = status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED' || status === 503 || status === 429;
    
    if (retries > 0 && (isRetryable || !status)) {
      console.warn(`API Overloaded or error encountered. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const solveMathProblemStream = async (
  problem: string,
  history: Message[],
  level: UserLevel, 
  mode: ChatMode,
  language: Language,
  onChunk: (text: string) => void,
  attachment?: FileAttachment,
  focusAreas?: string[],
  subLevel?: string | null,
  socraticEnabled: boolean = true,
  reasoningMode: 'fast' | 'deep' = 'fast'
): Promise<MathResponse> => {
  const key = process.env.API_KEY;
  if (!key) return { text: "API Key missing.", citations: [], isError: true };
  
  const executeCall = async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    
    // Fast = Gemini 3.0 Flash, Deep = Gemini 3.0 Pro
    const modelName = reasoningMode === 'deep' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    let thinkingBudget = 0;
    if (reasoningMode === 'deep') {
      thinkingBudget = 32768; // Max budget for pro reasoning
    }

    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    const currentParts: any[] = [{ text: `
[CONTEXT]
Level: ${level}
Topic: ${focusAreas?.join(', ') || 'General Math'}
Socratic Mode: ${socraticEnabled ? 'ON (Ask leading questions/Analyze student logic)' : 'OFF (Explain directly)'}

[USER QUERY]
${problem}
` }];

    if (attachment) currentParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    contents.push({ role: 'user', parts: currentParts });

    let systemInstruction = SYSTEM_PROMPT_CORE
      .replace(/\[LANGUAGE_TOKEN\]/g, language)
      .replace(/\[USER_LEVEL\]/g, level);

    if (level === UserLevel.ADVANCED || level === UserLevel.OPENAI || reasoningMode === 'deep') {
      systemInstruction += `\n${ADVANCED_PROMPT_ADDON}`;
    }
    if (subLevel?.includes('Addmath')) {
      systemInstruction += `\n${KSSM_ADDMATH_CONTEXT}`;
    }
    systemInstruction += `\n${MODE_INSTRUCTIONS[mode]}`;

    if (socraticEnabled) {
        systemInstruction += `\n### SOCRATIC PROTOCOL: Always check if the user provided an answer or a logic attempt. If they did, critique it before helping. If they didn't, ask them "What do you think is the first step?" or "Which formula should we use here?" before solving the whole thing.`;
    }

    const config: any = {
      systemInstruction,
      temperature: mode === 'fast' ? 0.0 : 0.2,
      maxOutputTokens: 20000,
      tools: (level === UserLevel.OPENAI || reasoningMode === 'deep') ? [{ googleSearch: {} }] : [],
    };
    
    if (thinkingBudget > 0) {
      config.thinkingConfig = { thinkingBudget };
    }

    const stream = await ai.models.generateContentStream({ model: modelName, contents, config });
    let fullText = "";
    const citations: Citation[] = [];
    for await (const chunk of stream) {
      const textChunk = chunk.text || "";
      fullText += textChunk;
      onChunk(fullText);
      if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        for (const gChunk of chunk.candidates[0].groundingMetadata.groundingChunks) {
          if (gChunk.web && !citations.find(c => c.uri === gChunk.web?.uri)) {
            citations.push({ title: gChunk.web.title || 'Source', uri: gChunk.web.uri });
          }
        }
      }
    }
    return { text: fullText, citations, isError: false };
  };
  try {
    return await withRetry(executeCall);
  } catch (error) {
    return { text: handleApiError(error, language), citations: [], isError: true };
  }
};

export const solveMathProblem = async (
  problem: string,
  history: Message[],
  level: UserLevel, 
  mode: ChatMode,
  language: Language,
  attachment?: FileAttachment,
  focusAreas?: string[],
  subLevel?: string | null,
  socraticEnabled: boolean = true,
  reasoningMode: 'fast' | 'deep' = 'fast'
): Promise<MathResponse> => {
  const key = process.env.API_KEY;
  if (!key) return { text: "API Key missing.", citations: [], isError: true };
  const executeCall = async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const modelName = reasoningMode === 'deep' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    const currentParts: any[] = [{ text: `Profile: ${level} | Curriculum: ${subLevel}\nQuery: ${problem}` }];
    if (attachment) currentParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    contents.push({ role: 'user', parts: currentParts });

    let systemInstruction = SYSTEM_PROMPT_CORE
      .replace(/\[LANGUAGE_TOKEN\]/g, language)
      .replace(/\[USER_LEVEL\]/g, level);
      
    if (level === UserLevel.ADVANCED || level === UserLevel.OPENAI || reasoningMode === 'deep') {
      systemInstruction += `\n${ADVANCED_PROMPT_ADDON}`;
    }
    if (subLevel?.includes('Addmath')) {
      systemInstruction += `\n${KSSM_ADDMATH_CONTEXT}`;
    }
    systemInstruction += `\n${MODE_INSTRUCTIONS[mode]}`;

    const config: any = { 
      systemInstruction, 
      temperature: 0.2, 
      maxOutputTokens: 8192 
    };

    if (reasoningMode === 'deep') {
      config.thinkingConfig = { thinkingBudget: 8000 };
    }

    const response = await ai.models.generateContent({ 
      model: modelName, 
      contents, 
      config 
    });
    return { text: response.text || "", citations: [], isError: false };
  };
  try {
    return await withRetry(executeCall);
  } catch (error) {
    return { text: handleApiError(error, language), citations: [], isError: true };
  }
};

export const generateStudyNotes = async (files: FileAttachment[], language: Language): Promise<string> => {
  const key = process.env.API_KEY;
  if (!key) return "API Key missing.";
  const executeCall = async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const parts: any[] = [{ text: "Synthesize core concepts into a compact study sheet. Focus on definitions, rules, and examples." }];
    files.forEach(f => parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } }));
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts }],
      config: { systemInstruction: "Create a compact study sheet. Language: " + language }
    });
    return res.text || "";
  };
  try {
    return await withRetry(executeCall);
  } catch (error) {
    return handleApiError(error, language);
  }
};

export const generateIllustration = async (prompt: string, size: ImageSize = '1K', isManualHighRes = false): Promise<string | null> => {
  const key = process.env.API_KEY;
  if (!key) return null;
  const executeCall = async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const model = 'gemini-2.5-flash-image';
    
    const refinedPrompt = `Math diagram: ${prompt}. Style: 2D B&W line art, white bg, precise geometry, textbook labels. No photorealism.`;

    const res = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: refinedPrompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const part = res.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
  };
  try {
    return await withRetry(executeCall);
  } catch (error) {
    console.error("Illustration generation failed after retries:", error);
    return null;
  }
};

export const generateQuiz = async (
  topic: string, 
  level: UserLevel, 
  language: Language, 
  difficulty: QuizDifficulty = 'medium', 
  focusAreas?: string[],
  count: number = 5
): Promise<Quiz> => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key missing.");
  
  const executeCall = async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const model = 'gemini-3-flash-preview';

    let languageDirective = "";
    if (language === 'BM') {
      languageDirective = `### MALAYSIAN KSSM TRANSLATION PROTOCOL (STRICT): formal clear textbook Bahasa Melayu.`;
    }

    const res = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: `Generate a ${difficulty} quiz with ${count} questions on ${topic}.` }] }],
      config: {
        systemInstruction: `Generate a detailed math quiz with exactly ${count} questions in ${language} for ${level} level students. 
        Topic: ${topic}. 
        Ensure each question includes a thorough explanation with clear LaTeX formatting.
        Format the output as JSON according to the schema.
        ${languageDirective}
        ${LATEX_FORMATTING_GUIDE}`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  pitfalls: { type: Type.STRING },
                  alternatives: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswerIndex", "explanation", "pitfalls", "alternatives"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    });
    return JSON.parse(res.text || "{}");
  };

  try {
    return await withRetry(executeCall);
  } catch (error) {
    console.error("Quiz generation failed after retries:", error);
    throw error;
  }
};

export interface MathResponse {
  text: string;
  citations: Citation[];
  isError?: boolean;
}
