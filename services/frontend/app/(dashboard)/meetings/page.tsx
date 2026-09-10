'use client';

// Meetings route (Next.js App Router). Thin client wrapper composing the
// MeetingsView sub-component, which owns all state/data and markup.

import { MeetingsView } from '@/components/meetings/MeetingsView';

export default function MeetingsPage() {
  return <MeetingsView />;
}
