import { useState } from 'react';
import SellerListingAssistant from '../../components/ai/SellerListingAssistant';
import DashboardHeading from '../../components/dashboard/DashboardHeading';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function SellerAiAssistantPage() {
  useDocumentTitle('AI Listing Assistant');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  return <DashboardLayout role="seller">
    <DashboardHeading eyebrow="Seller centre" title="AI Listing Assistant" description="Improve titles and descriptions from facts you already know. Nothing is published until you confirm it." action={null} />
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="rounded-panel border bg-white p-5 sm:p-7">
        <label className="text-xs font-extrabold">Working title
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-base mt-2" placeholder="iphone" />
        </label>
        <label className="mt-4 block text-xs font-extrabold">Facts / description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="input-base mt-2 min-h-40 py-3" placeholder="What you can confirm: brand, storage, condition, accessories." />
        </label>
        {category && <p className="mt-3 text-xs font-bold text-violet-700">Confirmed category: {category}</p>}
      </section>
      <SellerListingAssistant title={title} description={description} category={category} onApplyTitle={setTitle} onApplyDescription={setDescription} onApplyCategory={(next) => setCategory(next)} />
    </div>
  </DashboardLayout>;
}
