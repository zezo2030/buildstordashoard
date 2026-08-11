// حارس الدخول: جلسة + دور admin. الحارس تجربة استخدام فقط —
// الحدود الفعلية هي سياسات RLS في الداتابيز.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Spinner } from './ui';

type AdminProfile = { id: string; full_name: string; email: string | null; avatar_url: string | null };

const AdminCtx = createContext<AdminProfile | null>(null);

export function useAdmin(): AdminProfile {
  const p = useContext(AdminCtx);
  if (!p) throw new Error('useAdmin خارج الحارس');
  return p;
}

export function Guard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'anon' | 'not-admin' | 'ok'>('loading');
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check(session: Session | null) {
      if (!session) {
        if (!cancelled) setState('anon');
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name, email, avatar_url')
        .eq('id', session.user.id)
        .single();
      if (cancelled) return;
      if (error || !data || data.role !== 'admin') {
        await supabase.auth.signOut();
        setState('not-admin');
        return;
      }
      setProfile(data);
      setState('ok');
    }

    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // signOut داخل check يطلق SIGNED_OUT — ما نمسحش رسالة «ليس حساب أدمن» بيه
      if (event === 'SIGNED_OUT') setState((s) => (s === 'not-admin' ? s : 'anon'));
      if (event === 'SIGNED_IN') check(session);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === 'loading') return <Spinner label="جارٍ التحقق من الجلسة…" />;
  if (state === 'anon') return <Navigate to="/login" replace />;
  if (state === 'not-admin') return <Navigate to="/login" replace state={{ notAdmin: true }} />;
  return <AdminCtx.Provider value={profile}>{children}</AdminCtx.Provider>;
}
