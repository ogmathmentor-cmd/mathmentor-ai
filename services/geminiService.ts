
// services/geminiService.ts

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UserLevel, Message, FileAttachment, Quiz, ChatMode, ImageSize, Citation, QuizDifficulty, Language } from "../types";

const RESPONSIVE_DIRECTIVE = `
### RESPONSIVENESS & FAILSAFE:
- ALWAYS produce a response. NEVER remain silent.
- Prioritize immediate streaming. Do not pause for long thinking steps.
`;

const MATH_WORKING_RULES = `
### MATH WORKING RULES (CRITICAL):
1. SHOW WORKING clearly and step-by-step.
2. EACH mathematical move MUST be on a NEW LINE.
3. Use simple mathematical notation in LaTeX ($...$ or $$...$$).
4. Do NOT combine multiple steps into one line.
5. The FINAL ANSWER must be on its own line and clearly labeled.
`;

const SYSTEM_PROMPT_CORE = `
### MATHMENTOR AI DIRECTIVE
You are a professional, friendly human-like math tutor. Your goal is to ensure the user gets a correct answer they can actually understand.

### PERSISTENCE & CONTEXT RULES:
- You are part of a website with full history tracking and account-based persistence.
- Always behave as if conversation history is available.
- Maintain context across messages. Do not ask users to repeat information they have already provided in the history.
- Acknowledge returning users naturally if the history suggests a long-term relationship.
- Address the student by their name if provided in the context.

### CONSTRAINTS:
- Language: [LANGUAGE_TOKEN]. 
- Math: ALWAYS use LaTeX ($...$ or $$...$$) for formulas.
- Currency: ALWAYS escape literal dollar signs for money (e.g., use \\$60 instead of $60). This is CRITICAL to avoid broken formatting.
- Preservation: Do NOT translate variables/formulas.
${MATH_WORKING_RULES}
${RESPONSIVE_DIRECTIVE}
`;

const ADD_MATH_SPECIAL_DIRECTIVE = `
### ADDITIONAL MATHEMATICS SPECIALIST PERSONA:
- You are an expert teacher for SPM Additional Mathematics (Form 4 & 5).
- Syllabus: Malaysian KSSM Additional Mathematics.
- Tone: Encouraging, precise, and exam-focused.
- Topics: Calculus, Matrices, Vectors, Circular Measure, Trigonometric Functions, etc.
`;

const ESSENTIAL_MATH_DIRECTIVE = `
### MMU ESSENTIAL MATHEMATICS SPECIALIST (SYLLABUS CH 1-6):
You are tutoring a student using the Multimedia University (MMU) Essential Mathematics curriculum. You MUST strictly follow the methodology found in their slide chapters.

### MMU CHAPTER-SPECIFIC METHODS:
1. **CH 1: ALGEBRA**: 
   - Rationalize denominators using the Conjugate Method (multiply by $\sqrt{a} \pm \sqrt{b}$).
   - Solve quadratics using "Completing the Square" primarily.
2. **CH 3: MATRICES**:
   - $3 \times 3$ INVERSE MUST follow: Minor Matrix ($M$) -> Cofactor Matrix ($C$) -> Adjoint ($C^T$) -> Determinant ($|A|$) -> $A^{-1} = \frac{1}{|A|} adj(A)$.
   - Use Inverse Method ($X = A^{-1}B$) for systems.
3. **CH 5/6: CALCULUS**: 
   - Rules: Power, Product ($uv' + v u'$), Quotient ($\frac{v u' - u v'}{v^2}$), and Chain Rule.
   - Integration: Always include $+ c$ and show u-substitution steps clearly ($u=...$, $du=...$).

### STYLE:
- Match the visual "Solution" style of MMU slides: Clear line-by-line working with bold headers for steps.
`;

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  learning: `MODE: LEARNING. 
1. ### 💡 THE BIG IDEA: One simple sentence explanation.
2. ### 🛠️ THE STEP-BY-STEP: Full working, one move per line.
3. ### 🧠 THE ANALOGY: A simple comparison.
4. ### ✅ QUICK CHECK: One question for the student.`,

  exam: `MODE: EXAM. 
- Focus on formal derivation and precision.
- Include "Marking Tips" or pitfall warnings.
- DO NOT use triple backticks (\`\`\`) for text explanations or tips; only use them for actual code if necessary.`,

  fast: `MODE: FAST ANSWER.
STRICT: Output ONLY LaTeX math steps ($$ ... $$) and the final answer. No words.`
};

export interface MathResponse {
  text: string;
  citations: Citation[];
  isError?: boolean;
}

