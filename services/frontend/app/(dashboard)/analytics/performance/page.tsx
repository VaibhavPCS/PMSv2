'use client';

// Route: /analytics/performance — thin wrapper around PerformanceView.
// Wrapped in RoleProvider + FilterProvider (consumed by the view + selector),
// and Suspense because the view reads useSearchParams.

import { Suspense } from 'react';
import { RoleProvider } from '@/components/analytics/RoleContext';
import { FilterProvider } from '@/components/analytics/FilterContext';
import { PerformanceView } from '@/components/analytics/PerformanceView';

export default function PerformancePage() {
  return (
    <RoleProvider>
      <FilterProvider>
        <Suspense fallback={null}>
          <PerformanceView />
        </Suspense>
      </FilterProvider>
    </RoleProvider>
  );
}
