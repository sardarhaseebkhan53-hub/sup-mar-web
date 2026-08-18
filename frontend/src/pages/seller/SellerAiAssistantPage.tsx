import { useState } from 'react';
import AIListingAssistant from '../../components/ai/AIListingAssistant';
import AIPriceInsight from '../../components/ai/AIPriceInsight';
import AIQualityScore from '../../components/ai/AIQualityScore';
import DashboardHeading from '../../components/dashboard/DashboardHeading';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function SellerAiAssistantPage() {
  useDocumentTitle('AI Listing Assistant');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>({});

  return (
    <DashboardLayout role="seller">
      <DashboardHeading
        eyebrow="Seller centre"
        title="AI Listing Assistant"
        description="Improve titles and descriptions from facts you already know. Nothing is published until you confirm it."
        action={null}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-panel border bg-white p-5 sm:p-7">
            <h2 className="text-sm font-extrabold text-ink-900">What are you selling?</h2>
            <label className="mt-4 block text-xs font-extrabold">Working title
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="input-base mt-2" maxLength={100} placeholder="e.g. iPhone 15 Pro 256GB" />
            </label>
            <label className="mt-4 block text-xs font-extrabold">Facts / description
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="input-base mt-2 min-h-40 py-3" maxLength={10000} placeholder="What you can confirm: brand, storage, condition, accessories." />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-extrabold">Condition
                <select value={condition} onChange={(event) => setCondition(event.target.value)} className="input-base mt-2">
                  <option value="">Select condition</option>
                  <option value="new">New</option>
                  <option value="like-new">Like New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                  <option value="for-parts">For Parts</option>
                </select>
              </label>
              <label className="text-xs font-extrabold">Price (PKR)
                <input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} className="input-base mt-2" />
              </label>
            </div>
            {category && <p className="mt-3 text-xs font-bold text-violet-700">Confirmed category: {category}</p>}
            {Object.keys(attributes).length > 0 && (
              <p className="mt-2 text-xs font-semibold text-slate-600">Applied attributes: {Object.entries(attributes).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>
            )}
          </section>

          <AIListingAssistant
            title={title}
            description={description}
            category={category}
            condition={condition}
            price={price}
            attributes={attributes}
            onApplyTitle={setTitle}
            onApplyDescription={setDescription}
            onApplyCategory={(next) => setCategory(next)}
            onApplyAttribute={(key, value) => setAttributes((current) => ({ ...current, [key]: value }))}
          />
        </div>

        <div className="space-y-4">
          <AIQualityScore title={title} description={description} category={category} attributes={attributes} price={price} condition={condition} />
          <AIPriceInsight category={category} condition={condition} price={price} attributes={attributes} />
        </div>
      </div>
    </DashboardLayout>
  );
}
