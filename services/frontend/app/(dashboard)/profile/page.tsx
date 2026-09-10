'use client';

// Profile page (Next.js App Router port of the OLD app/routes/profile/profile.tsx).
// Thin composer: all state/data + markup live in the sibling ProfileView
// presentational component. UI is pixel-identical to the old screen.

import { ProfileView } from '@/components/profile/ProfileView';

export default function ProfilePage() {
  return <ProfileView />;
}
