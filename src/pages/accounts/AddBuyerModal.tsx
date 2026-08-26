// إضافة مشتري من الداشبورد — فرد أو شركة، مطابق لحقول تسجيل التطبيق.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCompanyBuyer, createIndividualBuyer } from '../../api/accounts';
import { generatePassword, MIN_PASSWORD_LENGTH } from '../../api/account';
import {
  NATIONALITIES,
  companyBuyerError,
  individualBuyerError,
  type CompanyBuyerForm,
  type IndividualBuyerForm,
} from '../../lib/buyer-form';
import { Btn, Field, Input, Select } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';

type Kind = 'individual' | 'company_buyer';

const emptyIndividual: IndividualBuyerForm = {
  fullName: '',
  civilId: '',
  phone: '',
  email: '',
  nationality: '',
  password: '',
};

const emptyCompany: CompanyBuyerForm = {
  companyName: '',
  commercialRegister: '',
  address: '',
  civilId: '',
  phone: '',
  email: '',
  companyCode: '',
  password: '',
};

export function AddBuyerModal({ kind, onClose }: { kind: Kind; onClose: () => void }) {
  return kind === 'individual'
    ? <IndividualForm onClose={onClose} />
    : <CompanyForm onClose={onClose} />;
}

function IndividualForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<IndividualBuyerForm>(emptyIndividual);
  const set = <K extends keyof IndividualBuyerForm>(k: K) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const m = useMutation({
    mutationFn: () => {
      const err = individualBuyerError(form);
      if (err) throw new Error(err);
      return createIndividualBuyer({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone,
        civilId: form.civilId,
        nationality: form.nationality,
      });
    },
    onSuccess: () => {
      toast('success', `تم إنشاء المشتري «${form.fullName.trim()}»`);
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
      onClose();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title="إضافة مشتري فرد" open onClose={onClose}>
      <div className="space-y-4">
        <Field label="الاسم">
          <Input value={form.fullName} onChange={(e) => set('fullName')(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الرقم المدني" hint="12 رقمًا">
            <Input dir="ltr" inputMode="numeric" maxLength={12} value={form.civilId} onChange={(e) => set('civilId')(e.target.value)} />
          </Field>
          <Field label="الجنسية">
            <Select value={form.nationality} onChange={(e) => set('nationality')(e.target.value)}>
              <option value="">اختر الجنسية</option>
              {NATIONALITIES.map((n) => (
                <option key={n.code} value={n.code}>{n.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <AccountFields
          email={form.email}
          phone={form.phone}
          password={form.password}
          onEmail={set('email')}
          onPhone={set('phone')}
          onPassword={set('password')}
        />
        <Actions pending={m.isPending} disabled={!!individualBuyerError(form)} onClose={onClose} onSubmit={() => m.mutate()} label="إنشاء المشتري" />
      </div>
    </Modal>
  );
}

function CompanyForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<CompanyBuyerForm>(emptyCompany);
  const set = <K extends keyof CompanyBuyerForm>(k: K) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const m = useMutation({
    mutationFn: () => {
      const err = companyBuyerError(form);
      if (err) throw new Error(err);
      return createCompanyBuyer({
        email: form.email,
        password: form.password,
        companyName: form.companyName,
        phone: form.phone,
        civilId: form.civilId,
        commercialRegister: form.commercialRegister,
        address: form.address,
        companyCode: form.companyCode || undefined,
      });
    },
    onSuccess: () => {
      toast('success', `تم إنشاء المشتري «${form.companyName.trim()}»`);
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
      onClose();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title="إضافة مشتري شركة" open onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="اسم الشركة">
          <Input value={form.companyName} onChange={(e) => set('companyName')(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="السجل التجاري">
            <Input dir="ltr" value={form.commercialRegister} onChange={(e) => set('commercialRegister')(e.target.value)} />
          </Field>
          <Field label="كود الشركة" hint="اختياري — رقم الحساب C-xxxxx يتولد تلقائيًا">
            <Input dir="ltr" value={form.companyCode} onChange={(e) => set('companyCode')(e.target.value)} />
          </Field>
        </div>
        <Field label="العنوان">
          <Input value={form.address} onChange={(e) => set('address')(e.target.value)} />
        </Field>
        <Field label="الرقم المدني للمسؤول" hint="12 رقمًا">
          <Input dir="ltr" inputMode="numeric" maxLength={12} value={form.civilId} onChange={(e) => set('civilId')(e.target.value)} />
        </Field>
        <AccountFields
          email={form.email}
          phone={form.phone}
          password={form.password}
          onEmail={set('email')}
          onPhone={set('phone')}
          onPassword={set('password')}
        />
        <Actions pending={m.isPending} disabled={!!companyBuyerError(form)} onClose={onClose} onSubmit={() => m.mutate()} label="إنشاء المشتري" />
      </div>
    </Modal>
  );
}

function AccountFields({
  email, phone, password, onEmail, onPhone, onPassword,
}: {
  email: string; phone: string; password: string;
  onEmail: (v: string) => void; onPhone: (v: string) => void; onPassword: (v: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="بريد الدخول">
          <Input dir="ltr" type="email" autoComplete="off" value={email} onChange={(e) => onEmail(e.target.value)} />
        </Field>
        <Field label="الجوال">
          <Input dir="ltr" value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="+9655…" />
        </Field>
      </div>
      <Field label="كلمة المرور" hint={`${MIN_PASSWORD_LENGTH} أحرف على الأقل`}>
        <div className="flex gap-2">
          <Input dir="ltr" autoComplete="off" value={password} onChange={(e) => onPassword(e.target.value)} />
          <Btn variant="ghost" onClick={() => onPassword(generatePassword())}>توليد</Btn>
        </div>
      </Field>
    </>
  );
}

function Actions({
  pending, disabled, onClose, onSubmit, label,
}: {
  pending: boolean; disabled: boolean; onClose: () => void; onSubmit: () => void; label: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Btn variant="ghost" onClick={onClose} disabled={pending}>إلغاء</Btn>
      <Btn variant="accent" busy={pending} disabled={disabled} onClick={onSubmit}>{label}</Btn>
    </div>
  );
}
