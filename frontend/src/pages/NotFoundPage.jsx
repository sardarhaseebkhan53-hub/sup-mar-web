import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return <main className="grid min-h-screen place-items-center bg-ink-950 px-4 text-white"><div className="max-w-md text-center"><Logo inverse className="mb-10 justify-center" /><p className="text-8xl font-extrabold text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.25)]">404</p><h1 className="mt-4 text-3xl font-extrabold">This deal got away.</h1><p className="mt-3 text-sm leading-6 text-white/55">The page may have moved, expired, or never existed. Let’s get you back to discovering something great.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button to="/" variant="gold"><ArrowLeft size={16} /> Back home</Button><Button to="/browse" className="border-white/15 bg-white/10 text-white hover:bg-white/15"><Search size={16} /> Browse listings</Button></div></div></main>;
}
