// إضافة بائع من الداشبورد — شركة + حساب مالك + محفظة في خطوة واحدة.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSeller } from '../../api/accounts';
import { generatePassword, MIN_PASSWORD_LENGTH } from '../../api/account';
import { Btn, Field, Input } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';

export function AddSellerModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [nameAr, setNameAr] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [register, setRegister] = useState('');
  const [commission, setCommission] = useState('5');

  const m = useMutation({
    mutationFn: () =>
      createSeller({
        email, password, fullName, nameAr,
        phone: phone || undefined,
        governorate: governorate || undefined,
        commercialRegister: register || undefined,
        commissionRate: commission === '' ? undefined : Number(commission),
      }),
    onSuccess: () => {
      toast('success', `تم إنشاء البائع «${nameAr}»`);
      // الإنشاء ممكن يربط حساب بائع كان pending ويخليه active — فبيخرج من قايمة
      // «بانتظار الاعتماد» ومن عدّاد السايدبار. لازم نبطّل الأربعة زي useDone في
      // PendingSellersStrip، وإلا الشريط والبادچ يفضلوا يعدّوه لحد reload كامل.
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
      qc.invalidateQueries({ queryKey: ['pending-sellers'] });
      qc.invalidateQueries({ queryKey: ['nav-badges'] });
      onClose();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const ready =
    nameAr.trim() !== '' && email.trim() !== '' && password.length >= MIN_PASSWORD_LENGTH;

  return (
    <Modal title="إضافة بائع" open onClose={onClose}>
      <div className="space-y-4">
        <Field label="اسم الشركة (عربي)" hint="سيظهر للمشترين في التطبيق">
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
        </Field>

        <Field label="اسم المالك">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="اختياري — يُستخدم اسم الشركة إن تُرك فارغًا" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="بريد الدخول">
            <Input dir="ltr" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="كلمة المرور" hint={`${MIN_PASSWORD_LENGTH} أحرف على الأقل`}>
            <div className="flex gap-2">
              <Input dir="ltr" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Btn variant="ghost" onClick={() => setPassword(generatePassword())}>توليد</Btn>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="الجوال">
            <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="المحافظة">
            <Input value={governorate} onChange={(e) => setGovernorate(e.target.value)} placeholder="العاصمة" />
          </Field>
          <Field label="العمولة %">
            <Input dir="ltr" type="number" min={0} max={100} step="0.1" value={commission} onChange={(e) => setCommission(e.target.value)} />
          </Field>
        </div>

        <Field label="السجل التجاري">
          <Input dir="ltr" value={register} onChange={(e) => setRegister(e.target.value)} />
        </Field>

        <p className="text-xs text-subtext">
          لو البريد مسجّل لبائع من غير شركة، هيتربط بالشركة الجديدة بدل إنشاء حساب تاني.
        </p>

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={m.isPending}>إلغاء</Btn>
          <Btn variant="accent" busy={m.isPending} disabled={!ready} onClick={() => m.mutate()}>
            إنشاء البائع
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
