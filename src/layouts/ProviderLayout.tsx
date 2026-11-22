import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const ProviderLayout: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div
      data-layout="provider"
      className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-clip"
    >
      <Navbar />
      <main id="top" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
