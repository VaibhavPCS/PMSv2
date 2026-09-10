'use client';

import React from 'react';
import { Bell, X, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  unreadCount: number;
  onOpenNotifications: () => void;
  onLogout: () => void;
}

const getInitials = (name: string) => {
  return name?.charAt(0).toUpperCase() || 'U';
};

// Profile Dropdown Overlay (extracted from responsive-dashboard-layout for the
// <1000 LOC split; markup kept identical).
const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  userRole,
  unreadCount,
  onOpenNotifications,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Profile Card - Center positioned */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 w-80 max-w-[90vw]">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl">
                {getInitials(userName || 'User')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{userName}</p>
              <p className="text-sm text-gray-500 hidden sm:block">{userEmail}</p>
              <p className="text-xs text-gray-400 uppercase mt-1">{userRole}</p>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {/* Open notification modal instead of navigate */}
            <button
              onClick={onOpenNotifications}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-between"
            >
              <span>View all notifications</span>
              <Bell className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {/* Commented out as per user request */}
            {/* <button
              onClick={() => {
                setIsProfileOpen(false);
                navigate('/settings');
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left"
            >
              Settings
            </button> */}
            <button
              onClick={onLogout}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left font-medium flex items-center justify-between"
            >
              <span>Sign Out</span>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileDropdown;
