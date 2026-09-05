import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { get, ApiClientError } from './client';

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useApi<T>(path: string | null, auth = true): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!path) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    get<T>(path, auth)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof ApiClientError ? e.message : 'Something went wrong.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      cancelled.current = true;
    };
  }, [path, auth, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { data, error, loading, refetch };
}

/** Fetch once + refetch every time the screen gains focus. */
export function useApiFocus<T>(path: string | null, auth = true): ApiState<T> {
  const { data, error, loading, refetch } = useApi<T>(path, auth);
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );
  return { data, error, loading, refetch };
}