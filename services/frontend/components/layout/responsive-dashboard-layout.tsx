'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeProvider, useBadges } from '@/providers/BadgeProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useLogout } from '@/hooks/useAuth';
import { Menu } from 'lucide-react';
import VerticalSidebar from './VerticalSidebar';
import HorizontalNavbar from './HorizontalNavbar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { fetchData, patchData } from '@/lib/fetch-util';
import { toast } from 'sonner';
import { buildApiUrl } from '@/lib/config';
import { postData } from '@/lib/fetch-util';
import { getSocketUrl, gracefulSocketDisconnect } from '@/lib/config';
import { io, Socket } from 'socket.io-client';
import MobileSidebarDrawer from './dashboard-overlays/MobileSidebarDrawer';
import ProfileDropdown from './dashboard-overlays/ProfileDropdown';
import NotificationModal, {
  type Notification,
} from './dashboard-overlays/NotificationModal';

interface UserInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
}

const ResponsiveDashboardContent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const { mutate: logout } = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const { refreshBadgeCounts } = useBadges();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Cleanup when not authenticated
      if (socketRef.current) {
        gracefulSocketDisconnect(socketRef.current);
        socketRef.current = null;
        setSocket(null);
      }
      isConnectingRef.current = false;
      return;
    }

    // Already connected or connecting
    if (socketRef.current || isConnectingRef.current) {
      return;
    }

    fetchUserInfo();
    fetchNotifications();

    let retryCount = 0;
    const maxRetries = 5;
    let timeoutId: ReturnType<typeof setTimeout>;

    // Initialize socket connection with retry logic for token availability
    const initSocket = () => {
      const token = localStorage.getItem('token');

      // If no token yet, retry with exponential backoff (up to maxRetries)
      if (!token) {
        retryCount++;
        if (retryCount <= maxRetries) {
          // Retry after increasing delay: 200ms, 400ms, 800ms, 1600ms, 3200ms
          timeoutId = setTimeout(initSocket, 200 * Math.pow(2, retryCount - 1));
        }
        // Don't log warning - this is expected during React Strict Mode double-invoke
        return;
      }

      isConnectingRef.current = true;

      const newSocket = io(getSocketUrl(), {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        autoConnect: false, // We'll connect manually after setup
      });

      newSocket.on('connect', () => {
        isConnectingRef.current = false;
      });

      newSocket.on('connect_error', (error) => {
        console.warn('Dashboard: Socket connection error:', error.message);
        isConnectingRef.current = false;
        // If auth error, don't keep retrying
        if (error.message.includes('Authentication')) {
          newSocket.disconnect();
        }
      });

      newSocket.on('notification', (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        refreshBadgeCounts();
        try {
          toast.success(notification.title || 'New notification');
        } catch {}
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Now connect
      newSocket.connect();
    };

    // Start with a small initial delay
    timeoutId = setTimeout(initSocket, 100);

    return () => {
      clearTimeout(timeoutId);
      if (socketRef.current) {
        gracefulSocketDisconnect(socketRef.current);
        socketRef.current = null;
        setSocket(null);
      }
      isConnectingRef.current = false;
    };
  }, [isAuthenticated]);

  const fetchUserInfo = async () => {
    try {
      const response = await fetchData('/auth/me');
      setUserInfo(response.data ?? response.user);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await fetchData('/notification');
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await patchData(`/notification/${notificationId}/read`, {});
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      refreshBadgeCounts();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await patchData('/notification/read-all', {});
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      refreshBadgeCounts();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'workspace_invite': return '🏢';
      case 'task_assigned': return '📋';
      case 'task_updated': return '✏️';
      case 'task_reassigned': return '🔄';
      case 'task_overdue': return '⚠️';
      case 'task_overdue_reminder': return '🔔';
      case 'task_comment': return '💬';
      case 'subtask_assigned': return '🧩';
      case 'subtask_approval_pending': return '⏳';
      case 'subtask_approved': return '✅';
      case 'subtask_rejected': return '❌';
      default: return '📢';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification._id);
      }
      setIsNotificationOpen(false);
      setIsProfileOpen(false);

      const { data } = notification;

      // Check resource existence before navigation
      try {
        if (data.taskId) {
          const existsResponse = await fetch(buildApiUrl(`/task/${data.taskId}/exists`), { credentials: 'include' });
          if (!existsResponse.ok) {
            toast.error('This task no longer exists.');
            return;
          }
          const taskResponse = await fetch(buildApiUrl(`/task/${data.taskId}`), { credentials: 'include' });
          if (taskResponse.ok) {
            const taskData = await taskResponse.json();
            if (taskData.task?.isActive === false) {
              toast.error('This task has been deleted or archived');
              return;
            }
          }
        } else if (data.projectId) {
          const existsResponse = await fetch(buildApiUrl(`/project/${data.projectId}/exists`), { credentials: 'include' });
          if (!existsResponse.ok) {
            toast.error("This project no longer exists or you don't have access to it");
            return;
          }
          const projectResponse = await fetch(buildApiUrl(`/project/${data.projectId}`), { credentials: 'include' });
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            if (projectData.project?.isActive === false) {
              toast.error('This project has been deleted or archived');
              return;
            }
          }
        }

        if (data.workspaceId) {
          const existsResponse = await fetch(buildApiUrl(`/workspace/${data.workspaceId}/exists`), { credentials: 'include' });
          if (!existsResponse.ok) {
            toast.error("This workspace no longer exists or you don't have access to it");
            return;
          }
          const workspaceResponse = await fetch(buildApiUrl(`/workspace/${data.workspaceId}`), { credentials: 'include' });
          if (workspaceResponse.ok) {
            const workspaceData = await workspaceResponse.json();
            if (workspaceData.workspace?.isArchived === true) {
              toast.error('This workspace has been archived');
              return;
            }
          }

          try {
            localStorage.setItem('currentWorkspaceId', data.workspaceId);
          } catch {}
          try {
            await postData('/workspace/switch', { workspaceId: data.workspaceId });
          } catch (err) {
            console.error('Failed to switch workspace from notification:', err);
          }
        }
      } catch (error) {
        console.error('Error checking resource existence:', error);
        toast.error('Unable to verify resource access');
        return;
      }

      let targetPath = '/dashboard';
      if (data.taskId) {
        targetPath = `/task/${data.taskId}`;
      } else if (data.projectId) {
        targetPath = `/project/${data.projectId}`;
      } else if (data.workspaceId) {
        targetPath = `/workspace`;
      } else if (data.meetingId) {
        targetPath = `/meetings`;
      } else if (data.inviteId) {
        targetPath = `/workspace`;
      }

      router.push(targetPath);
    } catch (err) {
      console.error('Notification navigation error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'U';
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex bg-[#F9F9F9] relative">
      {/* Desktop Sidebar - Always visible on lg+ */}
      <div className="hidden lg:block">
        <VerticalSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebarDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Profile Dropdown Overlay */}
      <ProfileDropdown
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userName={userInfo?.name}
        userEmail={userInfo?.email}
        userRole={userInfo?.role}
        unreadCount={unreadCount}
        onOpenNotifications={() => {
          setIsNotificationOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Notification Modal - Appears on top of profile */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        loadingNotifications={loadingNotifications}
        unreadCount={unreadCount}
        onMarkAllAsRead={markAllAsRead}
        onNotificationClick={handleNotificationClick}
        formatTimeAgo={formatTimeAgo}
        getNotificationIcon={getNotificationIcon}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <p className="font-semibold text-gray-900">PMS</p>
              <p className="text-xs text-gray-500">Project Management</p>
            </div>
          </div>

          {/* Mobile Profile Button with Notification Indicator */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="relative"
          >
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {getInitials(userInfo?.name || 'User')}
              </AvatarFallback>
            </Avatar>

            {/* Orange Notification Indicator on Name */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>
        </div>

        {/* Desktop Horizontal Navbar */}
        <div className="hidden lg:block">
          <HorizontalNavbar />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const ResponsiveDashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <BadgeProvider>
      <ResponsiveDashboardContent>{children}</ResponsiveDashboardContent>
    </BadgeProvider>
  );
};

export default ResponsiveDashboardLayout;
