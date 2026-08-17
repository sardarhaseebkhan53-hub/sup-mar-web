import { motion, useReducedMotion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import AiAssistant from '../components/home/AiAssistant';
import BottomNavigation from '../components/layout/BottomNavigation';
import CategoryNav from '../components/layout/CategoryNav';
import Footer from '../components/layout/Footer';
import Header from '../components/layout/Header';

export default function PublicLayout() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  return <div className="min-h-screen bg-surface text-ink-900"><Header /><CategoryNav /><motion.main key={location.pathname} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}><Outlet /></motion.main><Footer /><AiAssistant /><BottomNavigation /></div>;
}
