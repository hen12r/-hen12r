import { useEffect, useMemo, useState } from 'react';
import { Gender, Occasion, Outfit, Style, Weather } from '../types';
import { OUTFITS as STATIC_OUTFITS } from '../constants';
import { supabaseService } from '../services/supabaseService';

export interface OutfitFilters {
  gender: Gender | null;
  occasion: Occasion | null;
  style: Style | null;
  weather: Weather | null;
  budgetLimit: number;
}

/** Static catalog merged with Supabase outfits (by id), filtered by the survey answers. */
export function useOutfits({ gender, occasion, style, weather, budgetLimit }: OutfitFilters) {
  const [dynamicOutfits, setDynamicOutfits] = useState<Outfit[]>([]);

  useEffect(() => {
    supabaseService.getOutfits().then(setDynamicOutfits);
  }, []);

  const allOutfits = useMemo(() => {
    const combined = [...STATIC_OUTFITS, ...dynamicOutfits];
    return Array.from(new Map(combined.map(o => [o.id, o])).values());
  }, [dynamicOutfits]);

  return useMemo(() => allOutfits.filter(o =>
    (!gender || o.gender === gender) &&
    (!occasion || o.occasion === occasion) &&
    (!style || o.style === style) &&
    (!weather || o.weather === weather) &&
    o.totalPrice <= budgetLimit
  ), [allOutfits, gender, occasion, style, weather, budgetLimit]);
}
