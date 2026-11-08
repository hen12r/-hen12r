import React from 'react';
import { Outfit } from '../types';
import { ScreenProps } from './shared';

interface Props extends ScreenProps {
  outfits: Outfit[];
  onSelect: (outfit: Outfit) => void;
}

export function Results({ t, outfits, onSelect, onNavigate }: Props) {
  return (
    <div className="p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex justify-between items-end">
          <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">{t.results}</h2>
          <button onClick={() => onNavigate('gender')} className="bg-white text-black px-8 py-3 font-bold uppercase tracking-widest">{t.reSurvey}</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {outfits.map(outfit => (
            <div key={outfit.id} onClick={() => onSelect(outfit)} className="group cursor-pointer space-y-4">
              <div className="aspect-[3/4] overflow-hidden bg-zinc-900 border border-zinc-800"><img src={outfit.imageUrls[0]} alt={outfit.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" /></div>
              <div>
                <h3 className="font-bold uppercase text-sm tracking-tight">{outfit.name}</h3>
                <p className="text-[10px] text-zinc-500 uppercase font-black">{outfit.brand} • {outfit.totalPrice}€</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
