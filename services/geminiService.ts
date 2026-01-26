
// services/geminiService.ts

import { GoogleGenAI, Type } from "@google/genai";
import { UserLevel, Message, FileAttachment, Quiz, ChatMode, ImageSize, Citation, QuizDifficulty, Language } from "../types";

const SYSTEM_PROMPT_CORE = `
### MATHMENTOR AI INTELLIGENCE DIRECTIVE
You are a professional and friendly AI tutor specialized in the Malaysian Mathematics curriculum (KSSM) and general mathematical text.

### LANGUAGE CONTROL (STRICT):
- The current session language is [LANGUAGE_TOKEN]. 
- If [LANGUAGE_TOKEN] is **BM**, ALL output MUST be in **Bahasa Melayu**.
- Use **formal, textbook-style Bahasa Melayu (KSSM / SPM standard)**.
- Do NOT mix English and Malay when BM is selected.
- If [LANGUAGE_TOKEN] is **EN**, use standard English mathematical terminology.

### MATHEMATICS PRESERVATION (CRITICAL):
- ALWAYS preserve numbers, variables, symbols, matrices, and formulas exactly as they are in LaTeX ($...$ for inline, $$...$$ for blocks).
- Do NOT translate mathematical expressions, only the surrounding text.

### KSSM TERMINOLOGY (BM MODE):
- Given → Diberi
- Find / Determine → Cari / Tentukan
- Hence → Oleh itu
- Solution → Penyelesaian
- Value → Nilai
- Matrix → Matriks
- Product → Hasil darab
- Linear Inequality → Ketaksamaan Linear
- Function → Fungsi
- Graph → Graf
- Probability → Kebarangkalian

### TEACHING PHILOSOPHY
- Persona: Patient, supportive, and approachable.
- Persona for Malaysia: Respectful and professional.
`;

const QUICKNOTES_PROMPT = `
### QuickNotes AI INTELLIGENCE DIRECTIVE
You are QuickNotes AI, an advanced study synthesizer. You will be provided with one or more documents (images, PDFs, or text).

### MULTI-FILE SYNTHESIS MISSION:
1. **Cross-Reference**: If multiple files are provided, synthesize them into ONE unified study sheet. 
2. **De-duplicate**: Remove redundant information appearing in multiple files.
3. **Hierarchy**: Organize from foundational concepts to advanced applications.
4. **Precision**: Extract high-yield keywords, formulas, and definitions.

### OUTPUT STYLE (STRICT):
- **Structured Synthesis**: Do not summarize files one by one. Merge them into a cohesive curriculum.
- **Extreme Brevity**: Use short bullet points and keywords.
- **Math Formatting**: Use LaTeX ($...$) for ALL mathematical symbols and formulas.
- **Language**: STRICTLY follow [LANGUAGE_TOKEN].

### STRUCTURE TEMPLATE:
# [Study Topic Title]

## 🧠 Core Concepts & Foundations
- Key idea 1
- Key idea 2

## 📝 Essential Definitions
- **Term**: Definition
- **Term**: Definition

## 📐 Formulas & Mathematical Rules
- $$Formula Block$$
- $Inline$ → Application

## 🛠️ Step-by-Step Processes
1. **Step name**: Description
2. **Step name**: Description

## 💡 Practical Examples (Synthesized)
- Example scenario combining concepts from the material.

## 🎯 Exam Focus & "Trap" Warnings
- Common pitfalls
- High-probability exam topics

COMPRESSION LEVEL: Maximum.
SYNTHESIS LEVEL: Holistic across all provided materials.
`;

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  learning: "MODE: LEARNING. Use analogies, step-by-step guidance, and provide practice questions.",
  exam: "MODE: EXAM. Focus on formal derivation, precision, and mark-winning exam tips.",
  fast: "MODE: FAST ANSWER. Provide ONLY the direct mathematical answer and step-by-step working. STRICTLY NO TEXT EXPLANATIONS. NO conversational filler. NO introductions or conclusions. Output ONLY LaTeX math blocks and minimal necessary math symbols."
};

export interface MathResponse {
  text: string;
  citations: Citation[];
  isError?: boolean;
}

