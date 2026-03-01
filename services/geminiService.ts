import { NewsInfo, StyleAnalysis } from "../types";

const callApi = async (action: string, payload: any) => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'API call failed');
  }

  return response.json();
};

export const analyzeNewsLink = async (url: string): Promise<NewsInfo> => {
  return callApi('analyzeNewsLink', { url });
};

export const analyzeNewsContent = async (content: string): Promise<NewsInfo> => {
  return callApi('analyzeNewsContent', { content });
};

export const analyzeStyle = async (base64Image: string): Promise<StyleAnalysis> => {
  return callApi('analyzeStyle', { base64Image });
};

export const generateCardBackground = async (news: NewsInfo, style: StyleAnalysis): Promise<string> => {
  return callApi('generateCardBackground', { news, style });
};
