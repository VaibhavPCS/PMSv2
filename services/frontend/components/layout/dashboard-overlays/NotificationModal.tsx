'use client';

import React from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  sender?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  readAt?: string;
  data: {
    workspaceId?: string;
    projectId?: string;
    taskId?: string;
    meetingId?: string;
    inviteId?: string;
  };
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  loadingNotifications: boolean;
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: Notification) => void;
  formatTimeAgo: (dateString: string) => string;
  getNotificationIcon: (type: string) => string;
}

// Notification Modal (extracted from responsive-dashboard-layout for the
// <1000 LOC split; markup kept identical).
const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  loadingNotifications,
  unreadCount,
  onMarkAllAsRead,
  onNotificationClick,
  formatTimeAgo,
  getNotificationIcon,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[60]"
        onClick={onClose}
      />

      {/* Notification Panel - Center positioned on top */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-[70] w-[90vw] max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="text-xs h-8 px-3"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {loadingNotifications ? (
            <div className="p-8 text-center text-sm text-gray-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${!notification.isRead
                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  onClick={() => onNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          {notification.sender && (
                            <p className="text-xs text-gray-500 mt-1">
                              from {notification.sender.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationModal;

export type { Notification };