const handleApiError = (error: any, language: Language): string => {
  console.error("Gemini API Error:", error);
  const status = error?.status || error?.error?.code;
  
  // Custom check for the common typo noticed in the screenshot
  const key = process.env.API_KEY || "";
  if (key.startsWith("AlzaSy")) {
    return language === 'BM'
      ? "Ralat kunci API: Kunci anda bermula dengan 'AlzaSy'. Sila pastikan ia sepatutnya 'AIzaSy' (huruf besar I) dalam dashboard Hostinger anda."
      : "API Key Error: Your key starts with 'AlzaSy'. Please check if it should be 'AIzaSy' (capital I) in your Hostinger dashboard.";
  }

  if (status === 429) {
    return language === 'BM' 
      ? "Terlalu banyak permintaan. Sila tunggu sebentar sebelum mencuba lagi." 
      : "Too many requests. Please wait a moment before trying again.";
  }
  if (status === 400 && error?.message?.includes('safety')) {
    return language === 'BM'
      ? "Maaf, permintaan anda disekat oleh penapis keselamatan kami."
      : "Sorry, your request was blocked by our safety filters.";
  }
  if (!navigator.onLine) {
    return language === 'BM'
      ? "Tiada sambungan internet. Sila periksa rangkaian anda."
      : "No internet connection. Please check your network.";
  }
  
  return language === 'BM' 
    ? "Maaf, saya menghadapi ralat teknikal. Sila cuba lagi kemudian." 
    : "I encountered a technical issue. Please try again later.";
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
  
  if (!key) {
    return {
      text: language === 'BM' ? "Kunci API tidak dijumpai. Sila pastikan ia ditetapkan dalam dashboard Hostinger." : "API Key not found. Please ensure it is set in your Hostinger dashboard.",
      citations: [],
      isError: true
    };
  }

  const ai = new GoogleGenAI({ apiKey: key });
  
  const isOpenAILevel = level === UserLevel.OPENAI;
  const levelContext = isOpenAILevel ? "Level: General AI Tutor" : `User Level: ${level}${subLevel ? ` (${subLevel})` : ""}`;
  const focusContext = (!isOpenAILevel && focusAreas?.length) ? `Focus Areas: ${focusAreas.join(', ')}` : "";
  
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  const currentParts: any[] = [{ text: `Language: ${language}\n${levelContext}\n${focusContext}\n\nUser Message: ${problem}` }];
  if (attachment) {
    currentParts.push({ 
      inlineData: { 
        mimeType: attachment.mimeType, 
        data: attachment.data 
      } 
    });
  }
  
  contents.push({ role: 'user', parts: currentParts });

  let modelName = reasoningMode === 'deep' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  if (reasoningMode === 'deep' && (mode === 'exam' || level === UserLevel.ADVANCED)) {
    modelName = 'gemini-3-pro-preview';
  }

  const effectiveSocratic = mode === 'fast' ? false : socraticEnabled;

  let socraticInstruction = effectiveSocratic 
    ? `\n\nCRITICAL: Socratic Guidance is ACTIVE. Do not give the answer yet. Ask a question to guide them in ${language}.` 
    : `\n\nSocratic Guidance is INACTIVE. Provide the solution directly in ${language} but with clear steps.`;

  let systemInstruction = `${SYSTEM_PROMPT_CORE.replace(/\[LANGUAGE_TOKEN\]/g, language)}\n\n${MODE_INSTRUCTIONS[mode]}${socraticInstruction}`;

  let config: any = {
    systemInstruction,
    temperature: 0.1,
    tools: [{ googleSearch: {} }],
  };

  if (modelName === 'gemini-3-pro-preview') {
    config.thinkingConfig = { thinkingBudget: 16000 };
  }

  try {
    const response = await ai.models.generateContent({ 
      model: modelName, 
      contents, 
      config 
    });
    
    const citations: Citation[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of response.candidates[0].groundingMetadata.groundingChunks) {
        if (chunk.web) {
          citations.push({
            title: chunk.web.title || 'Reference',
            uri: chunk.web.uri
          });
        }
      }
    }

    return {
      text: response.text || "",
      citations,
      isError: false
    };
  } catch (error: any) {
    return {
      text: handleApiError(error, language),
      citations: [],
      isError: true
    };
  }
};

export const generateStudyNotes = async (files: FileAttachment[], language: Language): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const modelName = 'gemini-3-flash-preview';
  
  const systemInstruction = QUICKNOTES_PROMPT.replace(/\[LANGUAGE_TOKEN\]/g, language);
  
  const parts: any[] = [{ text: `Analyze all ${files.length} attached materials. Perform a deep synthesis to create a single cohesive set of high-yield study notes. Identify common patterns and key formulas across all provided context.` }];
  
  files.forEach(file => {
    parts.push({ 
      inlineData: { 
        mimeType: file.mimeType, 
        data: file.data 
      } 
    });
  });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: parts
        }
      ],
      config: { 
        systemInstruction, 
        temperature: 0.1,
        topP: 0.8 
      }
    });
    return response.text || "Analysis failed. Please try again with clearer files.";
  } catch (error) {
    console.error("QuickNotes AI Error:", error);
    return "Error: Unable to synthesize these materials. Ensure files are not corrupted and contain legible text or mathematical content.";
  }
};

export const generateIllustration = async (
  prompt: string,
  size: ImageSize = '1K',
  isManualHighRes: boolean = false
): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const model = isManualHighRes ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const imageConfig: any = { aspectRatio: "1:1" };
  if (model === 'gemini-3-pro-image-preview') {
    imageConfig.imageSize = size;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: `A clear mathematical diagram for: ${prompt}. Minimalist, vector style, white background, high contrast.` }]
      },
      config: { imageConfig }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error: any) {
    console.error("Illustration Error:", error);
    return null;
  }
};

export const generateQuiz = async (topic: string, level: UserLevel, language: Language, difficulty: QuizDifficulty = 'medium', focusAreas?: string[]): Promise<Quiz> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const focusAreasText = focusAreas && focusAreas.length > 0 ? `STRICTLY focus only on these areas: ${focusAreas.join(', ')}.` : '';
  
  const systemInstruction = `${SYSTEM_PROMPT_CORE.replace(/\[LANGUAGE_TOKEN\]/g, language)}
  
### QUIZ GENERATION DIRECTIVE:
- Generate a 5-question math quiz for a ${level} student.
- Difficulty: ${difficulty}.
- ${focusAreasText}
- Use formal, clear, textbook-style ${language === 'BM' ? 'Bahasa Melayu' : 'English'}.
- MCQ options must remain labeled A, B, C, D.
- Return JSON only. Use LaTeX for math.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Topic: ${topic}\nLevel: ${level}\nDifficulty: ${difficulty}\n${focusAreasText}`,
      config: {
        systemInstruction,
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
      },
    });
    
    const jsonStr = response.text || "{}";
    return JSON.parse(jsonStr.trim());
  } catch (error) { 
    console.error("Quiz Generation Error:", error);
    throw error; 
  }
};
