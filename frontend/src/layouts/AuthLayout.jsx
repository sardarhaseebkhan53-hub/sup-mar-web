import React from 'react';
import { ArrowLeft, Languages, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import { useTranslation } from '../i18n';

export default function AuthLayout() {
  const { locale, setLocale, t } = useTranslation();
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[0.85fr_1.15fr]">
      <section className="relative hidden overflow-hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(131,56,236,.45),transparent_35%),radial-gradient(circle_at_15%_85%,rgba(255,196,12,.18),transparent_30%)]" />
        <Logo inverse className="relative" />
        <div className="relative max-w-lg"><span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold"><Sparkles size={14} className="text-gold-300" /> Identity built for safer trading</span><h1 className="text-5xl font-extrabold leading-[1.08]">More trust.<br />Better deals.<br /><span className="text-gold-300">One community.</span></h1><p className="mt-6 max-w-md text-base leading-7 text-white/60">One verified QAVLIO profile protects your buying, selling, messages, and account activity across every device.</p></div>
        <div className="relative flex items-center gap-3 text-xs font-semibold text-white/60"><ShieldCheck className="text-emerald-400" /> Secure sessions · Privacy-first · Community protected</div>
      </section>
      <section className="relative flex min-h-screen items-center justify-center px-4 py-20 sm:px-8">
        <Link to="/" className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rtl:left-auto rtl:right-5"><ArrowLeft size={16} /> {t('common.back')}</Link>
        <button onClick={() => setLocale(locale === 'en' ? 'ur' : 'en')} className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rtl:left-5 rtl:right-auto" aria-label="Change language"><Languages size={15} />{locale === 'en' ? 'اردو' : 'English'}</button>
        <div className="w-full max-w-lg"><Logo className="mb-10 lg:hidden" /><Outlet /></div>
      </section>
    </div>
  );
}
