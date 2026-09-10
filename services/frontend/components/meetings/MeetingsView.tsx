'use client';

// Meetings screen container for the Next.js App Router. The OLD app shipped a
// "coming soon" placeholder at app/routes/meetings/meetings.tsx, so this builds
// the real meetings list using the ported meeting-card / create-meeting-modal
// components, plus a Calendar tab that reuses the ported task-calendar view.
// Tailwind classes mirror the OLD app's meeting visual language verbatim.

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, ListTodo, CalendarDays } from 'lucide-react';
import { fetchData } from '@/lib/fetch-util';
import { useAuth } from '@/hooks/use-auth';
import { MeetingCard } from './meeting-card';
import { CreateMeetingModal } from './create-meeting-modal';
import { MeetingsCalendarView } from './MeetingsCalendarView';

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  scheduledDate: string;
  duration: number;
  meetingLink?: string;
  organizer: {
    _id: string;
    name: string;
    email: string;
  };
  participants: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
    };
    status: 'pending' | 'accepted' | 'declined';
    responseDate?: string;
  }>;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    mimeType: string;
  }>;
  createdAt: string;
}

type Tab = 'list' | 'calendar';

export function MeetingsView() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('list');

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);

      // Set workspace ID in localStorage for the request interceptor
      const workspaceId = typeof user?.currentWorkspace === 'string'
        ? user.currentWorkspace
        : user?.currentWorkspace?._id;
      if (workspaceId) {
        localStorage.setItem('currentWorkspaceId', workspaceId);
      }

      const response = await fetchData('/meetings');
      if (response.success || response.meetings) {
        setMeetings(response?.data?.data ?? response?.meetings ?? (Array.isArray(response?.data) ? response.data : []) ?? []);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.currentWorkspace]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleCreateSuccess = () => {
    fetchMeetings();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
            <p className="text-gray-600 text-sm mt-1">
              Schedule and manage your meetings here.
            </p>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center sm:justify-start">
          <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTab('list')}
              className={`h-8 px-4 text-xs font-medium capitalize rounded-md transition-all flex items-center gap-2 ${
                activeTab === 'list'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ListTodo className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`h-8 px-4 text-xs font-medium capitalize rounded-md transition-all flex items-center gap-2 ${
                activeTab === 'calendar'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>
        </div>

        {activeTab === 'list' ? (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-700">Loading meetings...</span>
                </div>
              </div>
            ) : meetings.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No meetings scheduled</h3>
                  <p className="text-gray-500 mt-1 mb-4">
                    Get started by scheduling your first meeting.
                  </p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Schedule Meeting
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {meetings.map((meeting) => (
                  <MeetingCard
                    key={meeting._id}
                    meeting={meeting}
                    onUpdate={fetchMeetings}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <MeetingsCalendarView />
        )}
      </div>

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
