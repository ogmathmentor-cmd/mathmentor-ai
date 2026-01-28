
// services/geminiService.ts

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UserLevel, Message, FileAttachment, Quiz, ChatMode, ImageSize, Citation, QuizDifficulty, Language } from "../types";

const RESPONSIVE_DIRECTIVE = `
### RESPONSIVENESS & FAILSAFE:
- ALWAYS produce a response. NEVER remain silent.
- Prioritize immediate streaming.
`;

const LATEX_FORMATTING_GUIDE = `
### LATEX FORMATTING GUIDE (STRICT):
1. MATRICES: Always use \\begin{pmatrix} ... \\end{pmatrix}. Use & as column separator and \\\\ as row separator.
2. FRACTIONS: Always use \\frac{numerator}{denominator} for complex fractions.
3. ALIGNMENT: For multi-step derivations, use \\begin{aligned} ... \\end{aligned} with & for alignment points.
4. SYMBOLS: Use proper LaTeX symbols: \\times (not *), \\div (not /), \\pm, \\sqrt{}, \\int, \\sum.
5. DELIMITERS: Use $...$ for inline math and $$...$$ for block math.
`;

const VISUAL_LEARNING_PROTOCOL = `
### VISUAL LEARNING PROTOCOL:
If the problem involves spatial reasoning, geometry, functions, locus, or graphs, OR if the user explicitly asks for a diagram/graph, you MUST include a request for an illustration.
- Use the tag [ILLUSTRATE: detailed description] at the end of your response.
- Example: [ILLUSTRATE: A circle with a chord AB and a perpendicular bisector from the center O.]
- Key Topics for Visuals: Locus, Circles (Angles, Chords, Tangents), Coordinate Geometry, Graphs of Functions, Vectors, and 3D Geometry.
- Describe the visual clearly so the diagram generator can produce a high-quality educational graphic.
`;

const MATH_WORKING_RULES = `
### MATH WORKING RULES (CRITICAL):
1. SHOW WORKING clearly and step-by-step.
2. EACH mathematical move MUST be on a NEW LINE.
3. Use simple mathematical notation in LaTeX ($...$ or $$...$$).
4. Do NOT combine multiple steps into one line.
5. The FINAL ANSWER must be on its own line and clearly labeled.
${LATEX_FORMATTING_GUIDE}
${VISUAL_LEARNING_PROTOCOL}
${RESPONSIVE_DIRECTIVE}
`;

const MMU_CURRICULUM_CONTEXT = `
### MMU ESSENTIAL MATHEMATICS CURRICULUM:
You are specifically trained on the Multimedia University (MMU) Essential Mathematics syllabus:
- CH1: Fundamentals of Algebra (Real Numbers, Polynomials, Rational Expressions, Exponents, Radicals, Equations, Inequalities, Absolute Values)
- CH2: Functions and Graphs (Operations on functions, Linear & Quadratic, Coordinate Geometry, Lines)
- CH3: Matrices (Operations, Identity, Transpose, Determinant, Inverse, Systems of Equations)
- CH4: Sequence and Series (Arithmetic and Geometric)
- CH5: Derivative (Rules, Power rule, Chain rule, Higher-order derivatives)
- CH6: Integration (Indefinite, Formulas, U-substitution, Definite)
`;

const KSSM_ADDMATH_CONTEXT = `
### KSSM ADDITIONAL MATHEMATICS CONTEXT (SPM):
You are an expert Additional Mathematics teacher for Form 4 & 5 (Malaysia KSSM).
Your goal is to prepare students for SPM level rigor by focusing on formal derivation, precision, and Malaysian examination style.
Chapters covered include Functions, Quadratic Functions, Systems of Linear Equations, Indices/Surds/Logarithms, Progressions, Linear Law, Coordinate Geometry, Vectors, Trigonometry, Calculus, Permutations/Combinations, Probability Distributions, and Kinematics.
- Correct mistakes by explaining "why" before showing the "how".
- Use terminology consistent with the Malaysian KSSM syllabus.
`;

const SYSTEM_PROMPT_CORE = `
### MATHMENTOR AI DIRECTIVE
You are a professional, friendly human-like math tutor. Your goal is to ensure the user gets a correct answer they can actually understand.

### PERSISTENCE & CONTEXT RULES:
- Address the student by their name if provided.
- Maintain context across messages.

### CONSTRAINTS:
- Language: [LANGUAGE_TOKEN]. 
- Math: ALWAYS use LaTeX ($...$ or $$...$$) for formulas.
- Currency: ALWAYS escape literal dollar signs (e.g., \\$60).
${MATH_WORKING_RULES}
`;

