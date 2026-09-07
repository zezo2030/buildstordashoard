// كارت «بيانات الشركة في التطبيق» في صفحة البائع — عرض للبيانات اللي بيشوفها
// المشتري، وتعديلها في مكان واحد (نفس حقول فورم إضافة بائع).
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import {
  emptySellerProfile, fetchSellerProfile, saveSellerProfile,
  PAYMENT_METHODS, type SellerProfile,
} from '../api/seller-profile';
import { SellerProfileFields } from './SellerProfileFields';
import { Btn, Card, Spinner, ErrorState } from './ui';
import { useToast } from './Toast';
import { fmtDate, localPhone } from '../lib/format';

function labelOfPayment(v: string) {
  return PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v;
}

export function SellerProfileCard({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SellerProfile>(emptySellerProfile());

  const q = useQuery({
    queryKey: ['seller-profile', companyId],
    queryFn: () => fetchSellerProfile(companyId),
  });

  const specialties = useQuery({
    queryKey: ['specialties-list'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('specialties').select('id, name_ar').order('sort_order');
      if (error) throw new Error(arError(error));
      return data ?? [];
    },
  });

  // المسودة بتتزرع من السيرفر أول ما البيانات توصل وكل مرة نفتح فيها التعديل،
  // عشان الإلغاء يرجّع القيم المحفوظة مش اللي اتكتبت.
  useEffect(() => {
    if (q.data && !editing) setDraft(q.data);
  }, [q.data, editing]);

  const save = useMutation({
    mutationFn: () => saveSellerProfile(companyId, draft),
    onSuccess: () => {
      toast('success', 'تم حفظ بيانات الشركة');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['seller-profile', companyId] });
      qc.invalidateQueries({ queryKey: ['company', companyId] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  if (q.isLoading) return <Card className="mt-4 p-4"><Spinner /></Card>;
  if (q.isError || !q.data) {
    return (
      <Card className="mt-4 p-4">
        <ErrorState
          message={(q.error as Error)?.message ?? 'تعذر تحميل بيانات الشركة'}
          onRetry={() => q.refetch()}
        />
      </Card>
    );
  }

  const p = q.data;
  const specialtyNames = p.specialtyIds
    .map((id) => (specialties.data ?? []).find((s) => s.id === id)?.name_ar)
    .filter(Boolean) as string[];

  return (
    <Card className="mt-4 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">بيانات الشركة في التطبيق</h2>
          <p className="text-xs text-subtext">نفس البيانات اللي بيشوفها المشتري في صفحة البائع</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => { setDraft(p); setEditing(false); }} disabled={save.isPending}>
              إلغاء
            </Btn>
            <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
          </div>
        ) : (
          <Btn variant="ghost" onClick={() => { setDraft(p); setEditing(true); }}>تعديل</Btn>
        )}
      </div>

      {editing ? (
        <SellerProfileFields value={draft} onChange={setDraft} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {p.logoUrl ? (
              <img src={p.logoUrl} alt="" className="size-16 rounded-xl bg-surface object-contain p-1 ring-1 ring-line" />
            ) : (
              <div className="grid size-16 place-items-center rounded-xl bg-surface text-xs text-subtext ring-1 ring-line">
                بدون لوجو
              </div>
            )}
            <p className="min-w-0 flex-1 whitespace-pre-line text-sm text-primary">
              {p.aboutAr || <span className="text-subtext">لا توجد نبذة عن الشركة</span>}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="أرقام التليفون" value={p.phones.map(localPhone).join('، ')} dir="ltr" />
            <Row label="طرق الدفع" value={p.paymentMethods.map(labelOfPayment).join('، ')} />
            <Row label="التخصصات" value={specialtyNames.join('، ')} />
            <Row label="الرقم الآلي للمحل" value={p.shopNumber} dir="ltr" />
            <Row label="رقم العقد" value={p.contractNumber} dir="ltr" />
            <Row
              label="مدة العقد"
              value={
                p.contractFrom || p.contractTo
                  ? `${p.contractFrom ? fmtDate(p.contractFrom) : '—'} ← ${p.contractTo ? fmtDate(p.contractTo) : 'مفتوح'}`
                  : ''
              }
            />
          </dl>

          <div>
            <div className="mb-1.5 text-sm font-medium text-primary">
              مواقع الشركة ({p.locations.length})
            </div>
            {p.locations.length === 0 ? (
              <p className="text-sm text-subtext">لا توجد مواقع مسجّلة</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {p.locations.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <span className="font-medium">{l.name}</span>
                    <span className="text-xs text-subtext">
                      {[l.governorate, l.area, l.block && `قطعة ${l.block}`, l.street && `شارع ${l.street}`]
                        .filter(Boolean)
                        .join(' — ') || 'بدون عنوان'}
                    </span>
                    {l.lat && l.lng && (
                      <a
                        href={`https://maps.google.com/?q=${l.lat},${l.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent hover:underline"
                        dir="ltr"
                      >
                        {l.lat}, {l.lng}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Row({ label, value, dir }: { label: string; value: string; dir?: 'ltr' }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-subtext">{label}</dt>
      <dd dir={dir} className="min-w-0 break-words text-end">
        {value || <span className="text-subtext">—</span>}
      </dd>
    </div>
  );
}
