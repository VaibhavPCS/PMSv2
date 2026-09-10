'use client';

import React from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LegacyNotification } from './types';

interface PanelSharedProps {
  notifications: LegacyNotification[];
  loadingNotifications: boolean;
  unreadCount: number;
  markAllAsRead: () => void;
  setShowNotifications: (v: boolean) => void;
  getNotificationHref: (n: LegacyNotification) => string;
  handleNotificationClick: (n: LegacyNotification) => void;
  formatTimeAgo: (dateString: string) => string;
  getNotificationIcon: (type: string) => string;
}

// ✅ Mobile Notification Panel Component (split out of the 936-LOC sidebar)
export const MobileNotificationPanel: React.FC<PanelSharedProps> = ({
  notifications,
  loadingNotifications,
  unreadCount,
  markAllAsRead,
  setShowNotifications,
  getNotificationHref,
  handleNotificationClick,
  formatTimeAgo,
  getNotificationIcon,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="w-full max-w-sm bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Fixed Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-8 px-3"
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="max-h-96 overflow-y-auto">
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
          <div className="p-4 space-y-3">
            {notifications.map((notification) => (
              <a
                key={notification._id}
                href={getNotificationHref(notification)}
                className={`block p-3 rounded-lg cursor-pointer transition-colors no-underline ${!notification.isRead
                  ? 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100'
                  : 'hover:bg-gray-50'
                  }`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNotificationClick(notification);
                }}
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
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ✅ Desktop Notification Panel Component (split out of the 936-LOC sidebar)
export const DesktopNotificationPanel: React.FC<
  PanelSharedProps & { className?: string }
> = ({
  className,
  notifications,
  loadingNotifications,
  unreadCount,
  markAllAsRead,
  setShowNotifications,
  getNotificationHref,
  handleNotificationClick,
  formatTimeAgo,
  getNotificationIcon,
}) => (
  <div className={`w-80 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden ${className}`}>
    <div className="p-4 border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7 px-3 hover:bg-gray-100"
            >
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotifications(false)}
            className="h-7 w-7 p-0 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>

    <div className="h-48 overflow-y-auto overscroll-contain">
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
        <div className="p-2">
          {notifications.map((notification) => (
            <a
              key={notification._id}
              href={getNotificationHref(notification)}
              className={`block p-3 mb-2 rounded-md cursor-pointer transition-colors no-underline ${!notification.isRead
                ? 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100'
                : 'hover:bg-gray-50'
                }`}
              onClick={(e) => {
                e.preventDefault();
                handleNotificationClick(notification);
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="text-lg flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
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
            </a>
          ))}
        </div>
      )}
    </div>
  </div>
);
