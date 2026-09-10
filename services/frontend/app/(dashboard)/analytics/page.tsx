'use client';

// Next.js App Router port of OLD app/routes/analytics/analytics.tsx.
// Thin wrapper: wraps the dashboard shell in RoleProvider + FilterProvider
// (exactly as the old `Analytics` default export did) and renders the
// AnalyticsDashboard content. All markup lives in components/analytics/*.

import { RoleProvider } from '@/components/analytics/RoleContext';
import { FilterProvider } from '@/components/analytics/FilterContext';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <RoleProvider>
      <FilterProvider>
        <AnalyticsDashboard />
      </FilterProvider>
    </RoleProvider>
  );
}
