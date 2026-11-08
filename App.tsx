import React, { useState } from 'react';
import { Gender, Occasion, Style, Weather, Budget, AppStep, Outfit } from './types';
import { FREE_SCAN_LIMIT } from './constants';
import { Language, TRANSLATIONS } from './i18n/translations';
import { supabaseService } from './services/supabaseService';
import { useAuth } from './hooks/useAuth';
import { useOutfits } from './hooks/useOutfits';
import { Welcome } from './screens/Welcome';
import { HowItWorks } from './screens/HowItWorks';
import { Profile } from './screens/Profile';
import { Auth } from './screens/Auth';
import { Paywall } from './screens/Paywall';
import { VisualScan } from './screens/VisualScan';
import { VirtualMirror } from './screens/VirtualMirror';
import { Discovery } from './screens/Discovery';
import { SurveyStep } from './screens/SurveyStep';
import { Results } from './screens/Results';
import { Details } from './screens/Details';

export default function App() {
  const [step, setStep] = useState<AppStep>('welcome');
  // No language switcher exists in the UI yet; fr/es/de are ready when one is added.
  const [lang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];

  const { user, setUser, recordScan } = useAuth();

  const [gender, setGender] = useState<Gender | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [style, setStyle] = useState<Style | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [budgetLimit, setBudgetLimit] = useState<number>(Budget.MEDIUM);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);

  const filteredOutfits = useOutfits({ gender, occasion, style, weather, budgetLimit });

  const handleSignOut = async () => {
    await supabaseService.signOut();
    setStep('welcome');
  };

  /** Gate for scan/try-on features: requires sign-in and remaining free scans (or Pro). */
  const handleActionWithLimit = (targetStep: AppStep) => {
    if (!user) {
      setStep('auth');
      return;
    }
    if (!user.isPro && user.photosUsed >= FREE_SCAN_LIMIT) {
      setStep('paywall');
      return;
    }
    setStep(targetStep);
  };

  const screen = { t, onNavigate: setStep };

  return (
    <div className="font-sans antialiased bg-black min-h-screen text-zinc-100">
      {step === 'welcome' && <Welcome {...screen} user={user} onLimitedAction={handleActionWithLimit} />}
      {step === 'how-it-works' && <HowItWorks {...screen} isSignedIn={!!user} />}
      {step === 'profile' && <Profile {...screen} user={user} onSignOut={handleSignOut} />}
      {step === 'auth' && <Auth {...screen} />}
      {step === 'paywall' && <Paywall {...screen} user={user} onUserChange={setUser} />}
      {step === 'visual-scan' && <VisualScan {...screen} user={user} onScanUsed={recordScan} />}
      {step === 'virtual-mirror' && <VirtualMirror {...screen} user={user} outfit={selectedOutfit} onScanUsed={recordScan} />}
      {step === 'discovery' && <Discovery {...screen} />}
      {step === 'gender' && (
        <SurveyStep {...screen} title="Vessel Selection" next="occasion" current={gender} onSelect={setGender}
          options={[{ label: 'Male', value: Gender.MALE }, { label: 'Female', value: Gender.FEMALE }]} />
      )}
      {step === 'occasion' && (
        <SurveyStep {...screen} title="Purpose" next="style" current={occasion} onSelect={setOccasion}
          options={Object.values(Occasion).map(o => ({ label: o, value: o }))} />
      )}
      {step === 'style' && (
        <SurveyStep {...screen} title="Aesthetic Dial" next="weather" current={style} onSelect={setStyle}
          options={Object.values(Style).map(s => ({ label: s, value: s }))} />
      )}
      {step === 'weather' && (
        <SurveyStep {...screen} title="Atmosphere" next="budget" current={weather} onSelect={setWeather}
          options={Object.values(Weather).map(w => ({ label: w, value: w }))} />
      )}
      {step === 'budget' && (
        <SurveyStep {...screen} title="Budget" next="results" current={budgetLimit} onSelect={setBudgetLimit}
          options={[{ label: '30€', value: 30 }, { label: '50€', value: 50 }, { label: '100€', value: 100 }]} />
      )}
      {step === 'results' && (
        <Results {...screen} outfits={filteredOutfits} onSelect={outfit => { setSelectedOutfit(outfit); setStep('details'); }} />
      )}
      {step === 'details' && selectedOutfit && (
        <Details {...screen} outfit={selectedOutfit} onTryOn={() => handleActionWithLimit('virtual-mirror')} />
      )}
    </div>
  );
}
