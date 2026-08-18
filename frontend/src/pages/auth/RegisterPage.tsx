import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Globe2, Mail, MapPin, Phone, ShoppingBag, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthAlert from '../../components/auth/AuthAlert';
import PasswordField from '../../components/auth/PasswordField';
import PasswordStrength, { passwordChecks } from '../../components/auth/PasswordStrength';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { authApi, QavlioApiError } from '../../services/apiClient';

const steps = ['Account', 'Identity', 'Location'];
type FormState = { method: 'email' | 'phone'; accountType: 'customer' | 'seller'; name: string; email: string; phone: string; password: string; confirmPassword: string; country: string; province: string; city: string; language: 'en' | 'ur'; terms: boolean };

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({ method: 'email', accountType: 'customer', name: '', email: '', phone: '', password: '', confirmPassword: '', country: 'PK', province: 'Punjab', city: 'Rawalpindi', language: 'en', terms: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<QavlioApiError | { message: string } | null>(null);
  const navigate = useNavigate(); const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState<string>(searchParams.get('ref') || localStorage.getItem('qavlio_referral_code') || '');
  useDocumentTitle('Create account');

  // Persist referral code from URL
  useState(() => {
    const refFromUrl = searchParams.get('ref');
    if (refFromUrl) {
      localStorage.setItem('qavlio_referral_code', refFromUrl.toUpperCase());
      setReferralCode(refFromUrl.toUpperCase());
    }
  });
  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => { setForm((current) => ({ ...current, [field]: value })); setError(null); };
  const next = () => {
    if (step === 2) {
      const strong = passwordChecks(form.password).every((check) => check.passed);
      if (!form.name.trim() || (form.method === 'email' ? !form.email : !form.phone) || !strong || form.password !== form.confirmPassword) {
        setError({ message: form.password !== form.confirmPassword ? 'Passwords do not match.' : !strong ? 'Create a stronger password before continuing.' : 'Complete all required fields.' }); return;
      }
    }
    setStep((current) => Math.min(3, current + 1));
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.terms) { setError({ message: 'Accept the Terms and Privacy Policy to continue.' }); return; }
    setSubmitting(true); setError(null);
    try {
      const response = await authApi.register({
        method: form.method, accountType: form.accountType, name: form.name, email: form.method === 'email' ? form.email : undefined,
        phone: form.phone || undefined, password: form.password, confirmPassword: form.confirmPassword, country: form.country,
        province: form.province, city: form.city, language: form.language, termsAccepted: form.terms,
        referralCode: referralCode || undefined,
      });
      const returnTo = searchParams.get('returnTo');
      if (form.method === 'phone') {
        const params = new URLSearchParams({ phone: response.data.verification.normalizedTarget || form.phone, target: response.data.verification.target, purpose: response.data.verification.purpose || 'phone_signup' });
        if (returnTo) params.set('returnTo', returnTo); navigate(`/verify-otp?${params}`);
      } else {
        const params = new URLSearchParams({ target: form.email }); if (returnTo) params.set('returnTo', returnTo); navigate(`/verify-email?${params}`);
      }
    } catch (requestError) { setError(requestError instanceof QavlioApiError ? requestError : { message: 'Account creation failed. Please try again.' }); }
    finally { setSubmitting(false); }
  }

  return <div className="max-w-lg"><p className="eyebrow">Join the community</p><h1 className="mt-2 text-3xl font-extrabold">Create your QAVLIO account</h1><p className="mt-2 text-sm leading-6 text-slate-500">One secure identity for buying and selling. Seller tools can be added without creating another account.</p>
    <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Registration progress">{steps.map((label, index) => <li key={label} className={`flex items-center gap-1.5 rounded-lg p-2 text-[9px] font-extrabold ${step === index + 1 ? 'bg-violet-100 text-violet-700' : step > index + 1 ? 'text-emerald-600' : 'text-slate-400'}`}><span className={`grid h-5 w-5 place-items-center rounded-full ${step > index + 1 ? 'bg-emerald-100' : 'bg-white'}`}>{step > index + 1 ? <Check size={11} /> : index + 1}</span>{label}</li>)}</ol>
    {error && <div className="mt-4"><AuthAlert title={error.message}>{'requestId' in error && error.requestId ? `Reference: ${error.requestId}` : null}</AuthAlert></div>}
    <form className="mt-5" onSubmit={submit}>
      {step === 1 && <fieldset><legend className="text-sm font-extrabold">I want to</legend><div className="mt-3 grid grid-cols-2 gap-3">{[{ id: 'customer' as const, label: 'Buy and discover', icon: ShoppingBag }, { id: 'seller' as const, label: 'Sell too', icon: BriefcaseBusiness }].map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => update('accountType', id)} className={`relative rounded-xl border p-4 text-left transition ${form.accountType === id ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/10' : 'border-slate-200 hover:border-violet-200'}`} aria-pressed={form.accountType === id}><Icon size={19} className={form.accountType === id ? 'text-violet-700' : 'text-slate-500'} /><span className="mt-2 block text-[11px] font-extrabold">{label}</span>{form.accountType === id && <Check size={14} className="absolute right-3 top-3 text-violet-700" />}</button>)}</div><legend className="mt-6 text-sm font-extrabold">Create account with</legend><div className="mt-3 grid grid-cols-2 gap-3">{[{ id: 'email' as const, label: 'Email', icon: Mail }, { id: 'phone' as const, label: 'Phone', icon: Phone }].map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => update('method', id)} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-[11px] font-extrabold ${form.method === id ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-slate-200'}`} aria-pressed={form.method === id}><Icon size={17} />{label}</button>)}</div></fieldset>}
      {step === 2 && <div className="space-y-4"><label className="block text-xs font-extrabold" htmlFor="register-name">Full name<span className="relative mt-2 block"><UserRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="register-name" className="input-base pl-11" autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} required /></span></label>{form.method === 'email' ? <><label className="block text-xs font-extrabold" htmlFor="register-email">Email address<input id="register-email" type="email" autoComplete="email" className="input-base mt-2" value={form.email} onChange={(event) => update('email', event.target.value)} required /></label><label className="block text-xs font-extrabold" htmlFor="register-phone-optional">Phone number <span className="font-medium text-slate-400">(optional)</span><input id="register-phone-optional" type="tel" autoComplete="tel" className="input-base mt-2" placeholder="0300 1234567" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label></> : <label className="block text-xs font-extrabold" htmlFor="register-phone">Phone number<input id="register-phone" type="tel" autoComplete="tel" className="input-base mt-2" placeholder="0300 1234567" value={form.phone} onChange={(event) => update('phone', event.target.value)} required /></label>}<div><PasswordField id="register-password" label="Password" autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} required /><PasswordStrength password={form.password} /></div><PasswordField id="confirm-password" label="Confirm password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} required error={form.confirmPassword && form.password !== form.confirmPassword ? 'Passwords do not match.' : undefined} /></div>}
      {step === 3 && <div className="space-y-4">
        {referralCode && <div className="rounded-xl bg-emerald-50 p-3 text-[11px] font-bold text-emerald-800">Referral code applied: <span className="font-mono">{referralCode}</span> — eligibility will be checked server-side.</div>}
        <div className="rounded-xl bg-violet-50 p-3 text-[10px] font-semibold leading-5 text-violet-800"><MapPin size={15} className="mb-1" />Only your city and optional area are public. A precise home address is not required.</div>
        <label className="block text-xs font-extrabold">Referral Code (optional)<input value={referralCode} onChange={e=>{ setReferralCode(e.target.value.toUpperCase()); localStorage.setItem('qavlio_referral_code', e.target.value.toUpperCase()); }} placeholder="QAVLIO-XXXX-XX" className="input-base mt-2 font-mono uppercase"/></label><label className="block text-xs font-extrabold" htmlFor="country">Country<span className="relative mt-2 block"><Globe2 size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><select id="country" className="input-base pl-11" value={form.country} onChange={(event) => update('country', event.target.value)}><option value="PK">Pakistan</option></select></span></label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block text-xs font-extrabold">Province<select className="input-base mt-2" value={form.province} onChange={(event) => update('province', event.target.value)}><option>Punjab</option><option>Sindh</option><option>Khyber Pakhtunkhwa</option><option>Balochistan</option><option>Islamabad Capital Territory</option></select></label><label className="block text-xs font-extrabold">City<input className="input-base mt-2" value={form.city} onChange={(event) => update('city', event.target.value)} required /></label></div><label className="flex items-start gap-2 text-[10px] font-semibold leading-5 text-slate-500"><input type="checkbox" checked={form.terms} onChange={(event) => update('terms', event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600" required />I agree to the Terms of Use and Privacy Policy.</label></div>}
      <div className="mt-6 flex gap-2">{step > 1 && <Button type="button" variant="secondary" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={15} />Back</Button>}<div className="ml-auto">{step < 3 ? <Button type="button" onClick={next}>Continue<ArrowRight size={15} /></Button> : <Button type="submit" loading={submitting}>Create account</Button>}</div></div>
    </form><p className="mt-6 text-center text-xs font-semibold text-slate-500">Already have an account? <Link to="/login" className="font-extrabold text-violet-700">Log in</Link></p></div>;
}
