import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LangProvider } from './lang';
import Landing from './pages/Landing';

// Account pages load supabase-js; keep them out of the landing page bundle.
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Report = lazy(() => import('./pages/Report'));

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<Dashboard />} />
            <Route path="/app/scans/:id" element={<Report />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </LangProvider>
  );
}
