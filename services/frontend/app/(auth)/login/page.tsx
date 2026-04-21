'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useLogin } from '@/hooks/useAuth';
import { Button } from '@shared/ui';
import { Input } from '@shared/ui';
import { ROUTES } from '@shared/constants';
import type { Metadata } from 'next';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});

  const { mutate: login, isPending, error } = useLogin();

  function validate() {
    const e: typeof errors = {};
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    login({ email, password });
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
      <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          Invalid email or password. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          leftIcon={<Mail size={15} />}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type={showPw ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          leftIcon={<Lock size={15} />}
          rightIcon={
            <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Toggle password">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
          required
          autoComplete="current-password"
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="md" loading={isPending} className="w-full mt-1">
          Sign in
        </Button>
      </form>

      <p className="text-sm text-center text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href={ROUTES.REGISTER} className="text-blue-600 font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}