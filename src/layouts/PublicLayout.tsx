import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const PublicLayout: React.FC = () => {
  const { pathname, hash } = useLocation();

  // Scroll smoothly to hash anchors (#providers, #how-it-works) or top on navigation
  useEffect(() => {
    if (hash) {
      const targetId = hash.replace(/^#/, '');
      window.setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [pathname, hash]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-clip">
      <Navbar />
      <main id="top" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
