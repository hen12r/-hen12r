
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Gender, Occasion, Style, Weather, Budget, AppStep, Outfit, User, OutfitItem } from './types';
import { OUTFITS as STATIC_OUTFITS, ICONS } from './constants';
import { geminiService, AISearchResult, PersonaAnalysis } from './services/geminiService';
import { supabase, supabaseService } from './services/supabaseService';

type Language = 'en' | 'fr' | 'es' | 'de';

const TRANSLATIONS: Record<Language, any> = {
  en: {
    welcomeTitle: "Elite Style.\nYour Terms.",
    welcomeSub: "Complete outfits for any budget. One architect. One vision.",
    getStarted: "Get Started",
    vibeCheck: "Vibe Check",
    howItWorks: "The Process",
    profile: "Profile",
    profileTitle: "Architect Profile",
    accountInfo: "Account Information",
    status: "Status",
    free: "Free Tier",
    premium: "Premium Tier",
    howStep1Title: "01. ARCHIVE THE VIBE",
    howStep1Desc: "Upload a photo or describe your aesthetic. We scan the digital archives for your blueprint.",
    howStep2Title: "02. AI ARCHITECTURE",
    howStep2Desc: "Our Style Architect 'AL' constructs a complete outfit using real-world items that fit your budget.",
    howStep3Title: "03. EXECUTE THE FIT",
    howStep3Desc: "Receive your monthly blueprint. One click to purchase. Zero friction. Total control.",
    alDesc: "Write the vibe you want. I'll architect a blueprint for you with real items.",
    architectBtn: "Architect My Style",
    results: "Looks",
    back: "Back",
    reSurvey: "Start New Survey",
    visualScanBtn: "Scan My Vibe",
    scanTitle: "Vibe Architecture",
    authTitle: "Access The Archive",
    authSub: "Sign in to save your architectures and monthly blueprints.",
    login: "Log In",
    signUp: "Sign Up",
    signOut: "Log Out",
    email: "Email Address",
    password: "Password",
    haveAccount: "Already have an account? Log in",
    noAccount: "Don't have an account? Sign up",
    loading: "Verifying credentials...",
    authSuccess: "Access Granted.",
    paywallTitle: "Limit Reached",
    paywallSub: "Free archives are limited to 2 visual scans. Upgrade to Premium for unlimited architecture.",
    upgradeBtn: "Upgrade to Premium — €4.99/mo",
    freeRemaining: "scans remaining",
    proActive: "PRO ACCESS ACTIVE",
    unlimited: "Unlimited Scans",
    buyLook: "Get this look",
    tryOnBtn: "Virtual Try-On",
    mirrorTitle: "Virtual Mirror",
    mirrorSub: "Upload a full-body photo to see the fit architecture on your vessel.",
    analyzingMirror: "Architecting Fit...",
    blueprintInventory: "Blueprint Inventory",
    findItem: "Find Item",
    estimatedPrice: "Est. Price",
    uploadPhoto: "Upload Photo",
    viewRecs: "View Recommendations"
  },
  fr: {
    welcomeTitle: "Style Élite.\nVos Conditions.",
    welcomeSub: "Des tenues complètes pour tous les budgets. Un architecte. Une vision.",
    getStarted: "Commencer",
    vibeCheck: "Vibe Check",
    howItWorks: "Le Processus",
    profile: "Profil",
    profileTitle: "Profil de l'Architecte",
    accountInfo: "Informations du Compte",
    status: "Statut",
    free: "Niveau Gratuit",
    premium: "Niveau Premium",
    howStep1Title: "01. ARCHIVER LA VIBE",
    howStep1Desc: "Téléchargez une photo ou décrivez votre esthétique. Nous scannons les archives numériques.",
    howStep2Title: "02. ARCHITECTURE IA",
    howStep2Desc: "Notre architecte de style 'AL' construit une tenue complète avec des articles réels.",
    howStep3Title: "03. EXÉCUTER LE FIT",
    howStep3Desc: "Recevez votre plan mensuel. Un clic pour acheter. Zéro friction. Contrôle total.",
    alDesc: "Écrivez l'ambiance que vous voulez. J'élaborerai un plan pour vous avec de vrais articles.",
    architectBtn: "Architecturer Mon Style",
    results: "Looks",
    back: "Retour",
    reSurvey: "Nouvelle enquête",
    visualScanBtn: "Scanner ma Vibe",
    scanTitle: "Architecture de la Vibe",
    authTitle: "Accès aux Archives",
    authSub: "Connectez-vous pour enregistrer vos architectures.",
    login: "Se Connecter",
    signUp: "S'Inscrire",
    signOut: "Déconnexion",
    email: "Adresse Email",
    password: "Mot de passe",
    haveAccount: "Déjà un compte ? Connexion",
    noAccount: "Pas de compte ? Créer un compte",
    loading: "Vérification...",
    paywallTitle: "Limite Atteinte",
    paywallSub: "Les archives gratuites sont limitées à 2 scans. Passez à Premium pour un accès illimité.",
    upgradeBtn: "Passer à Premium — 4,99€/mois",
    freeRemaining: "scans restants",
    proActive: "ACCÈS PRO ACTIF",
    unlimited: "Scans Illimités",
    buyLook: "Acheter ce look",
    tryOnBtn: "Essai Virtuel",
    mirrorTitle: "Miroir Virtuel",
    mirrorSub: "Téléchargez une photo pour voir la tenue sur vous.",
    analyzingMirror: "Architecture du Fit...",
    uploadPhoto: "Télécharger une photo",
    viewRecs: "Voir les recommandations"
  },
  es: {
    welcomeTitle: "Estilo de Élite.\nSus Condiciones.",
    welcomeSub: "Conjuntos completos para cualquier presupuesto. Un arquitecto. Una visión.",
    getStarted: "Empezar",
    vibeCheck: "Vibe Check",
    howItWorks: "El Proceso",
    profile: "Perfil",
    profileTitle: "Perfil del Arquitecto",
    accountInfo: "Información de la Cuenta",
    status: "Estado",
    free: "Nivel Gratuito",
    premium: "Nivel Premium",
    howStep1Title: "01. ARCHIVAR LA VIBRA",
    howStep1Desc: "Sube una foto o describe tu estética. Escaneamos los archivos digitales.",
    howStep2Title: "02. ARQUITECTURA IA",
    howStep2Desc: "Nuestro Arquitecto de Estilo 'AL' construye un conjunto completo con artículos reales.",
    howStep3Title: "03. EJECUTAR EL FIT",
    howStep3Desc: "Recibe tu plano mensual. Un clic para comprar. Cero fricción. Control total.",
    alDesc: "Escribe la vibra que deseas. Diseñaré un plano para ti con artículos reales.",
    architectBtn: "Arquitectar mi Estilo",
    results: "Looks",
    back: "Atrás",
    reSurvey: "Nueva Encuesta",
    visualScanBtn: "Escanear mi Vibra",
    scanTitle: "Arquitectura de Vibra",
    authTitle: "Acceso al Archivo",
    authSub: "Inicia sesión para guardar tus arquitecturas.",
    login: "Iniciar Sesión",
    signUp: "Registrarse",
    signOut: "Cerrar Sesión",
    email: "Correo Electrónico",
    password: "Contraseña",
    haveAccount: "¿Ya tienes cuenta? Iniciar sesión",
    noAccount: "¿No tienes cuenta? Regístrate",
    loading: "Verificando...",
    paywallTitle: "Límite Alcanzado",
    paywallSub: "Los archivos gratuitos están limitados a 2 escaneos. Actualiza a Premium para acceso ilimitado.",
    upgradeBtn: "Actualizar a Premium — €4.99/mes",
    freeRemaining: "escaneos restantes",
    proActive: "ACCESO PRO ACTIVO",
    unlimited: "Escaneos Ilimitados",
    buyLook: "Comprar este look",
    tryOnBtn: "Probador Virtual",
    mirrorTitle: "Espejo Virtual",
    mirrorSub: "Sube una foto para ver el conjunto en tu cuerpo.",
    analyzingMirror: "Arquitectando el Fit...",
    uploadPhoto: "Subir Foto",
    viewRecs: "Ver Recomendaciones"
  },
  de: {
    welcomeTitle: "Elite Style.\nDeine Bedingungen.",
    welcomeSub: "Komplette Outfits für jedes Budget. Ein Architekt. Eine Vision.",
    getStarted: "Anfangen",
    vibeCheck: "Vibe Check",
    howItWorks: "Der Prozess",
    profile: "Profil",
    profileTitle: "Architektenprofil",
    accountInfo: "Kontoinformationen",
    status: "Status",
    free: "Kostenlose Stufe",
    premium: "Premium-Stufe",
    howStep1Title: "01. DEN VIBE ARCHIVIEREN",
    howStep1Desc: "Lade ein Foto hoch oder beschreibe deine Ästhetik. Wir scannen die digitalen Archive.",
    howStep2Title: "02. KI-ARCHITEKTUR",
    howStep2Desc: "Unser Stil-Architekt 'AL' entwirft ein komplettes Outfit mit echten Artikeln.",
    howStep3Title: "03. DEN FIT AUSFÜHREN",
    howStep3Desc: "Erhalte deinen monatlichen Plan. Ein Klick zum Kaufen. Null Reibung. Totale Kontrolle.",
    alDesc: "Schreibe den Vibe, den du willst. Ich entwerfe einen Plan für dich mit echten Artikeln.",
    architectBtn: "Meinen Stil entwerfen",
    results: "Looks",
    back: "Zurück",
    reSurvey: "Neue Umfrage",
    visualScanBtn: "Meinen Vibe scannen",
    scanTitle: "Vibe-Architektur",
    authTitle: "Archiv-Zugriff",
    authSub: "Anmelden, um deine Entwürfe zu speichern.",
    login: "Anmelden",
    signUp: "Registrieren",
    signOut: "Abmelden",
    email: "E-Mail-Adresse",
    password: "Passwort",
    haveAccount: "Bereits ein Konto? Anmelden",
    noAccount: "Kein Konto? Registrieren",
    loading: "Überprüfung...",
    paywallTitle: "Limit erreicht",
    paywallSub: "Kostenlose Archive sind auf 2 Scans begrenzt. Upgrade auf Premium für unbegrenzten Zugriff.",
    upgradeBtn: "Upgrade auf Premium — €4,99/Monat",
    freeRemaining: "Scans übrig",
    proActive: "PRO-ZUGANG AKTIV",
    unlimited: "Unbegrenzte Scans",
    buyLook: "Look kaufen",
    tryOnBtn: "Virtuelle Anprobe",
    mirrorTitle: "Virtueller Spiegel",
    mirrorSub: "Lade ein Foto hoch, um das Outfit an dir zu sehen.",
    analyzingMirror: "Fit wird entworfen...",
    uploadPhoto: "Foto hochladen",
    viewRecs: "Empfehlungen ansehen"
  }
};