const handleApiError = (error: any, language: Language): string => {
  console.error("Gemini API Error:", error);
  const msg = error?.message || "";
  if (msg.includes("API_KEY_INVALID")) return language === 'BM' ? "Kunci API tidak sah. Sila periksa tetapan anda." : "Invalid API Key. Please check your settings.";
  if (msg.includes("429")) return language === 'BM' ? "Terlalu banyak permintaan. Sila tunggu sebentar." : "Too many requests. Please wait a moment.";
  return language === 'BM' ? "Sistem AI sedang sibuk. Sila cuba lagi sebentar." : "The AI is currently busy. Please try again in a few moments.";
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.5);
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
  reasoningMode: 'fast' | 'deep' = 'deep'
): Promise<MathResponse> => {
  const key = process.env.API_KEY;
  if (!key) return { text: "API Key missing.", citations: [], isError: true };
  
  const executeCall = async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    
    // Advanced and OpenAI levels use the Pro model for deep reasoning
    const isAdvanced = level === UserLevel.ADVANCED || level === UserLevel.OPENAI;
    const modelName = isAdvanced ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    // Thinking budget is enabled for Advanced level to solve complex calculus/matrices
    const thinkingBudget = isAdvanced ? 4000 : 0; 
    const maxOutputTokens = isAdvanced ? 8000 : 4096;

    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    const currentParts: any[] = [{ text: `
[CONTEXT]
User Level: ${level}
Sub-Level/Class: ${subLevel || 'General'}
Active Focus Areas: ${focusAreas?.join(', ') || 'N/A'}
Instruction Preference: ${socraticEnabled ? 'Socratic (ask questions)' : 'Direct (provide solution)'}

[USER QUERY]
${problem}
` }];

    if (attachment) {
      currentParts.push({ 
        inlineData: { 
          mimeType: attachment.mimeType, 
          data: attachment.data 
        } 
      });
    }
    
    contents.push({ role: 'user', parts: currentParts });

    let systemInstruction = SYSTEM_PROMPT_CORE.replace(/\[LANGUAGE_TOKEN\]/g, language);
    
    // Dynamic syllabus selection based on user sub-level
    if (subLevel?.toLowerCase().includes('essential mathematics')) {
      systemInstruction += `\n${ESSENTIAL_MATH_DIRECTIVE}`;
    } else if (subLevel?.toLowerCase().includes('add math')) {
      systemInstruction += `\n${ADD_MATH_SPECIAL_DIRECTIVE}`;
    } else if (level === UserLevel.ADVANCED) {
      systemInstruction += `\n${ADD_MATH_SPECIAL_DIRECTIVE}`;
    }
    
    systemInstruction += `\n${MODE_INSTRUCTIONS[mode]}`;

    const config: any = {
      systemInstruction,
      temperature: mode === 'fast' ? 0.0 : 0.4,
      maxOutputTokens,
      tools: (level === UserLevel.OPENAI) ? [{ googleSearch: {} }] : [],
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
      
      // Extract Google Search grounding if available (OpenAI level)
      if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        for (const gChunk of chunk.candidates[0].groundingMetadata.groundingChunks) {
          if (gChunk.web && !citations.find(c => c.uri === gChunk.web?.uri)) {
            citations.push({ 
              title: gChunk.web.title || 'Source', 
              uri: gChunk.web.uri 
            });
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
  reasoningMode: 'fast' | 'deep' = 'deep'
): Promise<MathResponse> => {
  const key = process.env.API_KEY;
  if (!key) return { text: "API Key missing.", citations: [], isError: true };
  
  const executeCall = async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const isAdvanced = level === UserLevel.ADVANCED || level === UserLevel.OPENAI;
    const modelName = isAdvanced ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    const currentParts: any[] = [{ text: `Level: ${level} | Sub: ${subLevel}\nQuery: ${problem}` }];
    if (attachment) currentParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    contents.push({ role: 'user', parts: currentParts });

    let systemInstruction = SYSTEM_PROMPT_CORE.replace(/\[LANGUAGE_TOKEN\]/g, language);
    if (subLevel?.toLowerCase().includes('essential mathematics')) {
      systemInstruction += `\n${ESSENTIAL_MATH_DIRECTIVE}`;
    }
    systemInstruction += `\n${MODE_INSTRUCTIONS[mode]}`;

    const response = await ai.models.generateContent({ 
      model: modelName, 
      contents, 
      config: { 
        systemInstruction, 
        temperature: 0.2, 
        maxOutputTokens: 4096,
        thinkingConfig: isAdvanced ? { thinkingBudget: 2000 } : undefined
      } 
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
    const parts: any[] = [{ text: "Synthesize core concepts into a compact study sheet with clear LaTeX math formulas." }];
    files.forEach(f => parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } }));
    
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts }],
      config: { 
        systemInstruction: "You are an expert academic writer. Create a compact, highly organized study sheet using LaTeX. Language: " + language 
      }
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
  
  const ai = new GoogleGenAI({ apiKey: key });
  // Use specialized image generation model
  const model = 'gemini-2.5-flash-image';
  
  const res = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: `Scientific mathematical diagram, minimalist, clean white background, high contrast: ${prompt}` }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });
  
  const part = res.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
};

export const generateQuiz = async (topic: string, level: UserLevel, language: Language, difficulty: QuizDifficulty = 'medium', focusAreas?: string[]): Promise<Quiz> => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key missing.");
  
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: `Generate a ${difficulty} quiz on ${topic}. Include mathematical expressions in LaTeX.` }] }],
    config: {
      systemInstruction: `Generate a math quiz in ${language} for student level ${level}. Output ONLY valid JSON matching the provided schema.`,
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
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswerIndex", "explanation"]
            }
          }
        },
        required: ["title", "questions"]
      }
    }
  });
  return JSON.parse(res.text || "{}");
};
