
// services/geminiService.ts

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UserLevel, Message, FileAttachment, Quiz, ChatMode, ImageSize, Citation, QuizDifficulty, Language } from "../types";

const RESPONSIVE_DIRECTIVE = `
### RESPONSIVENESS & FAILSAFE:
- ALWAYS produce a response. NEVER remain silent.
- Correctness > Speed > Detail.
- If time is limited, prioritize the final answer over detailed explanations.
`;

const MATH_WORKING_RULES = `
### MATH WORKING RULES (CRITICAL):
1. SHOW WORKING clearly and step-by-step.
2. EACH mathematical move MUST be on a NEW LINE.
3. Use simple mathematical notation in LaTeX ($...$ or $$...$$).
4. Do NOT combine multiple steps into one line.
5. Do NOT write paragraphs for calculations.
6. The FINAL ANSWER must be on its own line and clearly labeled.

STANDARD STRUCTURE:
- State formula/relationship
- Substitution line
- Simplification (line-by-line)
- Final answer
`;

const SYSTEM_PROMPT_CORE = `
### MATHMENTOR AI DIRECTIVE
You are a professional, friendly human-like math tutor. Your goal is to ensure the user gets a correct answer they can actually understand.

### CONSTRAINTS:
- Language: [LANGUAGE_TOKEN]. 
- Math: ALWAYS use LaTeX ($...$ or $$...$$).
- Preservation: Do NOT translate variables/formulas.
- Standards: KSSM/SPM textbook style for BM mode.
${MATH_WORKING_RULES}
${RESPONSIVE_DIRECTIVE}
`;

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  learning: `MODE: LEARNING. 
### FORMATTING FOR LEARNING:
1. ### 💡 THE BIG IDEA
A single, non-technical sentence explaining the "Big Idea."

2. ### 🛠️ THE STEP-BY-STEP
Full step-by-step working. Use the format:
**Step [N]: [Action Goal]**
(Calculation - One move per line)
$$...$$
$$...$$
*Short tip or caution.*

3. ### 🧠 THE ANALOGY
A real-world comparison (e.g., a balanced scale, fruit baskets).

4. ### ✅ QUICK CHECK
A small, friendly question for the student.

STRICT: Use double line breaks between sections. Keep explanations punchy.`,

  exam: `MODE: EXAM. 
- Focus on formal steps and precision.
- Include "Marking Tips" or pitfall warnings.
- Working shown clearly line-by-line.
- Minimal conversational filler.`,

  fast: `MODE: FAST ANSWER.
STRICT FORMATTING RULES:
1. Output ONLY LaTeX mathematical working.
2. EACH step MUST be on a new line.
3. Use display math format ($$ ... $$) for EVERY equation/line.
4. Do NOT wrap steps in brackets [ ].
5. Do NOT use \\begin{array}, \\begin{aligned}, or \\begin{cases} environments.
6. Do NOT include any explanations, words, text, or symbols outside the LaTeX equations.
7. Do NOT include labels or headers (e.g., no "Answer:", no "Step 1").
8. The final simplified answer must be the LAST line of equations.
9. No punctuation outside the LaTeX delimiters.

Example of valid FAST output:
$$2x + 5 = 15$$
$$2x = 10$$
$$x = 5$$`
};

export interface MathResponse {
  text: string;
  citations: Citation[];
  isError?: boolean;
}

const cleanJsonResponse = (text: string): string => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

