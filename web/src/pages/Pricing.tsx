import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLang } from '../lang';
import { useAuth } from '../lib/auth';
import { useTitle } from '../lib/useTitle';
import { BillingError, openPortal, startCheckout, STRIPE_TEST_MODE, type PaidPlan } from '../lib/billing';
import { getSubscription, LIVE_STATUSES, type Subscription } from '../lib/db';
import { Header, Footer, container } from '../components/Sections';
import { Icon } from '../components/Icon';

type PlanKey = 'free' | PaidPlan;
const ORDER: PlanKey[] = ['free', 'starter', 'pro'];

export default function Pricing() {
  const { t, lang, toggle } = useLang();
  const pt = t.pricing;
  useTitle(pt.title);
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState<PlanKey | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(params.get('checkout') === 'cancelled' ? pt.cancelled : null);

  useEffect(() => {
    if (auth.status !== 'signed-in') return;
    getSubscription(auth.supabase).then(setSub).catch(e => console.error('Load subscription failed', e));
  }, [auth]);

  const activePlan: PlanKey = sub && LIVE_STATUSES.has(sub.status) ? sub.plan : 'free';
  const paying = activePlan !== 'free';

  const fail = (e: unknown) => {
    console.error('Billing failed', e);
    setError(e instanceof BillingError && e.code === 'billing_not_configured' ? pt.notConfigured : pt.error);
    setBusy(null);
  };

  const choose = async (plan: PlanKey) => {
    setError(null);
    if (auth.status !== 'signed-in') { navigate(`/login?next=${encodeURIComponent('/pricing')}`); return; }
    if (plan === 'free') { navigate('/app'); return; }
    setBusy(plan);
    try {
      // Already paying: switching plans happens in the Stripe portal, never a second subscription.
      if (paying) await openPortal(auth.supabase);
      else await startCheckout(auth.supabase, plan);
    } catch (e) { fail(e); }
  };

  return (
    <>
      <Header t={t} lang={lang} onToggleLang={toggle} />
      <main>
        <section className={`${container} pt-20 pb-12 text-center sm:pt-28`}>
          <h1 className="text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">{pt.title}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-500">{pt.subtitle}</p>
          {STRIPE_TEST_MODE && (
            <p className="mx-auto mt-6 inline-flex max-w-xl items-center gap-2 rounded-full border border-neutral-200 px-4 py-1.5 text-xs text-neutral-600">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />{pt.testMode}
            </p>
          )}
        </section>

        <section className={`${container} pb-16`}>
          {error && <p role="alert" className="mx-auto mb-6 max-w-xl rounded-lg bg-neutral-100 p-3 text-center text-sm text-ink">{error}</p>}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {ORDER.map(key => {
              const plan = pt.plans[key];
              const featured = key === 'starter';
              const isCurrent = auth.status === 'signed-in' && activePlan === key;
              return (
                <div key={key} className={`relative flex flex-col rounded-xl p-8 ${featured ? 'bg-ink text-white' : 'border border-neutral-200 bg-white'}`}>
                  {featured && <span className="absolute right-6 top-6 rounded-full bg-signal px-2.5 py-0.5 text-xs font-medium text-white">{pt.popular}</span>}
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className={`mt-1 text-sm ${featured ? 'text-neutral-400' : 'text-neutral-500'}`}>{plan.desc}</p>
                  <p className="mt-8 flex items-baseline gap-1">
                    <span className="text-5xl font-semibold tracking-[-0.03em]">{plan.price}</span>
                    {key !== 'free' && <span className={featured ? 'text-neutral-400' : 'text-neutral-500'}>{pt.perMonth}</span>}
                  </p>
                  <ul className="mt-8 flex-1 space-y-3 text-sm">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-3">
                        <Icon name="check" className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? 'text-signal' : 'text-ink'}`} />{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={isCurrent || busy !== null || (key === 'free' && paying)}
                    onClick={() => choose(key)}
                    className={`mt-10 rounded-full px-6 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-60 ${featured ? 'bg-white text-ink hover:bg-neutral-200' : 'border border-neutral-300 hover:border-ink'}`}
                  >
                    {isCurrent ? pt.current : busy === key ? pt.redirecting : key === 'free' ? pt.startFree : paying ? pt.manage : `${pt.subscribe} ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-8 flex items-center justify-center gap-2 text-sm text-neutral-500">
            <Icon name="check" className="h-4 w-4" />{pt.secure}
          </p>
        </section>

        <section className={`${container} max-w-3xl pb-24`}>
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {pt.faq.map(item => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {item.q}
                  <span aria-hidden="true" className="text-2xl font-light text-neutral-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-neutral-600">{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-neutral-500">
            <Link to="/#faq" className="underline underline-offset-4">{t.faq.title}</Link>
          </p>
        </section>
      </main>
      <Footer t={t} />
    </>
  );
}
