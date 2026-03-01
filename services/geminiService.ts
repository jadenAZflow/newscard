
import { GoogleGenAI, Type } from "@google/genai";
import { NewsInfo, StyleAnalysis } from "../types";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const analyzeNewsLink = async (url: string): Promise<NewsInfo> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze this news link: ${url}. 
    Please extract the core message and provide:
    1. A punchy, impactful headline for a card news slide (max 25 characters).
    2. A concise 2-3 sentence summary that covers the most important facts.
    3. The main subject topic.
    4. 5 visual keywords that represent the mood and subject of the news.
    5. Must be in Korean`,
    config: {
      tools: [{ googleSearch: {} }],
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
      tools: [{ googleSearch: {} }],
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

  const prompt = `Generate a high-resolution, professional background image (640x640) for a news card about "${news.topic}".
  Visual keywords: ${news.visualKeywords.join(', ')}.
  Mood: ${style.mood}.
  Colors to emphasize: ${style.colors.join(', ')}.
  Technique: ${style.technique}.
  Lighting: ${style.lighting}.
  
  CRITICAL RULES:
  - DO NOT include any text, letters, or logos in the image.
  - Keep the bottom half of the image relatively simple and clean to allow for text overlay.
  - The image should feel like a premium template background.`;

  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "1:1",
    }
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (imageBytes) {
    return `data:image/png;base64,${imageBytes}`;
  }

  throw new Error("Failed to generate image background.");
};
