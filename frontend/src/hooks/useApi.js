// ================================================================
// src/hooks/useApi.js
// General-purpose data fetching hooks for ERP modules.
//
//   useQuery(fn, deps, opts)  — fetch on mount / dep change
//   useMutation(fn)           — execute + track loading/error
//   usePaginated(fn, params)  — paginated list with page control
// ================================================================
import { useState, useEffect, useCallback, useRef } from 'react';

// ── useQuery — fetch data once / on dep change ─────────────────
export function useQuery(fetchFn, deps = [], opts = {}) {
  const { initialData = null, skip = false, onError } = opts;
  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error,   setError]   = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetch = useCallback(async () => {
    if (skip) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result?.data ?? result);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        const msg = err.response?.data?.error || err.message || 'Request failed';
        setError(msg);
        setLoading(false);
        onError?.(msg, err);
      }
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── useMutation — execute write operation ──────────────────────
export function useMutation(mutateFn, opts = {}) {
  const { onSuccess, onError } = opts;
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutateFn(...args);
      setLoading(false);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(msg);
      setLoading(false);
      onError?.(msg, err);
      throw err;
    }
  }, [mutateFn, onSuccess, onError]);

  return { execute, loading, error, clearError: () => setError(null) };
}

// ── usePaginated — paginated list with controls ────────────────
export function usePaginated(fetchFn, initialParams = {}) {
  const [params,  setParams]  = useState({ page: 1, limit: 20, ...initialParams });
  const [data,    setData]    = useState([]);
  const [pagination, setPagi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async (p = params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn(p);
      setData(res.data ?? []);
      setPagi(res.pagination ?? null);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, params]);

  useEffect(() => { fetch(); }, []);

  const setPage = useCallback((page) => {
    const next = { ...params, page };
    setParams(next);
    fetch(next);
  }, [params, fetch]);

  const setSearch = useCallback((search) => {
    const next = { ...params, search, page: 1 };
    setParams(next);
    fetch(next);
  }, [params, fetch]);

  const setFilter = useCallback((key, value) => {
    const next = { ...params, [key]: value, page: 1 };
    setParams(next);
    fetch(next);
  }, [params, fetch]);

  return {
    data, pagination, loading, error, params,
    refetch: () => fetch(params),
    setPage, setSearch, setFilter,
  };
}
