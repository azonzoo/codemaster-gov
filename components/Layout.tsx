import React, { useState } from 'react';
import { useStore } from '../store';
import { Role } from '../types';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ShieldCheck,
  Menu,
  X,
  BarChart2
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage }) => {
  const { currentUser, users, setCurrentUser } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.75} />, roles: Object.values(Role) },
    { id: 'new-request', label: 'New Request', icon: <PlusCircle size={20} strokeWidth={1.75} />, roles: [Role.REQUESTER, Role.ADMIN] },
    { id: 'reports', label: 'Reports', icon: <BarChart2 size={20} strokeWidth={1.75} />, roles: [Role.ADMIN, Role.MANAGER, Role.POC, Role.SPECIALIST, Role.TECHNICAL_REVIEWER] },
    { id: 'admin', label: 'Admin Panel', icon: <Settings size={20} strokeWidth={1.75} />, roles: [Role.ADMIN] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="font-bold text-lg tracking-tight">CodeMaster</div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X strokeWidth={1.75} /> : <Menu strokeWidth={1.75} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 h-screen w-64 sidebar-gradient text-gray-100 flex flex-col transition-transform z-20 shadow-xl
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-700/50">
          <h1 className="text-2xl font-bold tracking-tight text-white">CodeMaster</h1>
          <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest font-medium">Governance Tool</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {filteredMenu.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 py-3 transition-all duration-200 rounded-r-lg pl-5 border-l-3 ${
                activePage === item.id 
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
          {children}
        </div>
      </main>
    </div>
  );
};
