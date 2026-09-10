'use client';

// Archived screen (Next.js App Router port of the OLD
// app/routes/archived/archived.tsx). The old route is a placeholder that
// renders only the text "Archived" — there are no archived-list or restore
// endpoints wired in the old app yet. The UI is therefore ported VERBATIM so it
// stays pixel-identical to the old screen; the restore wiring will land once
// the backend archived endpoints exist.

import React from 'react';

export function ArchivedView() {
  return (
    <div>
      Archived
    </div>
  );
}

export default ArchivedView;
