import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { I18nProvider, useI18n } from './lib/i18n';
import { isSupabaseConfigured } from './lib/supabase';
import { AppShell } from './components/AppShell';
import { Card, Spinner } from './components/ui';
import Landing from './pages/Landing';
import { ForgotPassword, Login, Register, ResetPassword } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Capture from './pages/Capture';
import Notes from './pages/Notes';
import Tasks from './pages/Tasks';
import Schedule from './pages/Schedule';
import Memory from './pages/Memory';
import Settings from './pages/Settings';
import type { UiLanguage } from './lib/types';

function browserLanguage(): UiLanguage {
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function SetupNotice() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Card className="max-w-md p-6">
        <h1 className="mb-2 text-lg font-semibold">{t('setup.title')}</h1>
        <p className="text-sm text-muted">{t('setup.body')}</p>
      </Card>
    </div>
  );
}

function Localised({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const lang = profile?.ui_language ?? browserLanguage();
  document.documentElement.lang = lang;
  return <I18nProvider lang={lang}>{children}</I18nProvider>;
}

export default function App() {
  if (!isSupabaseConfigured) return <I18nProvider lang={browserLanguage()}><SetupNotice /></I18nProvider>;
  return (
    <AuthProvider>
      <Localised>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="capture" element={<Capture />} />
              <Route path="notes" element={<Notes />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="memory" element={<Memory />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </Localised>
    </AuthProvider>
  );
}
