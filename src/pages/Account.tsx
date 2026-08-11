// حسابي — تغيير كلمة مرور الأدمن الحالي.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useAdmin } from '../components/Guard';
import { changeOwnPassword, MIN_PASSWORD_LENGTH } from '../api/account';
import { PageHeader, Card, Btn, Field, Input, StatusChip } from '../components/ui';
import { useToast } from '../components/Toast';

export default function Account() {
  const admin = useAdmin();
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      if (next !== confirm) throw new Error('كلمتا المرور غير متطابقتين');
      if (!admin.email) throw new Error('لا يوجد بريد مرتبط بهذا الحساب');
      await changeOwnPassword(admin.email, current, next);
    },
    onSuccess: () => {
      toast('success', 'تم تغيير كلمة المرور — استخدمها في الدخول القادم');
      setCurrent('');
      setNext('');
      setConfirm('');
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <div>
      <PageHeader title="حسابي" subtitle="بيانات حساب الإدارة وكلمة المرور" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-bold">البيانات</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-subtext">الاسم</dt>
              <dd className="font-medium">{admin.full_name}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-subtext">البريد الإلكتروني</dt>
              <dd dir="ltr" className="font-medium">{admin.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-subtext">الدور</dt>
              <dd><StatusChip label="أدمن" tone="red" /></dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <KeyRound size={17} className="text-accent" />
            تغيير كلمة المرور
          </h2>
          <div className="space-y-4">
            <Field label="كلمة المرور الحالية">
              <Input
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </Field>
            <Field label="كلمة المرور الجديدة" hint={`${MIN_PASSWORD_LENGTH} أحرف على الأقل`}>
              <Input
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </Field>
            <Field label="تأكيد كلمة المرور الجديدة">
              <Input
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            <Btn
              variant="accent"
              busy={save.isPending}
              disabled={!current || !next || !confirm}
              onClick={() => save.mutate()}
            >
              حفظ كلمة المرور
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}
