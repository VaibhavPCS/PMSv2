'use client';

// Route: /analytics/personal — thin wrapper around the ported PersonalStats.
// Mirrors OLD app/routes/analytics/personal.tsx.

import { PersonalStats } from '@/components/analytics/PersonalStats';

export default function PersonalProductivityPage() {
  return <PersonalStats />;
}
