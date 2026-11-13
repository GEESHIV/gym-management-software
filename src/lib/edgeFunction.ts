import { supabase } from '@/lib/supabase';

export async function invokeEdgeFunction<T extends object>(name: string, body: object, fallbackMessage: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, { body });
  if (error) {
    const response = (error as { context?: Response }).context;
    const payload = response ? await response.json().catch(() => null) : null;
    throw new Error((payload as { error?: string } | null)?.error ?? fallbackMessage);
  }
  if (!data || data.error) throw new Error(data?.error ?? fallbackMessage);
  return data;
}
