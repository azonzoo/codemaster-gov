import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { Role } from '../types';
import {
  LayoutDashboard,
  PlusCircle,
  Settings,
  User as UserIcon,
  Menu,
  X,
  BarChart2
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.75} />, roles: Object.values(Role) },
  { path: '/requests/new', label: 'New Request', icon: <PlusCircle size={20} strokeWidth={1.75} />, roles: [Role.REQUESTER, Role.ADMIN] },
  { path: '/reports', label: 'Reports', icon: <BarChart2 size={20} strokeWidth={1.75} />, roles: [Role.ADMIN, Role.MANAGER, Role.POC, Role.SPECIALIST, Role.TECHNICAL_REVIEWER] },
  { path: '/admin', label: 'Admin Panel', icon: <Settings size={20} strokeWidth={1.75} />, roles: [Role.ADMIN] },
];

export const Layout: React.FC = () => {
  const { currentUser, users, setCurrentUser } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const filteredMenu = menuItems.filter(item => item.roles.includes(currentUser.role));

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="font-bold text-lg tracking-tight">CodeMaster</div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
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
      <aside className={`
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
              className={`w-full flex items-center gap-3 py-3 transition-all duration-200 rounded-r-lg pl-5 border-l-3 ${
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

        {/* Role Switcher for Demo */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
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
      <main className="flex-1 p-4 md:p-8 overflow-y-auto min-h-0 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