const handleApiError = (error: any, language: Language): string => {
  console.error("Gemini API Error Detail:", error);
  let status = error?.status || error?.error?.code || 0;
  const message = error?.message || "";
  
  if (typeof message === 'string' && message.includes('{')) {
    try {
      const parsed = JSON.parse(message);
      const innerError = parsed?.error || parsed;
      if (innerError?.code) status = innerError.code;
    } catch (e) {}
  }

  const isOverloaded = status === 503 || status === 504 || message.includes('503') || message.includes('overloaded') || message.includes('UNAVAILABLE');
  const isRateLimited = status === 429 || message.includes('429');
  const isKeyError = status === 404 || status === 401 || message.includes('not found') || message.includes('key');

  if (isOverloaded) return language === 'BM' ? "Pelayan sedang sibuk. Kami sedang cuba menghubungkan anda semula (Ralat 503)." : "The AI is a bit busy right now. We're retrying to get you an answer (Error 503).";
  if (isRateLimited) return language === 'BM' ? "Had penggunaan dicapai. Sila tunggu sebentar (Ralat 429)." : "Rate limit reached. Please wait a moment (Error 429).";
  if (isKeyError) return language === 'BM' ? "Masalah Kunci API. Sila pilih Kunci API anda." : "API Key issue. Please select your API Key.";
  return language === 'BM' ? `Ralat teknikal (${status || 'Unknown'}). Sila cuba sebentar lagi.` : `Technical error (${status || 'Unknown'}). Please try again.`;
};

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    let status = error?.status || 0;
    const message = error?.message || "";

    if (status === 0 && message.includes('{')) {
      try {
        const parsed = JSON.parse(message);
        status = parsed?.error?.code || status;
      } catch (e) {}
    }

    const isTransient = status === 503 || status === 504 || status === 429 ||
                        message.includes('503') || message.includes('overloaded') ||
                        message.includes('UNAVAILABLE') || message.includes('deadline') ||
                        message.includes('Resource has been exhausted');

    if (retries > 0 && isTransient) {
      console.warn(`Transient error (Status: ${status}). Retrying... Attempts left: ${retries}`);
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
    let modelName = 'gemini-3-flash-preview';
    let thinkingBudget = 0;
    if (mode === 'fast') {
      modelName = 'gemini-3-flash-preview';
    } else if (reasoningMode === 'deep') {
      if (level === UserLevel.ADVANCED || level === UserLevel.OPENAI) {
        modelName = 'gemini-3-pro-preview';
        thinkingBudget = 8000;
      } else {
        modelName = 'gemini-3-flash-preview';
        thinkingBudget = 4000;
      }
    }
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    const currentParts: any[] = [{ text: `Context: ${level} | Focus: ${focusAreas?.join(', ') || 'Math'}\nInput: ${problem}` }];
    if (attachment) currentParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    contents.push({ role: 'user', parts: currentParts });

    const config: any = {
      systemInstruction: `${SYSTEM_PROMPT_CORE.replace(/\[LANGUAGE_TOKEN\]/g, language)}\n${MODE_INSTRUCTIONS[mode]}`,
      temperature: mode === 'fast' ? 0.0 : 0.2,
      tools: (mode === 'fast') ? [] : [{ googleSearch: {} }],
    };
    if (thinkingBudget > 0) config.thinkingConfig = { thinkingBudget };

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
  reasoningMode: 'fast' | 'deep' = 'deep'
): Promise<MathResponse> => {
  const key = process.env.API_KEY;
  if (!key) return { text: "API Key missing.", citations: [], isError: true };
  const executeCall = async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    let modelName = 'gemini-3-flash-preview';
    let thinkingBudget = 0;
    if (mode === 'fast') {
      modelName = 'gemini-3-flash-preview';
    } else if (reasoningMode === 'deep') {
      if (level === UserLevel.ADVANCED || level === UserLevel.OPENAI) {
        modelName = 'gemini-3-pro-preview';
        thinkingBudget = 8000;
      } else {
        modelName = 'gemini-3-flash-preview';
        thinkingBudget = 4000;
      }
    }
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    const currentParts: any[] = [{ text: `Context: ${level} | Focus: ${focusAreas?.join(', ') || 'Math'}\nInput: ${problem}` }];
    if (attachment) currentParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    contents.push({ role: 'user', parts: currentParts });
    const config: any = {
      systemInstruction: `${SYSTEM_PROMPT_CORE.replace(/\[LANGUAGE_TOKEN\]/g, language)}\n${MODE_INSTRUCTIONS[mode]}`,
      temperature: mode === 'fast' ? 0.0 : 0.2,
      tools: (mode === 'fast') ? [] : [{ googleSearch: {} }],
    };
    if (thinkingBudget > 0) config.thinkingConfig = { thinkingBudget };
    const response = await ai.models.generateContent({ model: modelName, contents, config });
    const citations: Citation[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of response.candidates[0].groundingMetadata.groundingChunks) {
        if (chunk.web) citations.push({ title: chunk.web.title || 'Source', uri: chunk.web.uri });
      }
    }
    return { text: response.text || "", citations, isError: false };
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
    // Instruction to handle larger materials by scanning everything but summarizing into a compact format
    const parts: any[] = [{ text: "Perform an exhaustive deep scan of all provided materials, especially large documents. Synthesize the core concepts into a COMPACT, high-density study master sheet. Your goal is to capture the complete essence of these materials in the most efficient, simplified format possible. Prioritize brevity, critical formulas, and logical connections between multiple files." }];
    files.forEach(f => parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } }));
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: "You are a master mathematical synthesizer. Create an EFFICIENT, COMPACT, and COMPLETE study sheet from the provided sources, regardless of their size. Use high-density information mapping. Highlight critical formulas in display math. Hierarchy: Concept -> Definition -> Formula -> One-line Example. Language: " + language,
        // Increased thinking budget for deeper synthesis of potentially large files
        thinkingConfig: { thinkingBudget: 8000 }
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
  const executeCall = async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const model = isManualHighRes ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    const res = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: `Minimal math diagram: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "1:1", ...(model === 'gemini-3-pro-image-preview' ? { imageSize: size } : {}) } }
    });
    const part = res.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
  };
  try {
    return await withRetry(executeCall);
  } catch {
    return null;
  }
};

export const generateQuiz = async (topic: string, level: UserLevel, language: Language, difficulty: QuizDifficulty = 'medium', focusAreas?: string[]): Promise<Quiz> => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key missing.");
  const executeCall = async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Generate ${difficulty} quiz on ${topic}` }] }],
      config: {
        systemInstruction: `Generate a math quiz. Output JSON matching quiz schema.`,
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
    return JSON.parse(cleanJsonResponse(res.text || "{}"));
  };
  try {
    return await withRetry(executeCall);
  } catch (error) {
    throw new Error(handleApiError(error, language));
  }
};
