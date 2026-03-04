import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUserStore, useSettingsStore } from '../stores';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutHelp } from './KeyboardShortcutHelp';
import { Role } from '../types';
import type { Theme } from '../stores';
import {
  LayoutDashboard,
  PlusCircle,
  Settings,
  User as UserIcon,
  Menu,
  X,
  BarChart2,
  Keyboard,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.75} />, roles: Object.values(Role) },
  { path: '/requests/new', label: 'New Request', icon: <PlusCircle size={20} strokeWidth={1.75} />, roles: [Role.REQUESTER, Role.ADMIN] },
  { path: '/reports', label: 'Reports', icon: <BarChart2 size={20} strokeWidth={1.75} />, roles: [Role.ADMIN, Role.MANAGER, Role.POC, Role.SPECIALIST, Role.TECHNICAL_REVIEWER] },
  { path: '/admin', label: 'Admin Panel', icon: <Settings size={20} strokeWidth={1.75} />, roles: [Role.ADMIN] },
];

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun size={14} strokeWidth={1.75} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={14} strokeWidth={1.75} /> },
  { value: 'system', label: 'System', icon: <Monitor size={14} strokeWidth={1.75} /> },
];

export const Layout: React.FC = () => {
  const currentUser = useUserStore((s) => s.currentUser);
  const users = useUserStore((s) => s.users);
  const setCurrentUser = useUserStore((s) => s.setCurrentUser);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { showHelp, setShowHelp } = useKeyboardShortcuts();

  const filteredMenu = menuItems.filter(item => item.roles.includes(currentUser.role));

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row overflow-hidden transition-colors duration-200">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg" role="banner">
        <div className="font-bold text-lg tracking-tight">CodeMaster</div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          className="p-2 -mr-2 rounded-lg hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {isMobileMenuOpen ? <X strokeWidth={1.75} /> : <Menu strokeWidth={1.75} />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Main sidebar"
        className={`
        fixed md:sticky top-0 h-screen w-64 sidebar-gradient text-gray-100 flex flex-col transition-transform z-20 shadow-xl
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-700/50">
          <h1 className="text-2xl font-bold tracking-tight text-white">CodeMaster</h1>
          <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest font-medium">Governance Tool</p>
        </div>

        <nav className="flex-1 p-4 space-y-1" role="navigation" aria-label="Main navigation">
          {filteredMenu.map(item => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
              aria-current={isActive(item.path) ? 'page' : undefined}
              className={`w-full flex items-center gap-3 py-3 min-h-[44px] transition-all duration-200 rounded-r-lg pl-5 border-l-3 ${
                isActive(item.path)
                  ? 'nav-active text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-700/40 hover:text-white border-transparent'
              }`}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Theme Toggle + Keyboard Shortcut Hint + Role Switcher */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          {/* Theme Toggle */}
          <div className="mb-3">
            <div id="theme-label" className="text-[10px] text-slate-500 mb-1.5 uppercase font-semibold tracking-widest">Theme</div>
            <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700" role="radiogroup" aria-labelledby="theme-label">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  role="radio"
                  aria-checked={theme === opt.value}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    theme === opt.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  aria-label={`${opt.label} theme`}
                >
                  {opt.icon}
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowHelp(true)}
            className="w-full flex items-center gap-2 text-slate-400 hover:text-slate-200 text-xs mb-3 transition"
            aria-label="Show keyboard shortcuts"
          >
            <Keyboard size={14} strokeWidth={1.75} />
            <span>Keyboard shortcuts</span>
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 bg-slate-700 rounded border border-slate-600">?</kbd>
          </button>

          <div className="text-[10px] text-slate-500 mb-2 uppercase font-semibold tracking-widest">Demo: Switch Role</div>
          <select
            className="w-full bg-slate-800 border border-slate-600 text-xs rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            value={currentUser.id}
            aria-label="Switch demo user role"
            onChange={(e) => {
              const u = users.find(u => u.id === e.target.value);
              if(u) setCurrentUser(u);
            }}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
              <UserIcon size={16} strokeWidth={1.75} />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="truncate font-medium text-white">{currentUser.name}</div>
              <div className="truncate text-xs text-slate-400">{currentUser.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main id="main-content" className="flex-1 p-4 md:p-8 overflow-y-auto min-h-0 bg-slate-50 dark:bg-slate-900 transition-colors duration-200" aria-label="Main content">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};
