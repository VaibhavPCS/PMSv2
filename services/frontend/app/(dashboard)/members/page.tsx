'use client';

// Members route (Next.js App Router port of OLD app/routes/members/members.tsx).
// Thin client wrapper composing MembersView, which owns all state/data + markup.

import { MembersView } from '@/components/workspace/MembersView';

export default function MembersPage() {
  return <MembersView />;
}
