import { Crosshair, Settings, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  onOpenSettings: () => void;
  userEmail: string | null;
  onSignOut: () => void;
}

export default function Header({ onOpenSettings, userEmail, onSignOut }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : '??';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/25">
            <Crosshair className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight tracking-tight text-white">
              X-Hunter <span className="text-brand-400">AI</span>
            </h1>
            <p className="text-[11px] font-medium leading-tight text-slate-500">
              B2B Lead Hunting & Sales Automation
            </p>
          </div>
        </div>

        {/* Right side: status + user + settings */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-medium text-emerald-300">System Active</span>
          </div>

          {/* User avatar + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white transition-transform hover:scale-105"
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-xl animate-fade-in">
                <div className="border-b border-slate-800 px-4 py-3">
                  <p className="text-xs font-medium text-slate-400">Signed in as</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-slate-200">{userEmail ?? 'Unknown'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800"
                >
                  <Settings className="h-4 w-4 text-slate-500" />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
