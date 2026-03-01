
import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import { GenerationState, CardContent } from './types';
import { analyzeNewsLink, analyzeNewsContent, analyzeStyle, generateCardBackground } from './services/geminiService';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState<'link' | 'content'>('link');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  // App State
  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    generatedImageUrl: null,
    step: 'idle'
  });

  // Rendered Content (Used by Canvas)
  const [cardContent, setCardContent] = useState<CardContent>({
    headline: '',
    summary: '',
    textColor: '#ffffff',
    textAlign: 'center'
  });

  // Draft Content (Used by Inputs before "Apply")
  const [draftContent, setDraftContent] = useState<CardContent>({
    headline: '',
    summary: '',
    textColor: '#ffffff',
    textAlign: 'center'
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'link' && !url) return;
    if (activeTab === 'content' && !content) return;

    setState({
      ...state,
      isLoading: true,
      error: null,
      step: activeTab === 'link' ? 'analyzing_link' : 'analyzing_content'
    });

    try {
      // 1. Analyze Content or Link
      const newsInfo = activeTab === 'link'
        ? await analyzeNewsLink(url)
        : await analyzeNewsContent(content);

      // Update drafts immediately
      // AI sometimes returns JSON with varying keys. We fallback to empty string if undefined.
      const parsedHeadline = newsInfo.suggestedHeadline || (newsInfo as any).headline || '';
      const parsedSummary = newsInfo.suggestedSummary || (newsInfo as any).summary || '';

      const newDraft = {
        ...draftContent,
        headline: parsedHeadline,
        summary: parsedSummary
      };
      setDraftContent(newDraft);
      // Also update render state for immediate first preview
      setCardContent(newDraft);

      let styleInfo = {
        mood: "Professional and clean",
        colors: ["White", "Blue", "Navy"],
        technique: "High-end photography",
        lighting: "Cinematic"
      };

      // 2. Style Analysis
      if (referenceImage) {
        setState(prev => ({ ...prev, step: 'analyzing_style' }));
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(referenceImage);
        });
        styleInfo = await analyzeStyle(base64);
      }

      // 3. Generate Image
      setState(prev => ({ ...prev, step: 'generating_image' }));
      const imageUrl = await generateCardBackground(newsInfo, styleInfo);

      setState({
        isLoading: false,
        error: null,
        generatedImageUrl: imageUrl,
        step: 'idle'
      });
    } catch (err: any) {
      setState({
        isLoading: false,
        error: err.message || 'Error occurred during generation.',
        generatedImageUrl: null,
        step: 'idle'
      });
    }
  };

  const handleApplyChanges = () => {
    setCardContent(draftContent);
  };

  useEffect(() => {
    if (state.generatedImageUrl && canvasRef.current) {
      renderCanvas();
    }
  }, [state.generatedImageUrl, cardContent]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = state.generatedImageUrl!;
    img.onload = () => {
      // 1. Draw Background
      ctx.clearRect(0, 0, 640, 640);
      ctx.drawImage(img, 0, 0, 640, 640);

      const headlineText = cardContent.headline || '헤드라인을 입력해주세요';
      const summaryText = cardContent.summary || '여기에 요약 내용을 입력해주세요. 내용이 없다면 좌측 패널에서 입력 가능합니다.';

      // 2. Legibility Overlay (Gradient)
      const gradient = ctx.createLinearGradient(0, 300, 0, 640);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.4)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 300, 640, 340);

      // 3. Text Styling
      ctx.fillStyle = cardContent.textColor || '#FFFFFF';
      ctx.textAlign = cardContent.textAlign || 'left';
      ctx.textBaseline = 'bottom';

      const padding = 50;
      let xPos = 320;
      if (cardContent.textAlign === 'left') xPos = padding;
      if (cardContent.textAlign === 'right') xPos = 640 - padding;

      // Draw Summary (Bottom-most)
      ctx.font = 'normal 18px "Inter", sans-serif';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      const summaryLines = wrapText(ctx, summaryText, 640 - (padding * 2));
      const summaryYStart = 590 - (summaryLines.length - 1) * 26;

      summaryLines.forEach((line, i) => {
        ctx.fillText(line, xPos, summaryYStart + (i * 26));
      });

      // Draw Headline (Above Summary)
      ctx.font = 'bold 40px "Inter", sans-serif';
      ctx.shadowBlur = 8;
      const headlineLines = wrapText(ctx, headlineText, 640 - (padding * 2));
      const headlineYStart = summaryYStart - 40 - (headlineLines.length - 1) * 48;

      headlineLines.forEach((line, i) => {
        ctx.fillText(line, xPos, headlineYStart + (i * 48));
      });
    };
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const downloadFinalImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png', 1.0);
    link.download = `news-card-${Date.now()}.png`;
    link.click();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Use import.meta.env for Vite or process.env (mapped in vite.config.ts)
    const validUser = (import.meta as any).env?.VITE_USERNAME || process.env.USERNAME || 'gabang';
    const validPass = (import.meta as any).env?.VITE_PASSWORD || process.env.PASSWORD || '10jobs';

    if (loginUser === validUser && loginPass === validPass) {
      setIsLoggedIn(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center flex-col items-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-all duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
              Card News Studio
            </h2>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-2xl shadow-indigo-100 sm:rounded-[2rem] sm:px-10 border border-gray-100">
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-bold text-gray-700">Username</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-medium transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700">Password</label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-medium transition-colors"
                  />
                </div>
              </div>

              {loginError && (
                <div className="text-red-500 text-sm font-bold flex items-center space-x-1 justify-center bg-red-50 py-2 rounded-lg">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  <span>Invalid username or password</span>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98]"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Editor Controls */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Step 1: Background</h2>
                {state.isLoading && (
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold animate-pulse">
                    {state.step.replace('_', ' ')}
                  </span>
                )}
              </div>

              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('link')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'link' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('content')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'content' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Content
                  </button>
                </div>

                {activeTab === 'link' ? (
                  <div className="space-y-1">
                    <label htmlFor="url-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">News Link</label>
                    <input
                      id="url-input"
                      type="url"
                      required
                      placeholder="https://..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label htmlFor="content-input" className="text-xs font-bold text-gray-400 uppercase tracking-wider">News Content</label>
                    <textarea
                      id="content-input"
                      required
                      rows={5}
                      placeholder="Paste your news content here..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  </div>
                )}

                <div className="relative">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Style Reference (Optional)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer min-h-[100px]">
                    {previewUrl ? (
                      <div className="flex items-center space-x-3 w-full">
                        <img src={previewUrl} className="h-16 w-16 object-cover rounded-lg shadow-sm" alt="Preview" />
                        <div className="flex-grow">
                          <p className="text-xs font-medium text-gray-500 truncate">{referenceImage?.name}</p>
                          <button
                            type="button"
                            onClick={() => { setPreviewUrl(null); setReferenceImage(null); }}
                            className="text-xs text-red-500 font-bold hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer text-center w-full">
                        <span className="text-sm text-gray-400 font-medium">Click to upload reference image</span>
                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                      </label>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={state.isLoading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2"
                >
                  {state.isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      <span>Generate Background</span>
                    </>
                  )}
                </button>
              </form>
            </section>

            {state.generatedImageUrl && (
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center justify-between">
                  <span>Step 2: Content Overlay</span>
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full font-bold">Background Ready</span>
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Headline</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-lg"
                      value={draftContent.headline}
                      onChange={(e) => setDraftContent({ ...draftContent, headline: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Summary</label>
                    <textarea
                      rows={4}
                      className="w-full mt-1 px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm leading-relaxed"
                      value={draftContent.summary}
                      onChange={(e) => setDraftContent({ ...draftContent, summary: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Text Color</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="color"
                          className="h-10 w-12 rounded cursor-pointer"
                          value={draftContent.textColor}
                          onChange={(e) => setDraftContent({ ...draftContent, textColor: e.target.value })}
                        />
                        <span className="text-xs font-mono text-gray-400">{draftContent.textColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alignment</label>
                      <div className="flex mt-1 bg-gray-100 p-1 rounded-lg">
                        {(['left', 'center', 'right'] as const).map(a => (
                          <button
                            key={a}
                            onClick={() => setDraftContent({ ...draftContent, textAlign: a })}
                            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${draftContent.textAlign === a ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            {a.charAt(0).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyChanges}
                    className="w-full py-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold transition-all border border-indigo-200 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span>Apply Changes to Preview</span>
                  </button>
                </div>
              </section>
            )}

            {state.error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-medium flex items-center space-x-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                <span>{state.error}</span>
              </div>
            )}
          </div>

          {/* Canvas Preview Area */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="sticky top-10 w-full max-w-[640px] flex flex-col items-center">
              <div className="bg-white p-3 rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden w-full aspect-square relative group">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={640}
                  className={`w-full h-full rounded-[1.8rem] transition-opacity duration-300 ${state.generatedImageUrl ? 'opacity-100 shadow-inner' : 'opacity-0'}`}
                />

                {!state.generatedImageUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-4">
                    <div className={`p-8 rounded-full ${state.isLoading ? 'bg-indigo-50' : 'bg-gray-50'} transition-colors`}>
                      <svg className={`w-16 h-16 ${state.isLoading ? 'text-indigo-400 animate-pulse' : 'text-gray-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-900 font-bold text-lg">{state.isLoading ? 'Synthesizing...' : 'No Preview Yet'}</p>
                      <p className="text-gray-400 text-sm">Enter a news link or paste content to start creating your professional card news.</p>
                    </div>
                  </div>
                )}
              </div>

              {state.generatedImageUrl && (
                <div className="mt-8 w-full flex flex-col items-center">
                  <button
                    onClick={downloadFinalImage}
                    className="group relative w-full py-5 bg-gray-900 hover:bg-black text-white rounded-[1.5rem] font-bold flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-2xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>Download Card News Image</span>
                  </button>
                  <p className="mt-4 text-xs text-gray-400 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    Final image size: 640x640 pixels (PNG)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
