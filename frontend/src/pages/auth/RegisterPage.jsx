import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Globe2, Mail, MapPin, Phone, ShoppingBag, UserRound } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthAlert from '../../components/auth/AuthAlert';
import PasswordStrength from '../../components/auth/PasswordStrength';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTranslation } from '../../i18n';
import { authApi } from '../../services/apiClient';

const steps = ['Account', 'Identity', 'Location'];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ method: 'email', accountType: 'customer', name: '', email: '', phone: '', password: '', confirmPassword: '', country: 'PK', province: 'Punjab', city: 'Rawalpindi', language: 'en', terms: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useDocumentTitle(t('common.register'));

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); setError(null); }
  function next() {
    if (step === 2 && (!form.name.trim() || !form.password || form.password !== form.confirmPassword)) {
      setError({ message: form.password !== form.confirmPassword ? 'Passwords do not match' : 'Complete the required fields' }); return;
    }
    setStep((current) => Math.min(3, current + 1));
  }
  async function submit(event) {
    event.preventDefault();
    if (!form.terms) { setError({ message: 'Accept the terms to continue' }); return; }
    setSubmitting(true); setError(null);
    try {
      const response = await authApi.register({ ...form, email: form.method === 'email' ? form.email : undefined, phone: form.method === 'phone' ? form.phone : undefined });
      const returnTo = searchParams.get('returnTo');
      if (form.method === 'phone') {
        const params = new URLSearchParams({ phone: response.data.verification.normalizedTarget, target: response.data.verification.target, purpose: response.data.verification.purpose });
        if (returnTo) params.set('returnTo', returnTo);
        navigate(`/verify-otp?${params}`);
      } else {
        const params = new URLSearchParams({ target: form.email });
        if (returnTo) params.set('returnTo', returnTo);
        navigate(`/verify-email?${params}`);
      }
    } catch (requestError) { setError(requestError); }
    finally { setSubmitting(false); }
  }

  return <div className="max-w-lg">
    <p className="eyebrow">{t('auth.join')}</p><h1 className="mt-2 text-3xl font-extrabold">{t('auth.registerTitle')}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{t('auth.registerSubtitle')}</p>
    <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Registration progress">{steps.map((label, index) => <li key={label} className={`flex items-center gap-1.5 rounded-lg p-2 text-[9px] font-extrabold ${step === index + 1 ? 'bg-violet-100 text-violet-700' : step > index + 1 ? 'text-emerald-600' : 'text-slate-400'}`}><span className={`grid h-5 w-5 place-items-center rounded-full ${step > index + 1 ? 'bg-emerald-100' : 'bg-white'}`}>{step > index + 1 ? <Check size={11} /> : index + 1}</span>{label}</li>)}</ol>
    {error && <div className="mt-4"><AuthAlert title={error.message}>{error.requestId ? `Reference: ${error.requestId}` : null}</AuthAlert></div>}
    <form className="mt-5" onSubmit={submit}>
      {step === 1 && <fieldset><legend className="text-sm font-extrabold">{t('auth.accountIntent')}</legend><div className="mt-3 grid grid-cols-2 gap-3">{[{ id: 'customer', label: t('auth.customer'), icon: ShoppingBag }, { id: 'seller', label: t('auth.seller'), icon: BriefcaseBusiness }].map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => update('accountType', id)} className={`relative rounded-xl border p-4 text-left transition ${form.accountType === id ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/10' : 'border-slate-200 hover:border-violet-200'}`} aria-pressed={form.accountType === id}><Icon size={19} className={form.accountType === id ? 'text-violet-700' : 'text-slate-500'} /><span className="mt-2 block text-[11px] font-extrabold">{label}</span>{form.accountType === id && <Check size={14} className="absolute right-3 top-3 text-violet-700" />}</button>)}</div><legend className="mt-6 text-sm font-extrabold">Choose a signup method</legend><div className="mt-3 grid grid-cols-2 gap-3">{[{ id: 'email', label: t('auth.emailMethod'), icon: Mail }, { id: 'phone', label: t('auth.phoneMethod'), icon: Phone }].map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => update('method', id)} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-[11px] font-extrabold ${form.method === id ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-slate-200'}`} aria-pressed={form.method === id}><Icon size={17} />{label}</button>)}</div></fieldset>}
      {step === 2 && <div className="space-y-4"><label className="block text-xs font-extrabold" htmlFor="register-name">{t('common.name')}<span className="relative mt-2 block"><UserRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="register-name" className="input-base pl-11" autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} required /></span></label>{form.method === 'email' ? <label className="block text-xs font-extrabold" htmlFor="register-email">{t('common.email')}<span className="relative mt-2 block"><Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="register-email" type="email" autoComplete="email" className="input-base pl-11" value={form.email} onChange={(event) => update('email', event.target.value)} required /></span></label> : <label className="block text-xs font-extrabold" htmlFor="register-phone">{t('common.phone')}<span className="relative mt-2 block"><Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="register-phone" type="tel" autoComplete="tel" className="input-base pl-11" placeholder="0300 1234567" value={form.phone} onChange={(event) => update('phone', event.target.value)} required /></span></label>}<label className="block text-xs font-extrabold" htmlFor="register-password">{t('common.password')}<input id="register-password" type="password" autoComplete="new-password" className="input-base mt-2" value={form.password} onChange={(event) => update('password', event.target.value)} required /><PasswordStrength password={form.password} label={t('auth.passwordHint')} /></label><label className="block text-xs font-extrabold" htmlFor="confirm-password">{t('common.confirmPassword')}<input id="confirm-password" type="password" autoComplete="new-password" className="input-base mt-2" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} required /></label></div>}
      {step === 3 && <div className="space-y-4"><div className="rounded-xl bg-violet-50 p-3 text-[10px] font-semibold leading-5 text-violet-800"><MapPin size={15} className="mb-1" />{t('auth.locationHint')}</div><label className="block text-xs font-extrabold" htmlFor="country">{t('common.country')}<span className="relative mt-2 block"><Globe2 size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><select id="country" className="input-base pl-11" value={form.country} onChange={(event) => update('country', event.target.value)}><option value="PK">Pakistan</option></select></span></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-extrabold" htmlFor="province">Province<select id="province" className="input-base mt-2" value={form.province} onChange={(event) => update('province', event.target.value)}><option>Punjab</option><option>Sindh</option><option>Khyber Pakhtunkhwa</option><option>Balochistan</option><option>Islamabad Capital Territory</option></select></label><label className="block text-xs font-extrabold" htmlFor="city">{t('common.city')}<input id="city" className="input-base mt-2" value={form.city} onChange={(event) => update('city', event.target.value)} required /></label></div><label className="flex items-start gap-2 text-[10px] font-semibold leading-5 text-slate-500"><input type="checkbox" checked={form.terms} onChange={(event) => update('terms', event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600" required />{t('auth.terms')}</label></div>}
      <div className="mt-6 flex gap-2">{step > 1 && <Button type="button" variant="secondary" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={15} />{t('common.back')}</Button>}<div className="ml-auto">{step < 3 ? <Button type="button" onClick={next}>{t('common.continue')}<ArrowRight size={15} /></Button> : <Button type="submit" disabled={submitting}>{submitting ? t('auth.creating') : t('auth.createAction')}</Button>}</div></div>
    </form>
    <p className="mt-6 text-center text-xs font-semibold text-slate-500">{t('auth.haveAccount')} <Link to="/login" className="font-extrabold text-violet-700">{t('common.logIn')}</Link></p>
  </div>;
}
