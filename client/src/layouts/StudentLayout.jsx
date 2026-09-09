import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Award,
  History,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  GraduationCap,
} from 'lucide-react';

export const StudentLayout = () => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Available Exams', path: '/student/exams', icon: FileSpreadsheet },
    { label: 'My Results', path: '/student/results', icon: Award },
    { label: 'Exam History', path: '/student/history', icon: History },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Hide header/sidebar when student is taking an active exam for concentration
  const isTakingExam = location.pathname.includes('/take');

  if (isTakingExam) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header Navigation */}
      <header className="h-16 border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between bg-slate-900/80 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 leading-tight">Student Exam Portal</h1>
            <p className="text-[10px] text-indigo-400 font-semibold">{user?.class_name || 'Academic Center'}</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Profile & Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center font-bold text-xs text-indigo-300">
              {user?.full_name?.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-xs text-left">
              <p className="font-semibold text-slate-200">{user?.full_name}</p>
              <p className="text-[10px] text-slate-500">{user?.student_id}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};
