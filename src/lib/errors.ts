export function errorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message
        : '';

  if (!raw) return 'Something went wrong. Please try again.';
  if (/failed to fetch|network/i.test(raw)) return 'Network error. Check your connection and try again.';
  if (/invalid login credentials/i.test(raw)) return 'Email or password is incorrect.';
  if (/already registered|already been registered/i.test(raw)) return 'An account with this email already exists.';
  return raw;
}
