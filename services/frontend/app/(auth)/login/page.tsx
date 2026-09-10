'use client';

// The canonical sign-in screen lives at /sign-in (matching the old app and the
// AuthProvider public-route table). /login is kept as a redirect alias so any
// existing links to /login continue to work.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/sign-in');
  }, [router]);
  return null;
}
