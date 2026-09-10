// Administration route (Next.js App Router port of
// OLD app/routes/administration/administration.tsx).
// Thin wrapper composing AdministrationView, which owns all markup.

import { AdministrationView } from '@/components/administration/AdministrationView';

export default function AdministrationPage() {
  return <AdministrationView />;
}
