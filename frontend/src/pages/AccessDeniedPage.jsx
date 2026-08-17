import React from 'react';
import { LockKeyhole } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function AccessDeniedPage() {
  useDocumentTitle('Access denied');
  return <main className="grid min-h-screen place-items-center bg-ink-950 px-4 text-white"><div className="max-w-md text-center"><Logo inverse className="mb-10 justify-center" /><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/15 text-rose-300"><LockKeyhole size={28} /></span><h1 className="mt-6 text-3xl font-extrabold">You don’t have access here.</h1><p className="mt-3 text-sm leading-6 text-white/55">This workspace requires a different QAVLIO role. Permissions are always checked securely by the server.</p><Button to="/dashboard" variant="gold" className="mt-7">Go to my dashboard</Button></div></main>;
}
