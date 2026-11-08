import React, { useCallback, useRef, useState } from 'react';
import { Outfit, User } from '../types';
import { ICONS } from '../constants';
import { geminiService } from '../services/geminiService';
import { useImageUpload } from '../hooks/useImageUpload';
import { ScreenProps } from './shared';

interface Props extends ScreenProps {
  user: User | null;
  outfit: Outfit | null;
  onScanUsed: (user: User) => Promise<void>;
}

export function VirtualMirror({ t, user, outfit, onNavigate, onScanUsed }: Props) {
  const [isMirrorLoading, setIsMirrorLoading] = useState(false);
  const [mirrorResult, setMirrorResult] = useState<string | null>(null);
  const [fitFeedback, setFitFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useImageUpload(useCallback(async (dataUri: string) => {
    if (!user || !outfit) return;
    setIsMirrorLoading(true);
    try {
      const [mirrorImg, feedback] = await Promise.all([
        geminiService.tryOnOutfit(dataUri, `${outfit.name} by ${outfit.brand}. ${outfit.explanation}`),
        geminiService.analyzeFit(dataUri, outfit)
      ]);
      setMirrorResult(mirrorImg);
      setFitFeedback(feedback);
      await onScanUsed(user);
    } catch (error) {
      console.error("Mirror architecture failed", error);
    } finally {
      setIsMirrorLoading(false);
    }
  }, [user, outfit, onScanUsed]));

  return (
    <div className="min-h-screen p-8 bg-black text-white animate-in slide-in-from-bottom duration-500 text-center flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-12">
        <button onClick={() => onNavigate('details')} className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest flex items-center gap-2 self-start">
          <ICONS.Arrow className="w-4 h-4 rotate-180" /> {t.back}
        </button>

        <h2 className="text-4xl font-black uppercase underline underline-offset-8 decoration-zinc-800">{t.mirrorTitle}</h2>
        <p className="text-zinc-500 uppercase text-[10px] tracking-widest font-black max-w-sm mx-auto">{t.mirrorSub}</p>

        {!mirrorResult ? (
           <div className="border-4 border-dashed border-zinc-800 p-16 hover:border-white transition-all cursor-pointer group bg-zinc-900/20" onClick={() => inputRef.current?.click()}>
              <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={handleUpload} />
              {isMirrorLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin h-8 w-8 border-b-2 border-white"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t.analyzingMirror}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 border-2 border-zinc-800 mx-auto flex items-center justify-center group-hover:border-white transition-colors">
                    <svg className="w-8 h-8 text-zinc-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="font-black uppercase tracking-widest group-hover:scale-105 transition-transform">{t.uploadPhoto}</p>
                </div>
              )}
           </div>
        ) : (
           <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                 <div className="relative group">
                    <img src={mirrorResult} alt="Mirror Try On" className="w-full grayscale border border-zinc-800 shadow-2xl transition-all duration-700 hover:grayscale-0" />
                    <div className="absolute top-0 left-0 w-full h-1 bg-white animate-scan"></div>
                 </div>
                 <div className="text-left space-y-6 bg-zinc-900 p-8 border-l-4 border-white shadow-xl">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Fit Architecture Analysis</h3>
                    <div className="text-zinc-300 font-serif italic text-lg leading-relaxed whitespace-pre-wrap">
                      {fitFeedback}
                    </div>
                    <button onClick={() => { setMirrorResult(null); setFitFeedback(null); }} className="w-full border border-zinc-800 text-zinc-500 py-3 font-black uppercase text-[10px] tracking-widest hover:border-white hover:text-white transition-all">
                      Recalibrate Vessel Photo
                    </button>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
