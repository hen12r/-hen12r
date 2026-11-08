import React, { useCallback, useRef, useState } from 'react';
import { User } from '../types';
import { geminiService, PersonaAnalysis } from '../services/geminiService';
import { useImageUpload } from '../hooks/useImageUpload';
import { ScreenProps } from './shared';

interface Props extends ScreenProps {
  user: User | null;
  onScanUsed: (user: User) => Promise<void>;
}

export function VisualScan({ t, user, onNavigate, onScanUsed }: Props) {
  const [persona, setPersona] = useState<PersonaAnalysis | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useImageUpload(useCallback(async (dataUri: string) => {
    if (!user) return;
    setIsScanning(true);
    try {
      setPersona(await geminiService.analyzeUserPersona(dataUri));
      await onScanUsed(user);
    } catch (error) {
      console.error("Visual scan failed", error);
    } finally {
      setIsScanning(false);
    }
  }, [user, onScanUsed]));

  return (
    <div className="min-h-screen p-8 bg-black text-white animate-in slide-in-from-bottom duration-500 text-center flex flex-col items-center justify-center">
      <div className="max-w-xl w-full space-y-12">
        <h2 className="text-4xl font-black uppercase underline underline-offset-8 decoration-zinc-800">{t.scanTitle}</h2>
        {!persona ? (
           <div className="border-4 border-dashed border-zinc-800 p-12 hover:border-white transition-all cursor-pointer group" onClick={() => inputRef.current?.click()}>
              <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={handleUpload} />
              {isScanning ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin h-8 w-8 border-b-2 border-white"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Analyzing Archetype...</p>
                </div>
              ) : (
                <p className="font-black uppercase tracking-widest group-hover:scale-105 transition-transform">{t.uploadPhoto}</p>
              )}
           </div>
        ) : (
           <div className="space-y-8 text-left bg-zinc-900 p-8 border-l-4 border-white animate-in fade-in">
              <h3 className="text-2xl font-black uppercase">{persona.archetype}</h3>
              <div className="flex gap-2">
                {persona.suggestedColors.map(c => (
                  <div key={c} className="w-6 h-6 rounded-full border border-zinc-700" style={{ backgroundColor: c.toLowerCase() }}></div>
                ))}
              </div>
              <p className="text-zinc-400 italic">{persona.logic}</p>
              <button onClick={() => onNavigate('results')} className="w-full bg-white text-black py-4 font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors">{t.viewRecs}</button>
           </div>
        )}
        <button onClick={() => onNavigate('welcome')} className="text-zinc-600 py-2 font-black uppercase text-[10px] tracking-widest hover:text-white">{t.back}</button>
      </div>
    </div>
  );
}
