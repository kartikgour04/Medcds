import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../context/authStore';
import {
  HomeIcon, UserIcon, ClipboardDocumentListIcon, DocumentTextIcon,
  ArrowRightOnRectangleIcon, PlusCircleIcon, Bars3Icon, XMarkIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard',      icon: HomeIcon,                    label: 'Dashboard' },
  { to: '/profile',        icon: UserIcon,                    label: 'My Profile' },
  { to: '/assessment/new', icon: PlusCircleIcon,              label: 'New Assessment', highlight: true },
  { to: '/reports',        icon: DocumentTextIcon,            label: 'My Reports' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
               style={{ background: 'linear-gradient(135deg,#2563eb,#16a34a)' }}>
            ⚕️
          </div>
          <div>
            <span className="font-display font-bold text-white text-lg">MedCDS</span>
            <p className="text-xs text-slate-500 -mt-0.5">Clinical Support</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, highlight }) => (
          <NavLink
            key={to} to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' :
                highlight   ? 'bg-green-950 text-green-400 border border-green-900 hover:bg-green-900/50' :
                              'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Disclaimer */}
      <div className="mx-3 mb-4 p-3 bg-amber-950/40 border border-amber-900/40 rounded-xl">
        <div className="flex items-start gap-2">
          <ShieldCheckIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80 leading-relaxed">
            Reports are for clinical support only. Always consult a qualified doctor.
          </p>
        </div>
      </div>

      {/* User */}
      <div className="px-3 pb-4 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center
                          text-xs font-bold text-white flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} title="Logout"
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowRightOnRectangleIcon className="w-4 h-4 text-slate-400 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"
               onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 bg-slate-900 border-r border-slate-800">
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800">
              <XMarkIcon className="w-5 h-5 text-slate-400" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3
                           bg-slate-900 border-b border-slate-800">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-800">
            <Bars3Icon className="w-5 h-5 text-slate-400" />
          </button>
          <span className="font-display font-bold text-white">⚕️ MedCDS</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