const ADVANCED_PROMPT_ADDON = `
### ADVANCED MATH RIGOR (UNIVERSITY LEVEL):
1. Provide formal definitions when introducing new concepts.
2. If the user asks for a proof, provide a logically rigorous derivation.
3. Use professional academic terminology.
${MMU_CURRICULUM_CONTEXT}
`;

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  learning: `MODE: LEARNING. 
1. ### 💡 THE BIG IDEA: One simple sentence explanation.
2. ### 🛠️ THE STEP-BY-STEP: Full working, one move per line.
3. ### 🧠 THE ANALOGY: A simple comparison.
4. ### ✅ QUICK CHECK: One question for the student.`,

  exam: `MODE: EXAM. 
- Focus on formal derivation and precision.
- Include "Marking Tips" or pitfall warnings.`,

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
    
    // OpenAI level uses Pro. Advanced (Essential Math) uses Flash for stability & speed.
    const isPro = level === UserLevel.OPENAI;
    const modelName = isPro ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    // Thinking Config is only for Gemini 3 series. 
    // We use it for Pro model (OpenAI level)
    let thinkingBudget = 0;
    if (isPro && reasoningMode === 'deep') {
      thinkingBudget = 4000;
    }

    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    const currentParts: any[] = [{ text: `
[CONTEXT]
Level: ${level}
Curriculum: ${subLevel || 'N/A'}
Topic: ${focusAreas?.join(', ') || 'General Math'}

[USER QUERY]
${problem}
` }];

    if (attachment) currentParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    contents.push({ role: 'user', parts: currentParts });

    let systemInstruction = SYSTEM_PROMPT_CORE.replace(/\[LANGUAGE_TOKEN\]/g, language);
    if (level === UserLevel.ADVANCED || level === UserLevel.OPENAI) {
      systemInstruction += `\n${ADVANCED_PROMPT_ADDON}`;
    }
    if (subLevel?.includes('Addmath')) {
      systemInstruction += `\n${KSSM_ADDMATH_CONTEXT}`;
    }
    systemInstruction += `\n${MODE_INSTRUCTIONS[mode]}`;

    const config: any = {
      systemInstruction,
      temperature: mode === 'fast' ? 0.0 : 0.2,
      maxOutputTokens: 8192,
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
    const modelName = (level === UserLevel.OPENAI) ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    const currentParts: any[] = [{ text: `Profile: ${level} | Curriculum: ${subLevel}\nQuery: ${problem}` }];
    if (attachment) currentParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    contents.push({ role: 'user', parts: currentParts });

    let systemInstruction = SYSTEM_PROMPT_CORE.replace(/\[LANGUAGE_TOKEN\]/g, language);
    if (level === UserLevel.ADVANCED || level === UserLevel.OPENAI) {
      systemInstruction += `\n${ADVANCED_PROMPT_ADDON}`;
    }
    if (subLevel?.includes('Addmath')) {
      systemInstruction += `\n${KSSM_ADDMATH_CONTEXT}`;
    }
    systemInstruction += `\n${MODE_INSTRUCTIONS[mode]}`;

    const response = await ai.models.generateContent({ 
      model: modelName, 
      contents, 
      config: { systemInstruction, temperature: 0.2, maxOutputTokens: 4096 } 
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

export const generateIllustration = async (prompt: string, size: ImageSize = '1K', isManualHighRes = false): Promise<string | null> => {
  const key = process.env.API_KEY;
  if (!key) return null;
  const ai = new GoogleGenAI({ apiKey: key });
  const model = 'gemini-2.5-flash-image';
  
  // Refined prompt for mathematical diagram consistency
  const refinedPrompt = `A clean, minimalist mathematical educational diagram for teaching. Style: 2D black and white vector-like line art on white background. Content: ${prompt}. Focus on clarity, accuracy of geometric shapes, and legible math labels. No shading, no photorealism. Suitable for textbook graphics.`;

  const res = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: refinedPrompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });
  const part = res.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
};

export const generateQuiz = async (topic: string, level: UserLevel, language: Language, difficulty: QuizDifficulty = 'medium', focusAreas?: string[]): Promise<Quiz> => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key missing.");
  const ai = new GoogleGenAI({ apiKey: key });
  const model = 'gemini-3-flash-preview';

  let languageDirective = "";
  if (language === 'BM') {
    languageDirective = `
### MALAYSIAN KSSM TRANSLATION PROTOCOL (STRICT):
1. LANGUAGE: Use formal, clear, textbook-style Bahasa Melayu suitable for KSSM students.
2. MATHEMATICS PRESERVATION: DO NOT change numbers, symbols, matrices, variables, or LaTeX formatting.
3. TERMINOLOGY (KSSM STANDARD):
- Matrix -> Matriks
- Given matrices -> Diberi matriks
- Determine -> Tentukan
- Product -> Hasil darab
- Value -> Nilai
- Find -> Cari
- Hence -> Oleh itu
- If -> Jika
- Options -> Pilihan jawapan
4. FORMATTING: Preserve question numbering, multiple-choice labels (A, B, C, D), and LaTeX layout.
`;
  }

  const res = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: `Generate a ${difficulty} quiz on ${topic}.` }] }],
    config: {
      systemInstruction: `Generate a detailed math quiz in ${language} for ${level} level students. 
      Topic: ${topic}. 
      Ensure each question includes a thorough explanation with clear LaTeX formatting for all equations, matrices, and fractions.
      Provide a "pitfalls" field describing common mistakes students make for this specific problem.
      Provide an "alternatives" field explaining other mathematical ways to reach the same answer.
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
                explanation: { type: Type.STRING, description: "Detailed step-by-step reasoning for the correct answer." },
                pitfalls: { type: Type.STRING, description: "Common misconceptions or errors related to this question type." },
                alternatives: { type: Type.STRING, description: "Alternative valid methods to solve this question." }
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
