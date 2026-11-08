import { Link } from 'react-router-dom';
import { useLang } from '../lang';
import { useTitle } from '../lib/useTitle';
import { Logo } from '../components/Sections';

export default function NotFound() {
  const { t } = useLang();
  useTitle(t.notFound.title);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <Logo />
      <p className="text-6xl font-extrabold tracking-tight text-slate-300">404</p>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.notFound.title}</h1>
        <p className="mt-2 text-slate-600">{t.notFound.body}</p>
      </div>
      <Link to="/" className="rounded-lg bg-ink px-5 py-3 font-semibold text-white hover:bg-slate-800">{t.notFound.home}</Link>
    </main>
  );
}
