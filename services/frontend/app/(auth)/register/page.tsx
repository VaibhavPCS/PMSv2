'use client';

// The canonical sign-up screen lives at /sign-up (matching the old app and the
// AuthProvider public-route table). /register is kept as a redirect alias so any
// existing links to /register continue to work.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/sign-up');
  }, [router]);
  return null;
}
