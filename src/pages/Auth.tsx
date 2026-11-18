import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { errorMessage, useI18n } from '../lib/i18n';
import { useAuth } from '../auth/AuthProvider';
import { Alert, Button, Card, Field, Input } from '../components/ui';
import { Logo } from '../components/AppShell';

function AuthLayout({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <Link to="/" className="mb-8"><Logo /></Link>
      <Card className="w-full max-w-sm p-6 shadow-sm">
        <h1 className="mb-5 text-lg font-semibold">{title}</h1>
        {children}
      </Card>
      {footer && <div className="mt-5 text-sm text-muted">{footer}</div>}
    </div>
  );
}

export function Login() {
  const { t } = useI18n();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (session) return <Navigate to="/app" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setError(errorMessage(t, error)); else navigate('/app');
  };

  return (
    <AuthLayout title={t('auth.login')} footer={<Link className="text-accent-700 hover:underline" to="/register">{t('auth.noAccount')}</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('auth.email')}><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t('auth.password')}><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" loading={loading} className="w-full">{t('auth.login')}</Button>
        <Link to="/forgot-password" className="block text-center text-sm text-muted hover:text-ink">{t('auth.forgot')}</Link>
      </form>
    </AuthLayout>
  );
}

export function Register() {
  const { t } = useI18n();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  if (session) return <Navigate to="/app" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError(t('auth.passwordHint')); return; }
    setLoading(true); setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    if (!error && data.user && name.trim() && data.session) {
      await supabase.from('profiles').update({ display_name: name.trim().slice(0, 80) }).eq('id', data.user.id);
    }
    setLoading(false);
    if (error) setError(errorMessage(t, error));
    else if (!data.session) setDone(true); // email confirmation required
  };

  return (
    <AuthLayout title={t('auth.register')} footer={<Link className="text-accent-700 hover:underline" to="/login">{t('auth.haveAccount')}</Link>}>
      {done ? <Alert kind="success">{t('auth.checkEmail')}</Alert> : (
        <form onSubmit={submit} className="space-y-4">
          <Field label={t('auth.name')}><Input autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={t('auth.email')}><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={t('auth.password')} hint={t('auth.passwordHint')}><Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" loading={loading} className="w-full">{t('auth.register')}</Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (error) setError(errorMessage(t, error)); else setSent(true);
  };
  return (
    <AuthLayout title={t('auth.resetTitle')} footer={<Link className="text-accent-700 hover:underline" to="/login">{t('auth.login')}</Link>}>
      {sent ? <Alert kind="success">{t('auth.resetSent')}</Alert> : (
        <form onSubmit={submit} className="space-y-4">
          <Field label={t('auth.email')}><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" loading={loading} className="w-full">{t('auth.resetSend')}</Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPassword() {
  const { t } = useI18n();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError(t('auth.passwordHint')); return; }
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(errorMessage(t, error)); else navigate('/app');
  };
  return (
    <AuthLayout title={t('auth.updatePassword')}>
      {!session ? <Alert>{t('errors.unauthorized')}</Alert> : (
        <form onSubmit={submit} className="space-y-4">
          <Field label={t('auth.newPassword')} hint={t('auth.passwordHint')}><Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" loading={loading} className="w-full">{t('auth.updatePassword')}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
