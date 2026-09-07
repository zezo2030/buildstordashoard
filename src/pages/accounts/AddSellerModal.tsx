// إضافة بائع من الداشبورد — شركة + حساب مالك + محفظة + بيانات الشركة الكاملة
// اللي بتظهر في التطبيق (لوجو، مواقع، تخصصات، طرق دفع…) + نظام الرسوم.
//
// الإنشاء نفسه عبر Edge Function (محتاج service role)، وبعد ما ترجّع
// `company_id` بنكمّل الباقي من اللوحة مباشرة — الأدمن عنده صلاحية على
// `companies` و`sites` و`seller_specialties`.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSeller, setBillingPlan, type BillingKind } from '../../api/accounts';
import { generatePassword, MIN_PASSWORD_LENGTH } from '../../api/account';
import {
  emptySellerProfile, saveSellerProfile, type SellerProfile,
} from '../../api/seller-profile';
import { SellerProfileFields } from '../../components/SellerProfileFields';
import { Btn, Field, Input, Select } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';

export function AddSellerModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [nameAr, setNameAr] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [register, setRegister] = useState('');
  const [profile, setProfile] = useState<SellerProfile>(emptySellerProfile());

  // الرسوم: نسبة من المبيعات أو اشتراك ثابت لمدة محددة
  const [billingKind, setBillingKind] = useState<BillingKind>('commission');
  const [rate, setRate] = useState('5');
  const [fee, setFee] = useState('0');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cycles, setCycles] = useState('');

  const m = useMutation({
    mutationFn: async () => {
      const companyId = await createSeller({
        email,
        password,
        // مافيش حقل «اسم المالك» — حساب المالك بياخد اسم الشركة
        fullName: nameAr.trim(),
        nameAr,
        phone: phone || undefined,
        governorate: governorate || undefined,
        commercialRegister: register || undefined,
        commissionRate: billingKind === 'commission' ? Number(rate || 0) : 0,
      });

      // رقم الجوال الأساسي بيدخل ضمن أرقام الشركة لو الأدمن ما ضافهوش بنفسه
      const phones = profile.phones.length || !phone.trim()
        ? profile.phones
        : [phone.trim()];
      await saveSellerProfile(companyId, { ...profile, phones });

      await setBillingPlan({
        subject: 'seller',
        subjectId: companyId,
        kind: billingKind,
        rate: billingKind === 'commission' ? Number(rate || 0) : null,
        fee: billingKind === 'subscription' ? Number(fee || 0) : null,
        startsOn: from || null,
        endsOn: to || null,
        cycles: cycles.trim() === '' ? null : Number(cycles),
      });
      return companyId;
    },
    onSuccess: () => {
      toast('success', `تم إنشاء البائع «${nameAr}»`);
      // الإنشاء ممكن يربط حساب بائع كان pending ويخليه active — فبيخرج من قايمة
      // «بانتظار الاعتماد» ومن عدّاد السايدبار. لازم نبطّل الأربعة زي useDone في
      // PendingSellersStrip، وإلا الشريط والبادچ يفضلوا يعدّوه لحد reload كامل.
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
      qc.invalidateQueries({ queryKey: ['pending-sellers'] });
      qc.invalidateQueries({ queryKey: ['nav-badges'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      onClose();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const ready =
    nameAr.trim() !== '' && email.trim() !== '' && password.length >= MIN_PASSWORD_LENGTH;

  return (
    <Modal title="إضافة بائع" open onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="اسم الشركة (عربي)" hint="سيظهر للمشترين في التطبيق">
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
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
          <Field label="الجوال الأساسي">
            <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="المحافظة">
            <Input value={governorate} onChange={(e) => setGovernorate(e.target.value)} placeholder="العاصمة" />
          </Field>
          <Field label="السجل التجاري">
            <Input dir="ltr" value={register} onChange={(e) => setRegister(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-xl border border-line p-3">
          <h3 className="mb-3 text-sm font-bold text-primary">نظام الرسوم</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="النوع" hint="نسبة من كل عملية بيع، أو اشتراك ثابت للمدة">
              <Select value={billingKind} onChange={(e) => setBillingKind(e.target.value as BillingKind)}>
                <option value="commission">نسبة من المبيعات</option>
                <option value="subscription">اشتراك ثابت</option>
              </Select>
            </Field>
            {billingKind === 'commission' ? (
              <Field label="النسبة %">
                <Input dir="ltr" type="number" min={0} max={100} step="0.1" value={rate}
                  onChange={(e) => setRate(e.target.value)} />
              </Field>
            ) : (
              <Field label="قيمة الاشتراك (د.ك)" hint="صفر = مجاني">
                <Input dir="ltr" type="number" min={0} step="0.001" value={fee}
                  onChange={(e) => setFee(e.target.value)} />
              </Field>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Field label="من تاريخ">
              <Input dir="ltr" type="date" value={from} max={to || undefined}
                onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="إلى تاريخ">
              <Input dir="ltr" type="date" value={to} min={from || undefined}
                onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="عدد الدورات" hint="بالشهور">
              <Input dir="ltr" type="number" min={1} step="1" value={cycles}
                onChange={(e) => setCycles(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-line p-3">
          <h3 className="mb-3 text-sm font-bold text-primary">بيانات الشركة في التطبيق</h3>
          <SellerProfileFields value={profile} onChange={setProfile} />
        </div>

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
