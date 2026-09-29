import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Toaster } from 'sonner';
import { ClientIntakeForm } from './components/ClientIntakeForm';
import { motion } from 'framer-motion';

function Logo() {
  return (
    <div className="flex flex-col items-center select-none group py-1">
      <div className="font-serif text-2xl md:text-3xl font-light tracking-wide text-foreground flex items-center gap-1">
        <span className="font-semibold tracking-tight">C</span>
        <span className="text-muted-foreground/60 font-light lowercase text-lg md:text-xl -ml-0.5">ato</span>
        <span className="font-serif italic text-2xl md:text-3xl font-light text-foreground/80 ml-0.5">L</span>
        <span className="text-muted-foreground/60 font-light lowercase text-lg md:text-xl -ml-0.5">abs</span>
      </div>
      <div className="text-[9px] md:text-[10px] tracking-[0.35em] font-sans font-medium text-muted-foreground/80 uppercase mt-1 scale-90">
        Design & Intelligence
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 relative flex flex-col font-sans">
      <Toaster position="top-center" theme={theme} />

      <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 sticky top-0">
        <div className="container mx-auto px-4 md:px-8 h-20 flex justify-between items-center">
          <div className="w-10" /> {/* Spacer */}
          <Logo />
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 py-10 relative z-20 flex-1 flex flex-col justify-center">
        <ClientIntakeForm />
      </main>

      <footer className="w-full px-6 py-8 text-center text-sm text-muted-foreground border-t border-border/40 mt-auto">
        &copy; {new Date().getFullYear()} Cato Labs. All rights reserved.
      </footer>
    </div>
  );
}

