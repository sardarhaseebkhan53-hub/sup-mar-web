import React, { useState } from 'react';
import { Globe2, MapPin, Smartphone } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import AccountHeading from '../../components/account/AccountHeading';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTranslation } from '../../i18n';
import { userApi } from '../../services/apiClient';

export default function AccountSettingsPage() {
  const { user, updateLocalUser } = useAuth(); const { locale, setLocale, t } = useTranslation(); const [language, setLanguage] = useState(user.preferences?.language || locale); const [saving, setSaving] = useState(false); useDocumentTitle(t('dashboard.settings'));
  async function save() { setSaving(true); try { const response = await userApi.update({ language }); updateLocalUser(response.data); setLocale(language); } finally { setSaving(false); } }
  return <><AccountHeading title={t('dashboard.settings')} description="Language, location privacy, and future mobile preferences for your DealHub experience." /><section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm sm:p-7"><div className="grid gap-4 sm:grid-cols-3"><article className="rounded-xl border border-violet-200 bg-violet-50 p-4"><Globe2 className="text-violet-700" /><h2 className="mt-3 text-sm font-extrabold">Language</h2><p className="mt-2 text-[10px] leading-5 text-slate-500">English and Urdu direction, labels, and formatting foundation.</p><select className="input-base mt-4" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="ur">اردو</option></select></article><article className="rounded-xl border border-slate-200 p-4"><MapPin className="text-emerald-600" /><h2 className="mt-3 text-sm font-extrabold">Location privacy</h2><p className="mt-2 text-[10px] leading-5 text-slate-500">Only city and area are shown by default. Precise coordinates remain optional.</p></article><article className="rounded-xl border border-slate-200 p-4"><Smartphone className="text-blue-600" /><h2 className="mt-3 text-sm font-extrabold">Mobile readiness</h2><p className="mt-2 text-[10px] leading-5 text-slate-500">The same sessions, APIs, locale, and push preferences will support native apps.</p></article></div><div className="mt-6 flex justify-end"><Button onClick={save} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button></div></section></>;
}
