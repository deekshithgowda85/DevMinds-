'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DevMindUser {
  username: string;
  displayName: string;
  createdAt: string;
}

export function useDevMindAuth() {
  const [user, setUser] = useState<DevMindUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Lazy-initialise from localStorage so it's available on first render
  // without causing a cascading re-render inside an effect.
  const [guestName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('devmind-guest-name');
  });

  // Check session on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username: string, password: string, displayName?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Registration failed');
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    setUser(null);
  }, []);

  return { user, loading, login, register, logout, guestName };
}
