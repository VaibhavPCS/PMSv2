'use client';

import React from 'react';
import VerticalSidebar from '../VerticalSidebar';

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mobile Sidebar Overlay (extracted from responsive-dashboard-layout for the
// <1000 LOC split; markup kept identical).
const MobileSidebarDrawer: React.FC<MobileSidebarDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sliding Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden">
        {/* Commented out as per user request */}
        {/* <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img
              src="/pcs_logo.jpg"
              alt="PCS Logo"
              className="w-10 h-10 rounded-lg object-cover"
            />
            <span className="text-xl font-semibold text-gray-900">PMS</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div> */}

        <div className="h-full">
          <VerticalSidebar />
        </div>
      </div>
    </>
  );
};

export default MobileSidebarDrawer;
