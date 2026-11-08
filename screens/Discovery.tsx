import React, { useState } from 'react';
import { ICONS } from '../constants';
import { geminiService, AISearchResult } from '../services/geminiService';
import { ScreenProps } from './shared';

export function Discovery({ t, onNavigate }: ScreenProps) {
  const [vibePrompt, setVibePrompt] = useState('');
  const [ideationResult, setIdeationResult] = useState<AISearchResult | null>(null);
  const [moodboardUrl, setMoodboardUrl] = useState<string | null>(null);
  const [isIdeating, setIsIdeating] = useState(false);

  const handleArchitectVibe = async () => {
    if (!vibePrompt) return;
    setIsIdeating(true);
    try {
      const [result, moodboard] = await Promise.all([
        geminiService.getStyleIdeation(vibePrompt),
        geminiService.generateStyleMoodboard(vibePrompt)
      ]);
      setIdeationResult(result);
      setMoodboardUrl(moodboard);
    } catch (error) {
      console.error("Vibe architecture failed", error);
    } finally {
      setIsIdeating(false);
    }
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <button onClick={() => onNavigate('welcome')} className="mb-12 text-zinc-500 hover:text-white uppercase text-[10px] font-black flex items-center gap-2">
        <ICONS.Arrow className="w-4 h-4 rotate-180" /> {t.back}
      </button>
      <div className="max-w-4xl mx-auto space-y-12">
        <h2 className="text-4xl font-black tracking-tighter uppercase underline decoration-zinc-800 decoration-4 underline-offset-8">{t.vibeCheck}</h2>
        <div className="relative group">
          <textarea
            value={vibePrompt}
            onChange={(e) => setVibePrompt(e.target.value)}
            placeholder="E.g. Brutalist minimalism with high-tech materials..."
            className="w-full bg-zinc-900 border border-zinc-800 p-6 text-xl text-white focus:border-white outline-none h-40 resize-none placeholder:text-zinc-700 transition-colors"
          />
          <button onClick={handleArchitectVibe} disabled={isIdeating || !vibePrompt} className="absolute bottom-6 right-6 bg-white text-black px-6 py-2 font-black uppercase tracking-widest disabled:opacity-50">
            {isIdeating ? "Constructing..." : t.architectBtn}
          </button>
        </div>
        {ideationResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-zinc-900 p-8 border-l-4 border-white text-zinc-300 font-serif italic text-lg whitespace-pre-wrap">{ideationResult.text}</div>
            {moodboardUrl && <img src={moodboardUrl} alt="Moodboard" className="w-full grayscale border border-zinc-800" />}
          </div>
        )}
      </div>
    </div>
  );
}
