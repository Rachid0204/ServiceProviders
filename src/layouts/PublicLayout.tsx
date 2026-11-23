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
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-emerald-700 focus:text-white focus:text-xs focus:font-semibold"
      >
        Aller au contenu principal / الانتقال إلى المحتوى الرئيسي
      </a>
      <Navbar />
      <main id="top" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
