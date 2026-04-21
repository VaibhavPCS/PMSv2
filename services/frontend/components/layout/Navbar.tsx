'use client';

import { Bell, Search } from 'lucide-react';
import { useAuthContext } from '@/providers';

export function Navbar() {
  const { user } = useAuthContext();
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 w-64">
        <Search size={15} className="text-gray-400 shrink-0" />
        <input
          type="search"
          placeholder="Search projects, tasks…"
          className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Notifications">
          <Bell size={18} className="text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
          {initials}
        </div>
      </div>
    </header>
  );
}