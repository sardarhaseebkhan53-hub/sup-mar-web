import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import AiAssistantPanel from '../components/ai/AiAssistantPanel';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function AiAssistantPage() {
  useDocumentTitle('QAVLIO Assistant');
  return <main className="container-shell py-8 sm:py-12">
    <header className="max-w-2xl">
      <p className="eyebrow">Marketplace intelligence</p>
      <h1 className="mt-2 flex items-center gap-2 text-h1"><Sparkles className="text-violet-600" /> QAVLIO Assistant</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Ask in plain language. I search real QAVLIO listings and official help — I never invent prices or sellers.</p>
    </header>
    <div className="mt-6 min-h-[70vh]"><AiAssistantPanel variant="page" /></div>
    <p className="mt-4 text-xs text-slate-500">Prefer filters? <Link to="/search" className="font-extrabold text-violet-700">Continue with normal search</Link></p>
  </main>;
}
