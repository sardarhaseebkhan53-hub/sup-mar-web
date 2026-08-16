import React from 'react';
import { Outlet } from 'react-router-dom';
import CategoryNav from '../components/navigation/CategoryNav';
import Footer from '../components/navigation/Footer';
import Header from '../components/navigation/Header';
import MobileNav from '../components/navigation/MobileNav';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-surface text-ink-900">
      <Header />
      <CategoryNav />
      <main><Outlet /></main>
      <Footer />
      <MobileNav />
    </div>
  );
}
