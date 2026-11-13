import { useState } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignInForm } from '@/components/auth/SignInForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

export function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'register'>('sign-in');

  return mode === 'sign-in' ? (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your gym.">
      <SignInForm onSwitch={() => setMode('register')} />
    </AuthShell>
  ) : (
    <AuthShell title="Create your account" subtitle="Start with your email and password. You will set up your gym in the next step.">
      <RegisterForm onSwitch={() => setMode('sign-in')} />
    </AuthShell>
  );
}
