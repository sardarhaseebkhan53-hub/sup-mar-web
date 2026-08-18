import { useState } from 'react';
import AIListingAssistant from '../../components/ai/AIListingAssistant';
import AISearchBar from '../../components/ai/AISearchBar';
import DashboardHeading from '../../components/dashboard/DashboardHeading';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function SellerAiAssistantPage() {
  useDocumentTitle('AI Listing Assistant');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  return <DashboardLayout role="seller">
    <DashboardHeading eyebrow="Seller centre" title="AI Listing Assistant" description="Improve titles, descriptions, attributes, categories, and pricing from facts you already know. Nothing is published until you confirm it." action={null} />
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <section className="rounded-panel border bg-white p-5 sm:p-7">
        <label className="text-xs font-extrabold">Working title
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-base mt-2" placeholder="iphone 15 pro good condition" />
        </label>
        <label className="mt-4 block text-xs font-extrabold">Facts / description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="input-base mt-2 min-h-40 py-3" placeholder="What you can confirm: brand, storage, condition, accessories." />
        </label>
        {category && <p className="mt-3 text-xs font-bold text-violet-700">Confirmed category: {category}</p>}
        {Object.keys(attributes).length > 0 && <p className="mt-2 text-xs font-bold text-emerald-700">Confirmed attributes: {Object.entries(attributes).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>}
        <div className="mt-6 border-t pt-5">
          <p className="text-xs font-extrabold">Need stock inspiration?</p>
          <p className="mt-1 text-[11px] text-slate-500">Search what buyers are asking for, in natural language:</p>
          <div className="mt-2 max-w-xl"><AISearchBar /></div>
        </div>
      </section>
      <AIListingAssistant
        title={title}
        description={description}
        category={category}
        onApplyTitle={setTitle}
        onApplyDescription={setDescription}
        onApplyCategory={(next) => setCategory(next)}
        onApplyAttributes={(next) => setAttributes(next)}
      />
    </div>
  </DashboardLayout>;
}
