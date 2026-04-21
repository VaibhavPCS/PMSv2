'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Input, Button } from '@shared/ui';
import { useRegister } from '@/hooks/useAuth';
import type { RegisterFormState } from '@/types';

const EMPTY: RegisterFormState = { name: '', email: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterFormState>(EMPTY);
  const [error, setError] = useState('');
  const { mutate: register, isPending } = useRegister();

  const set = <K extends keyof RegisterFormState>(k: K, v: string) =>
    setForm((prev: RegisterFormState) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setError('');
    register(
      { name: form.name, email: form.email, password: form.password },
      { onError: () => setError('Registration failed. Please try again.') }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Name" required value={form.name} onChange={e => set('name', e.target.value)} />
      <Input label="Email" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
      <Input label="Password" type="password" required value={form.password} onChange={e => set('password', e.target.value)} />
      <Input label="Confirm Password" type="password" required value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} error={error} />
      <Button type="submit" className="w-full" loading={isPending}>Create Account</Button>
      <p className="text-sm text-center text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
