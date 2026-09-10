'use client';

import React from 'react';

// Ported verbatim from the OLD app route app/routes/messages/messages.tsx.
// In the OLD app this route is an orphaned placeholder (it is not even
// registered in routes.ts) and simply renders a "coming soon" panel. The
// real direct-message / chat experience lives in the separate `chat` route,
// which is ported independently — so this page intentionally does not pull
// in or duplicate any chat components.
export default function MessagesPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Messages</h1>
        <p className="text-gray-600 mb-6">
          View and manage your messages here.
        </p>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Messages feature coming soon...</p>
        </div>
      </div>
    </div>
  );
}
