import React, { useState } from 'react';
import { ICONS } from '../constants';
import { supabaseService } from '../services/supabaseService';
import { ScreenProps } from './shared';

export function Auth({ t, onNavigate }: ScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (isLogin) {
        await supabaseService.signInEmail(email, password);
      } else {
        await supabaseService.signUpEmail(email, password);
      }
      onNavigate('welcome');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-black text-white animate-in zoom-in duration-300">
      <div className="w-full max-w-md space-y-12">
        <button onClick={() => onNavigate('welcome')} className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
          <ICONS.Arrow className="w-3 h-3 rotate-180" /> {t.back}
        </button>
        <div className="space-y-4">
          <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{isLogin ? t.login : t.signUp}</h2>
          <p className="text-zinc-500 uppercase text-[10px] tracking-[0.2em] font-black">{t.authSub}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <input
              type="email"
              required
              className="w-full bg-zinc-900 border border-zinc-800 p-4 text-white font-bold text-sm focus:border-white outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.email}
            />
            <input
              type="password"
              required
              className="w-full bg-zinc-900 border border-zinc-800 p-4 text-white font-bold text-sm focus:border-white outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.password}
            />
          </div>
          {error && <div className="text-white bg-red-900/50 p-4 text-[10px] font-black uppercase tracking-widest border border-red-800">{error}</div>}
          <button type="submit" disabled={isLoading} className="w-full bg-white text-black py-5 font-black uppercase tracking-widest disabled:opacity-50">
            {isLoading ? t.loading : (isLogin ? t.login : t.signUp)}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full text-zinc-500 uppercase font-black text-[9px] tracking-widest hover:text-white">
          {isLogin ? t.noAccount : t.haveAccount}
        </button>
      </div>
    </div>
  );
}
