'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useRegister } from '@/hooks/useAuth';
import { Button, Input } from '@shared/ui';
import { ROUTES } from '@shared/constants';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const { mutate: register, isPending, error } = useRegister();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    register({ name: form.name, email: form.email, password: form.password });
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Create account</h2>
      <p className="text-sm text-gray-500 mb-6">Get started with PMS</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          Registration failed. This email may already be in use.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Full name" type="text" placeholder="Vaibhav Sahay"
          value={form.name} onChange={set('name')} error={errors.name}
          leftIcon={<User size={15} />} required autoComplete="name" />

        <Input label="Email" type="email" placeholder="you@example.com"
          value={form.email} onChange={set('email')} error={errors.email}
          leftIcon={<Mail size={15} />} required autoComplete="email" />

        <Input label="Password" type={showPw ? 'text' : 'password'} placeholder="Min 8 characters"
          value={form.password} onChange={set('password')} error={errors.password}
          leftIcon={<Lock size={15} />}
          rightIcon={
            <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Toggle password">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
          required autoComplete="new-password" />

        <Input label="Confirm password" type={showPw ? 'text' : 'password'} placeholder="Repeat password"
          value={form.confirm} onChange={set('confirm')} error={errors.confirm}
          leftIcon={<Lock size={15} />} required autoComplete="new-password" />

        <Button type="submit" variant="primary" size="md" loading={isPending} className="w-full mt-1">
          Create account
        </Button>
      </form>

      <p className="text-sm text-center text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href={ROUTES.LOGIN} className="text-blue-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}