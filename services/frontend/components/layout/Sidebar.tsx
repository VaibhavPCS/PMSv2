'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  BarChart2, Settings, Users, LogOut, Menu, X
} from 'lucide-react';
import { cn } from '@shared/utils';
import { ROUTES } from '@shared/constants';
import { useLogout } from '@/hooks/useAuth';
import { useState } from 'react';

const NAV = [
  { href: ROUTES.DASHBOARD,  label: 'Dashboard',  icon: LayoutDashboard },
  { href: ROUTES.PROJECTS,   label: 'Projects',   icon: FolderKanban },
  { href: ROUTES.TASKS,      label: 'Tasks',      icon: CheckSquare },
  { href: ROUTES.ANALYTICS,  label: 'Analytics',  icon: BarChart2 },
  { href: ROUTES.MEMBERS,    label: 'Members',    icon: Users },
  { href: ROUTES.SETTINGS,   label: 'Settings',   icon: Settings },
] as const;

export function Sidebar() {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);
  const { mutate: logout, isPending } = useLogout();

  const NavItem = ({ href, label, icon: Icon }: (typeof NAV)[number]) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
      >
        <Icon size={18} className="shrink-0" />
        {label}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.4" />
          </svg>
        </div>
        <span className="font-bold text-gray-900 text-base">PMS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        {NAV.map((item) => <NavItem key={item.href} {...item} />)}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => logout()}
          disabled={isPending}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full disabled:opacity-50"
        >
          <LogOut size={18} className="shrink-0" />
          {isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200 flex flex-col">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}