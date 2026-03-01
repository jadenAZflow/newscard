
export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImageUrl: string | null;
  step: 'idle' | 'analyzing_link' | 'analyzing_style' | 'generating_image';
}

export interface NewsInfo {
  topic: string;
  visualKeywords: string[];
  suggestedHeadline: string;
  suggestedSummary: string;
}

export interface StyleAnalysis {
  mood: string;
  colors: string[];
  technique: string;
  lighting: string;
}

export interface CardContent {
  headline: string;
  summary: string;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
}
