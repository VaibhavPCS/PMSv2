'use client';

// Route: /analytics/leaderboard — thin wrapper around LeaderboardView.
// FilterProvider supplied for the WorkspaceProjectSelector used in the header.

import { FilterProvider } from '@/components/analytics/FilterContext';
import { LeaderboardView } from '@/components/analytics/LeaderboardView';

export default function LeaderboardPage() {
  return (
    <FilterProvider>
      <LeaderboardView />
    </FilterProvider>
  );
}
