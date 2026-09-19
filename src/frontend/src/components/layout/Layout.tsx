import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setMobileMenuOpen((value) => !value)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 space-y-6 mobile-main">
          {children}
        </main>
      </div>
    </div>
  );
};
