import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Dict, Lang } from '../i18n';
import { MARKETPLACES, submitScanRequest, type Marketplace } from '../lib/supabase';

type Status = 'idle' | 'sending' | 'success' | 'error';
type FieldErrors = Partial<Record<'email' | 'asin' | 'consent', string>>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ASIN_RE = /^[A-Z0-9]{10}$/;

const DEFAULT_MARKETPLACE: Record<Lang, Marketplace> = { fr: 'amazon.fr', en: 'amazon.com' };

export function validate(email: string, asin: string, consent: boolean, t: Dict): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = t.form.errorEmail;
  if (!ASIN_RE.test(asin)) errors.asin = t.form.errorAsin;
  if (!consent) errors.consent = t.form.errorConsent;
  return errors;
}

const inputClass = 'mt-1.5 block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-base text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 aria-[invalid=true]:border-red-500';

export function ScanForm({ t, lang }: { t: Dict; lang: Lang }) {
  const [email, setEmail] = useState('');
  const [asin, setAsin] = useState('');
  const [marketplace, setMarketplace] = useState<Marketplace>(DEFAULT_MARKETPLACE[lang]);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot: humans never see or fill it
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanAsin = asin.trim().toUpperCase();
    const found = validate(cleanEmail, cleanAsin, consent, t);
    setErrors(found);
    if (Object.keys(found).length) return;

    // A bot filled the hidden field: pretend it worked, store nothing.
    if (website) { setStatus('success'); return; }

    setStatus('sending');
    try {
      await submitScanRequest({ email: cleanEmail, asin: cleanAsin, marketplace, locale: lang, consent: true });
      setStatus('success');
    } catch (err) {
      console.error('Scan request failed', err);
      setStatus('error');
    }
  };

  const reset = () => {
    setAsin('');
    setStatus('idle');
  };

  return (
    <section id="scan" className="scroll-mt-16 bg-paper">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.form.title}</h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-700">{t.form.subtitle}</p>
        </div>

        <div className="rounded-xl bg-white p-6 border border-neutral-200 sm:p-8">
          {status === 'success' ? (
            <div role="status" className="space-y-4">
              <p className="text-lg font-semibold text-emerald-700">{t.form.success}</p>
              <button type="button" onClick={reset} className="font-semibold text-ink underline underline-offset-2">
                {t.form.another}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="email" className="text-sm font-semibold">{t.form.email}</label>
                <input
                  id="email" type="email" autoComplete="email" inputMode="email"
                  placeholder={t.form.emailPlaceholder}
                  value={email} onChange={e => setEmail(e.target.value)}
                  aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined}
                  className={inputClass}
                />
                {errors.email && <p id="email-error" className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="asin" className="text-sm font-semibold">{t.form.asin}</label>
                <input
                  id="asin" type="text" autoCapitalize="characters" spellCheck={false} maxLength={10}
                  placeholder="B09NNLSTGQ"
                  value={asin} onChange={e => setAsin(e.target.value.toUpperCase())}
                  aria-invalid={!!errors.asin} aria-describedby={errors.asin ? 'asin-error' : 'asin-help'}
                  className={`${inputClass} font-mono tracking-wider`}
                />
                {errors.asin
                  ? <p id="asin-error" className="mt-1.5 text-sm text-red-600">{errors.asin}</p>
                  : <p id="asin-help" className="mt-1.5 text-sm text-neutral-500">{t.form.asinHelp}</p>}
              </div>

              <div>
                <label htmlFor="marketplace" className="text-sm font-semibold">{t.form.marketplace}</label>
                <select
                  id="marketplace" value={marketplace}
                  onChange={e => setMarketplace(e.target.value as Marketplace)}
                  className={inputClass}
                >
                  {MARKETPLACES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Honeypot, hidden from people and screen readers. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
              </div>

              <div>
                <label className="flex items-start gap-3 text-sm leading-relaxed text-neutral-700">
                  <input
                    type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                    aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'consent-error' : undefined}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-neutral-300 accent-ink"
                  />
                  <span>
                    {t.form.consent}{' '}
                    <Link to="/privacy" className="font-medium text-ink underline underline-offset-2">{t.form.privacyLink}</Link>
                  </span>
                </label>
                {errors.consent && <p id="consent-error" className="mt-1.5 text-sm text-red-600">{errors.consent}</p>}
              </div>

              {status === 'error' && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t.form.errorGeneric}</p>}

              <button
                type="submit" disabled={status === 'sending'}
                className="w-full rounded-lg bg-ink px-6 py-3.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {status === 'sending' ? t.form.sending : t.form.submit}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
