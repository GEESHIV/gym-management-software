import { useCallback, useEffect, useState } from 'react';
import { fetchGymSnapshot, type GymSnapshot } from '@/lib/gymSnapshot';
import { errorMessage } from '@/lib/errors';

export function useGymSnapshot() {
  const [data, setData] = useState<GymSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchGymSnapshot());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}
