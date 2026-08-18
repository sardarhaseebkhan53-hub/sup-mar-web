import React, { useState } from 'react';
import { ArrowLeft, Compass, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const submit = (event) => {
    event.preventDefault();
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/marketplace');
  };

  return (
    <main className="grid min-h-screen place-items-center bg-ink-950 px-4 text-white">
      <div className="w-full max-w-md text-center">
        <Logo inverse className="mb-10 justify-center" />
        <p className="text-8xl font-extrabold text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.25)]">404</p>
        <h1 className="mt-4 text-3xl font-extrabold">Looks like this listing got away.</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          The page may have moved, expired, or never existed. Search for what you&apos;re after or browse categories to get back to discovering.
        </p>
        <form onSubmit={submit} className="mt-6 flex gap-2 rounded-card border border-white/10 bg-white/5 p-2 focus-within:border-violet-400">
          <label className="sr-only" htmlFor="notfound-search">Search listings</label>
          <Search size={18} className="mx-1 my-auto shrink-0 text-white/40" />
          <input
            id="notfound-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for cars, phones, property…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          <button type="submit" className="shrink-0 rounded-control bg-gold-400 px-4 py-2 text-xs font-extrabold text-ink-950 hover:bg-gold-300">
            Search
          </button>
        </form>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to="/" variant="gold"><ArrowLeft size={16} /> Back home</Button>
          <Button to="/categories" className="border-white/15 bg-white/10 text-white hover:bg-white/15"><Compass size={16} /> Browse categories</Button>
        </div>
      </div>
    </main>
  );
}
