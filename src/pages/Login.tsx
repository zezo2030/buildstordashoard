// دخول الأدمن — نفس هوية شاشات الأوث في التطبيق (كحلي #0A2540 + برتقالي).
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, arError } from '../lib/supabase';
import { Btn, Field, Input } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    (location.state as { notAdmin?: boolean } | null)?.notAdmin
      ? 'هذا الحساب ليس حساب أدمن — الدخول للوحة التحكم مقصور على الإدارة.'
      : null,
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (err) {
      setError(arError(err));
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-xl">
        <div className="mb-6 text-center">
          <img
            src="/brand-mark.png"
            alt="Build Store"
            className="mx-auto size-14 rounded-2xl bg-white object-contain p-1.5 shadow-md ring-1 ring-line"
          />
          <h1 className="mt-3 text-xl font-bold text-navy">Build Store</h1>
          <p className="mt-1 text-sm text-subtext">لوحة تحكم الإدارة</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="البريد الإلكتروني">
            <Input
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </Field>
          <Field label="كلمة المرور">
            <Input
              type="password"
              dir="ltr"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
          <Btn type="submit" variant="accent" busy={busy} className="w-full">
            تسجيل الدخول
          </Btn>
        </form>
      </div>
    </div>
  );
}
