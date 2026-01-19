
import { createClient } from '@supabase/supabase-js';
import { Outfit, User } from '../types';

const SUPABASE_URL = 'https://ognlcllsttlyariioyjx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_g390iHm_H9tNPM5c946wVw_rSa--0Vc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseService = {
  // --- AUTH METHODS ---
  async signUpEmail(email: string, pass: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    if (error) throw error;
    return data;
  },

  async signInEmail(email: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // --- PROFILE METHODS ---
  async getProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        return this.createProfile(userId);
      }
      
      if (data) {
        return {
          id: data.id,
          email: data.email,
          isPro: data.is_pro,
          photosUsed: data.photos_used || 0
        };
      }
      return null;
    } catch (e) {
      console.error('Profile fetch failed', e);
      return null;
    }
  },

  async createProfile(userId: string): Promise<User | null> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId, 
          email: user?.email || '',
          is_pro: false,
          photos_used: 0
        })
        .select()
        .single();
      
      if (error) console.error("Error creating profile:", error);
      
      if (data) {
        return {
          id: data.id,
          email: data.email,
          isPro: data.is_pro,
          photosUsed: data.photos_used || 0
        };
      }
      return null;
    } catch (e) {
      console.error("Failed to create profile record:", e);
      return null;
    }
  },

  async incrementUsage(userId: string, currentCount: number) {
    const { error } = await supabase
      .from('profiles')
      .update({ photos_used: currentCount + 1 })
      .eq('id', userId);
    return !error;
  },

  async setProStatus(userId: string, status: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_pro: status })
      .eq('id', userId);
    return !error;
  },

  async getOutfits(): Promise<Outfit[]> {
    try {
      const { data, error } = await supabase
        .from('outfits')
        .select('*');
      
      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          return [];
        }
        console.error('Error fetching outfits:', error);
        return [];
      }
      return (data as Outfit[]) || [];
    } catch (e) {
      console.error('Unexpected error fetching outfits:', e);
      return [];
    }
  },

  async upsertOutfit(outfit: Outfit) {
    const { data, error } = await supabase
      .from('outfits')
      .upsert(outfit)
      .select();
    if (error) throw error;
    return data;
  }
};
