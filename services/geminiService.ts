
import { GoogleGenAI, Type } from "@google/genai";
import { NewsInfo, StyleAnalysis } from "../types";

// Helper to safely get API key in both Vite (browser) and Node environments
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  // @ts-ignore - Ignore Vite specific import.meta error in standard TS
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  return '';
};

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: getApiKey() });
};

export const analyzeNewsLink = async (url: string): Promise<NewsInfo> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze this news link: ${url}. 
    Please extract the core message and provide the results in STICT JSON format.
    JSON keys: "topic" (string), "visualKeywords" (array of strings), "suggestedHeadline" (string), "suggestedSummary" (string).
    
    1. A punchy, impactful headline for a card news slide (max 25 characters).
    2. A concise 2-3 sentence summary that covers the most important facts.
    3. The main subject topic.
    4. 5 visual keywords that represent the mood and subject of the news.
    5. Must be in Korean.
    
    Return ONLY the raw JSON string.`,
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  // Safely extract text string from response
  let rawText = "";
  try {
    rawText = response.text || JSON.stringify(response);
  } catch (e) {
    rawText = JSON.stringify(response);
  }

  if (typeof rawText !== 'string') {
    rawText = String(rawText);
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error("Gemini failed to return JSON:", rawText);
    // Return a dummy object so the UI doesn't crash completely
    return {
      topic: "News Analysis",
      visualKeywords: ["News", "Report", "Info"],
      suggestedHeadline: "카드 뉴스를 생성할 수 없습니다",
      suggestedSummary: "AI가 링크 내용을 분석하지 못했습니다. 직접 내용을 입력해 보시거나 다른 링크를 시도해 주세요."
    };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("JSON Parse Error:", e, "Raw text:", rawText);
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }
};

export const analyzeNewsContent = async (content: string): Promise<NewsInfo> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze this news content: ${content}.
    Please extract the core message and provide:
    1. A punchy, impactful headline for a card news slide (max 25 characters).
    2. A concise 2-3 sentence summary that covers the most important facts.
    3. The main subject topic.
    4. 5 visual keywords that represent the mood and subject of the news.
    5. Must be in Korean`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          visualKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          suggestedHeadline: { type: Type.STRING },
          suggestedSummary: { type: Type.STRING }
        },
        required: ["topic", "visualKeywords", "suggestedHeadline", "suggestedSummary"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const analyzeStyle = async (base64Image: string): Promise<StyleAnalysis> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        { text: "Analyze this image's style for a background template. Identify its mood, primary colors, artistic style (e.g., photo, 3D render, minimalist vector), and lighting quality." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mood: { type: Type.STRING },
          colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          technique: { type: Type.STRING },
          lighting: { type: Type.STRING }
        },
        required: ["mood", "colors", "technique", "lighting"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateCardBackground = async (news: NewsInfo, style: StyleAnalysis): Promise<string> => {
  const ai = getAIClient();

  const visualKeywords = Array.isArray(news.visualKeywords) ? news.visualKeywords.join(', ') : '';
  const colors = Array.isArray(style.colors) ? style.colors.join(', ') : '';

  const prompt = `Generate a high-resolution, professional background image (640x640) for a news card about "${news.topic || 'news'}".
  Visual keywords: ${visualKeywords}.
  Mood: ${style.mood || 'Professional'}.
  Colors to emphasize: ${colors}.
  Technique: ${style.technique || 'Clean and minimal'}.
  Lighting: ${style.lighting || 'Cinematic'}.
  
  CRITICAL RULES:
  - DO NOT include any text, letters, or logos in the image.
  - Keep the bottom half of the image relatively simple and clean to allow for text overlay.
  - The image should feel like a premium template background.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      }
    }
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Failed to generate image background.");
};
