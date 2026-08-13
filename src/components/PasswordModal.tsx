// تعيين كلمة مرور لمستخدم — مشترك بين تابات الحسابات.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { setUserPassword, generatePassword, MIN_PASSWORD_LENGTH } from '../api/account';
import { Btn, Field, Input } from './ui';
import { Modal } from './Modal';
import { useToast } from './Toast';

export function PasswordModal({ userId, name, email, onClose }: {
  userId: string;
  name: string;
  email: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);

  const save = useMutation({
    mutationFn: () => setUserPassword(userId, password),
    onSuccess: () => {
      setDone(true);
      toast('success', `تم تعيين كلمة مرور «${name}»`);
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={`كلمة مرور — ${name}`} open onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-surface p-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-subtext">البريد</span>
            <span dir="ltr">{email ?? '—'}</span>
          </div>
        </div>

        <Field label="كلمة المرور الجديدة" hint={`${MIN_PASSWORD_LENGTH} أحرف على الأقل`}>
          <div className="flex gap-2">
            <Input
              dir="ltr"
              autoComplete="off"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setDone(false); }}
              placeholder="اكتبها أو ولّدها تلقائيًا"
            />
            <Btn variant="ghost" onClick={() => { setPassword(generatePassword()); setDone(false); }}>
              توليد
            </Btn>
          </div>
        </Field>

        {done ? (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-success">
            تم التغيير. سلّم المستخدم كلمة المرور دي واطلب منه يغيّرها بعد أول دخول.
          </div>
        ) : (
          <p className="text-xs text-subtext">
            التغيير فوري ولا يُرسَل للمستخدم تلقائيًا — أنت مسؤول عن تسليمها له بطريقة آمنة.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={save.isPending}>
            {done ? 'إغلاق' : 'إلغاء'}
          </Btn>
          <Btn variant="accent" busy={save.isPending} disabled={!password} onClick={() => save.mutate()}>
            تعيين كلمة المرور
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