export default function App() {
  const [step, setStep] = useState<AppStep>('welcome');
  const [lang, setLang] = useState<Language>('en');
  const [user, setUser] = useState<User | null>(null);
  const [dynamicOutfits, setDynamicOutfits] = useState<Outfit[]>([]);
  
  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Selection State
  const [gender, setGender] = useState<Gender | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [style, setStyle] = useState<Style | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [budgetLimit, setBudgetLimit] = useState<number>(Budget.MEDIUM);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [persona, setPersona] = useState<PersonaAnalysis | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanImage, setScanImage] = useState<string | null>(null);

  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [vibePrompt, setVibePrompt] = useState('');
  const [ideationResult, setIdeationResult] = useState<AISearchResult | null>(null);
  const [moodboardUrl, setMoodboardUrl] = useState<string | null>(null);
  const [isIdeating, setIsIdeating] = useState(false);
  
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  // Mirror State
  const [isMirrorLoading, setIsMirrorLoading] = useState(false);
  const [mirrorResult, setMirrorResult] = useState<string | null>(null);
  const [fitFeedback, setFitFeedback] = useState<string | null>(null);

  const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];
  const scanInputRef = useRef<HTMLInputElement>(null);
  const mirrorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabaseService.getProfile(session.user.id).then(setUser);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabaseService.getProfile(session.user.id).then(setUser);
      } else {
        setUser(null);
      }
    });
    
    supabaseService.getOutfits().then(setDynamicOutfits);
    return () => subscription.unsubscribe();
  }, []);

  const allOutfits = useMemo(() => {
    const combined = [...STATIC_OUTFITS, ...dynamicOutfits];
    const unique = Array.from(new Map(combined.map(o => [o.id, o])).values());
    return unique;
  }, [dynamicOutfits]);

  const filteredOutfits = useMemo(() => {
    return allOutfits.filter(o => {
      const matchesSurvey = (!gender || o.gender === gender) &&
        (!occasion || o.occasion === occasion) &&
        (!style || o.style === style) &&
        (!weather || o.weather === weather) &&
        (o.totalPrice <= budgetLimit);
      if (!searchQuery) return matchesSurvey;
      const q = searchQuery.toLowerCase();
      return matchesSurvey && (o.name.toLowerCase().includes(q) || o.brand.toLowerCase().includes(q));
    });
  }, [allOutfits, gender, occasion, style, weather, budgetLimit, searchQuery]);

  // --- HANDLERS ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (isLogin) {
        await supabaseService.signInEmail(authEmail, authPass);
      } else {
        await supabaseService.signUpEmail(authEmail, authPass);
      }
      setStep('welcome');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabaseService.signOut();
    setStep('welcome');
  };

  const handleActionWithLimit = (targetStep: AppStep) => {
    if (!user) {
      setStep('auth');
      return;
    }
    
    if (!user.isPro && user.photosUsed >= 2) {
      setStep('paywall');
      return;
    }
    
    setStep(targetStep);
  };

  const handleVisualScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setScanImage(base64);
      setIsScanning(true);
      try {
        const result = await geminiService.analyzeUserPersona(base64);
        setPersona(result);
        await supabaseService.incrementUsage(user.id, user.photosUsed);
        setUser({ ...user, photosUsed: user.photosUsed + 1 });
      } catch (error) {
        console.error("Visual scan failed", error);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVirtualMirrorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedOutfit) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setIsMirrorLoading(true);
      try {
        const [mirrorImg, feedback] = await Promise.all([
          geminiService.tryOnOutfit(base64, `${selectedOutfit.name} by ${selectedOutfit.brand}. ${selectedOutfit.explanation}`),
          geminiService.analyzeFit(base64, selectedOutfit)
        ]);
        setMirrorResult(mirrorImg);
        setFitFeedback(feedback);
        await supabaseService.incrementUsage(user.id, user.photosUsed);
        setUser({ ...user, photosUsed: user.photosUsed + 1 });
      } catch (error) {
        console.error("Mirror architecture failed", error);
      } finally {
        setIsMirrorLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubscribe = async () => {
    if (!user) return;
    setIsUpgrading(true);
    await new Promise(r => setTimeout(r, 2000));
    try {
      await supabaseService.setProStatus(user.id, true);
      const updatedProfile = await supabaseService.getProfile(user.id);
      setUser(updatedProfile);
      setStep('welcome');
    } catch (e) {
      console.error("Upgrade failed", e);
    } finally {
      setIsUpgrading(false);
    }
  };

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

  // --- RENDERERS ---
  const renderWelcome = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-black text-white text-center space-y-12 animate-in fade-in duration-1000">
      <div className="space-y-4">
        <h1 className="text-7xl font-black tracking-tighter uppercase whitespace-pre-line leading-[0.9]">{t.welcomeTitle}</h1>
        <p className="text-zinc-500 max-w-sm mx-auto uppercase text-[10px] tracking-[0.3em] font-bold">{t.welcomeSub}</p>
      </div>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {user ? (
          <div className="flex flex-col gap-4">
             <div className="bg-zinc-900 border border-zinc-800 p-4 text-left relative overflow-hidden group">
                {user.isPro && (
                  <div className="absolute top-0 right-0 bg-white text-black text-[8px] font-black px-2 py-0.5 uppercase tracking-widest">
                    PREMIUM
                  </div>
                )}
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Architect Detected</p>
                <p className="text-xs font-bold truncate">{user.email}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">
                    {user.isPro ? t.unlimited : `${2 - user.photosUsed} ${t.freeRemaining}`}
                  </span>
                  {!user.isPro && (
                    <button onClick={() => setStep('paywall')} className="text-[9px] font-black uppercase text-white underline underline-offset-4 hover:text-zinc-300">Upgrade</button>
                  )}
                </div>
             </div>
             <button onClick={() => handleActionWithLimit('visual-scan')} className="bg-white text-black py-4 px-8 font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors">
               {t.visualScanBtn}
             </button>
             <button onClick={() => setStep('gender')} className="border border-zinc-800 text-white py-4 px-8 font-black uppercase tracking-widest hover:border-white transition-colors">
               {t.getStarted}
             </button>
             <button onClick={() => setStep('profile')} className="text-zinc-400 py-2 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white transition-colors">
               {t.profile}
             </button>
             <button onClick={() => setStep('how-it-works')} className="text-zinc-600 py-2 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white transition-colors border-b border-zinc-900 hover:border-white">
               {t.howItWorks}
             </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <button onClick={() => setStep('auth')} className="bg-white text-black py-4 px-8 font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors">
              {t.login} / {t.signUp}
            </button>
            <button onClick={() => setStep('discovery')} className="text-zinc-600 py-2 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">
              {t.vibeCheck}
            </button>
            <button onClick={() => setStep('how-it-works')} className="text-zinc-600 py-2 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white transition-colors border-b border-zinc-900 hover:border-white">
               {t.howItWorks}
             </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="min-h-screen p-8 bg-black text-white animate-in slide-in-from-top duration-500">
      <div className="max-w-xl mx-auto space-y-12 py-12">
        <button onClick={() => setStep('welcome')} className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
          <ICONS.Arrow className="w-4 h-4 rotate-180" /> {t.back}
        </button>

        <div className="space-y-4">
          <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">{t.profileTitle}</h2>
          <p className="text-zinc-500 uppercase text-[10px] tracking-widest font-black">{t.accountInfo}</p>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-8">
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">{t.email}</p>
              <p className="text-xl font-bold tracking-tight">{user?.email}</p>
            </div>

            <div className="space-y-1 pt-6 border-t border-zinc-800">
              <p className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">{t.status}</p>
              <div className="flex items-center justify-between">
                <p className={`text-xl font-black tracking-tight ${user?.isPro ? 'text-white' : 'text-zinc-400'}`}>
                  {user?.isPro ? t.premium : t.free}
                </p>
                {!user?.isPro && (
                  <button onClick={() => setStep('paywall')} className="bg-white text-black text-[10px] px-4 py-2 font-black uppercase tracking-widest hover:bg-zinc-200">
                    UPGRADE
                  </button>
                )}
              </div>
              <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest mt-2">
                {user?.isPro ? t.unlimited : `${user?.photosUsed} / 2 SCANS USED`}
              </p>
            </div>
          </div>

          <button onClick={handleSignOut} className="w-full border border-zinc-800 text-zinc-500 py-5 font-black uppercase tracking-widest hover:border-red-900 hover:text-red-500 transition-all">
            {t.signOut}
          </button>
        </div>
      </div>
    </div>
  );

  const renderVirtualMirror = () => (
    <div className="min-h-screen p-8 bg-black text-white animate-in slide-in-from-bottom duration-500 text-center flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-12">
        <button onClick={() => setStep('details')} className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest flex items-center gap-2 self-start">
          <ICONS.Arrow className="w-4 h-4 rotate-180" /> {t.back}
        </button>

        <h2 className="text-4xl font-black uppercase underline underline-offset-8 decoration-zinc-800">{t.mirrorTitle}</h2>
        <p className="text-zinc-500 uppercase text-[10px] tracking-widest font-black max-w-sm mx-auto">{t.mirrorSub}</p>

        {!mirrorResult ? (
           <div className="border-4 border-dashed border-zinc-800 p-16 hover:border-white transition-all cursor-pointer group bg-zinc-900/20" onClick={() => mirrorInputRef.current?.click()}>
              <input type="file" ref={mirrorInputRef} className="hidden" accept="image/*" onChange={handleVirtualMirrorUpload} />
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

  const renderHowItWorks = () => (
    <div className="min-h-screen p-8 bg-black text-white animate-in slide-in-from-right duration-500 overflow-y-auto">
      <div className="max-w-xl mx-auto space-y-16 py-12">
        <button onClick={() => setStep('welcome')} className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
          <ICONS.Arrow className="w-4 h-4 rotate-180" /> {t.back}
        </button>

        <h2 className="text-6xl font-black uppercase tracking-tighter leading-none border-b-4 border-white pb-4">{t.howItWorks}</h2>

        <div className="space-y-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter">{t.howStep1Title}</h3>
            <p className="text-zinc-500 uppercase text-xs tracking-widest leading-relaxed font-bold">{t.howStep1Desc}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter">{t.howStep2Title}</h3>
            <p className="text-zinc-500 uppercase text-xs tracking-widest leading-relaxed font-bold">{t.howStep2Desc}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter">{t.howStep3Title}</h3>
            <p className="text-zinc-500 uppercase text-xs tracking-widest leading-relaxed font-bold">{t.howStep3Desc}</p>
          </div>
        </div>

        <button 
          onClick={() => user ? setStep('gender') : setStep('auth')} 
          className="w-full bg-white text-black py-5 font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
        >
          {t.getStarted}
        </button>
      </div>
    </div>
  );

  const renderPaywall = () => (
    <div className="min-h-screen flex items-center justify-center p-8 bg-black text-white animate-in zoom-in duration-300">
      <div className="w-full max-w-md space-y-12 text-center">
        <div className="inline-block p-4 border-2 border-white mb-4">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="space-y-4">
          <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{t.paywallTitle}</h2>
          <p className="text-zinc-500 uppercase text-[10px] tracking-[0.2em] font-black max-w-xs mx-auto">{t.paywallSub}</p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={handleSubscribe} 
            disabled={isUpgrading}
            className="w-full bg-white text-black py-5 font-black uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50"
          >
            {isUpgrading ? "SECURE CONNECTION..." : t.upgradeBtn}
          </button>
          <button onClick={() => setStep('welcome')} className="text-zinc-600 py-2 font-black uppercase text-[10px] tracking-widest hover:text-white">
            {t.back}
          </button>
        </div>
        
        <p className="text-[8px] text-zinc-700 uppercase font-black tracking-widest">Secure payments via Stripe • Cancel anytime</p>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="min-h-screen flex items-center justify-center p-8 bg-black text-white animate-in zoom-in duration-300">
      <div className="w-full max-w-md space-y-12">
        <button onClick={() => setStep('welcome')} className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
          <ICONS.Arrow className="w-3 h-3 rotate-180" /> {t.back}
        </button>
        <div className="space-y-4">
          <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{isLogin ? t.login : t.signUp}</h2>
          <p className="text-zinc-500 uppercase text-[10px] tracking-[0.2em] font-black">{t.authSub}</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            <input 
              type="email" 
              required 
              className="w-full bg-zinc-900 border border-zinc-800 p-4 text-white font-bold text-sm focus:border-white outline-none"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder={t.email}
            />
            <input 
              type="password" 
              required 
              className="w-full bg-zinc-900 border border-zinc-800 p-4 text-white font-bold text-sm focus:border-white outline-none"
              value={authPass}
              onChange={(e) => setAuthPass(e.target.value)}
              placeholder={t.password}
            />
          </div>
          {authError && <div className="text-white bg-red-900/50 p-4 text-[10px] font-black uppercase tracking-widest border border-red-800">{authError}</div>}
          <button type="submit" disabled={isAuthLoading} className="w-full bg-white text-black py-5 font-black uppercase tracking-widest disabled:opacity-50">
            {isAuthLoading ? t.loading : (isLogin ? t.login : t.signUp)}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full text-zinc-500 uppercase font-black text-[9px] tracking-widest hover:text-white">
          {isLogin ? t.noAccount : t.haveAccount}
        </button>
      </div>
    </div>
  );

  const renderVisualScan = () => (
    <div className="min-h-screen p-8 bg-black text-white animate-in slide-in-from-bottom duration-500 text-center flex flex-col items-center justify-center">
      <div className="max-w-xl w-full space-y-12">
        <h2 className="text-4xl font-black uppercase underline underline-offset-8 decoration-zinc-800">{t.scanTitle}</h2>
        {!persona ? (
           <div className="border-4 border-dashed border-zinc-800 p-12 hover:border-white transition-all cursor-pointer group" onClick={() => scanInputRef.current?.click()}>
              <input type="file" ref={scanInputRef} className="hidden" accept="image/*" onChange={handleVisualScanUpload} />
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
              <button onClick={() => setStep('results')} className="w-full bg-white text-black py-4 font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors">{t.viewRecs}</button>
           </div>
        )}
        <button onClick={() => setStep('welcome')} className="text-zinc-600 py-2 font-black uppercase text-[10px] tracking-widest hover:text-white">{t.back}</button>
      </div>
    </div>
  );

  const renderSurveyStep = (stepName: string, options: any[], setter: (val: any) => void, current: any, next: AppStep) => (
    <div className="min-h-screen p-8 bg-black text-white flex flex-col items-center justify-center animate-in slide-in-from-right duration-500">
      <div className="w-full max-w-lg space-y-12 text-center">
        <h2 className="text-4xl font-black tracking-tighter uppercase underline decoration-zinc-800 decoration-4 underline-offset-8">{stepName}</h2>
        <div className="grid grid-cols-1 gap-4">
          {options.map(opt => (
            <button key={opt.value} onClick={() => { setter(opt.value); setStep(next); }} className={`p-6 border font-bold uppercase tracking-widest transition-all ${current === opt.value ? 'bg-white text-black' : 'border-zinc-800 text-zinc-400 hover:border-zinc-500'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <button onClick={() => setStep('welcome')} className="text-xs text-zinc-600 uppercase font-black tracking-widest hover:text-white">{t.back}</button>
      </div>
    </div>
  );

  return (
    <div className="font-sans antialiased bg-black min-h-screen text-zinc-100">
      {step === 'welcome' && renderWelcome()}
      {step === 'how-it-works' && renderHowItWorks()}
      {step === 'profile' && renderProfile()}
      {step === 'auth' && renderAuth()}
      {step === 'paywall' && renderPaywall()}
      {step === 'visual-scan' && renderVisualScan()}
      {step === 'virtual-mirror' && renderVirtualMirror()}
      {step === 'discovery' && (
        <div className="p-8 animate-in fade-in duration-500">
          <button onClick={() => setStep('welcome')} className="mb-12 text-zinc-500 hover:text-white uppercase text-[10px] font-black flex items-center gap-2">
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
      )}
      {step === 'gender' && renderSurveyStep('Vessel Selection', [{ label: 'Male', value: Gender.MALE }, { label: 'Female', value: Gender.FEMALE }], setGender, gender, 'occasion')}
      {step === 'occasion' && renderSurveyStep('Purpose', Object.values(Occasion).map(o => ({ label: o, value: o })), setOccasion, occasion, 'style')}
      {step === 'style' && renderSurveyStep('Aesthetic Dial', Object.values(Style).map(s => ({ label: s, value: s })), setStyle, style, 'weather')}
      {step === 'weather' && renderSurveyStep('Atmosphere', Object.values(Weather).map(w => ({ label: w, value: w })), setWeather, weather, 'budget')}
      {step === 'budget' && renderSurveyStep('Budget', [{ label: '30€', value: 30 }, { label: '50€', value: 50 }, { label: '100€', value: 100 }], setBudgetLimit, budgetLimit, 'results')}
      {step === 'results' && (
        <div className="p-8 animate-in fade-in duration-500">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="flex justify-between items-end">
              <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">{t.results}</h2>
              <button onClick={() => setStep('gender')} className="bg-white text-black px-8 py-3 font-bold uppercase tracking-widest">{t.reSurvey}</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredOutfits.map(outfit => (
                <div key={outfit.id} onClick={() => { setSelectedOutfit(outfit); setStep('details'); }} className="group cursor-pointer space-y-4">
                  <div className="aspect-[3/4] overflow-hidden bg-zinc-900 border border-zinc-800"><img src={outfit.imageUrls[0]} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" /></div>
                  <div>
                    <h3 className="font-bold uppercase text-sm tracking-tight">{outfit.name}</h3>
                    <p className="text-[10px] text-zinc-500 uppercase font-black">{outfit.brand} • {outfit.totalPrice}€</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {step === 'details' && selectedOutfit && (
         <div className="p-8 animate-in fade-in duration-500">
            <button onClick={() => setStep('results')} className="mb-12 text-zinc-500 hover:text-white uppercase text-[10px] font-black flex items-center gap-2"><ICONS.Arrow className="w-4 h-4 rotate-180" /> {t.back}</button>
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
               <h1 className="text-6xl font-black uppercase tracking-tighter">{selectedOutfit.name}</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <img src={selectedOutfit.imageUrls[0]} className="w-full aspect-[3/4] object-cover grayscale border border-zinc-800" />
                 <div className="flex flex-col justify-between">
                    <div className="space-y-6">
                      <p className="text-2xl font-serif italic text-zinc-300 leading-relaxed">{selectedOutfit.explanation}</p>
                      <button onClick={() => handleActionWithLimit('virtual-mirror')} className="w-full bg-white text-black py-4 font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-lg border border-white">
                        {t.tryOnBtn}
                      </button>
                    </div>
                    <a href={selectedOutfit.affiliateLink} target="_blank" rel="noreferrer" className="block w-full border border-zinc-800 text-white py-5 text-center font-black uppercase tracking-widest hover:bg-zinc-900 mt-8">{t.buyLook}</a>
                 </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
