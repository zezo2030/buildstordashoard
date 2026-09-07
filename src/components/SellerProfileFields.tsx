// حقول بيانات البائع الإضافية — نفس المكوّن بيتستخدم في «إضافة بائع» وفي
// صفحة الشركة، عشان الأدمن يدخّل نفس البيانات من المكانين.
import { useRef, useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { uploadCompanyLogo } from '../lib/company-logo';
import { Btn, Field, Input, Textarea } from './ui';
import { useToast } from './Toast';
import { PAYMENT_METHODS, type SellerLocation, type SellerProfile } from '../api/seller-profile';

const emptyLocation = (): SellerLocation => ({
  name: '', governorate: '', area: '', block: '', street: '', lat: '', lng: '',
});

export function SellerProfileFields({ value, onChange }: {
  value: SellerProfile;
  onChange: (next: SellerProfile) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');

  const { data: specialties } = useQuery({
    queryKey: ['specialties-list'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('specialties').select('id, name_ar').order('sort_order');
      if (error) throw new Error(arError(error));
      return data ?? [];
    },
  });

  const patch = (p: Partial<SellerProfile>) => onChange({ ...value, ...p });

  async function onPickLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      patch({ logoUrl: await uploadCompanyLogo(file) });
      toast('success', 'تم رفع اللوجو');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function addPhone() {
    const t = phoneDraft.trim();
    if (!t || value.phones.includes(t)) { setPhoneDraft(''); return; }
    patch({ phones: [...value.phones, t] });
    setPhoneDraft('');
  }

  function patchLocation(i: number, p: Partial<SellerLocation>) {
    patch({ locations: value.locations.map((l, idx) => (idx === i ? { ...l, ...p } : l)) });
  }

  return (
    <div className="space-y-4">
      <Field label="لوجو الشركة" hint="بيظهر مع اسم الشركة للمشترين في التطبيق">
        <div className="flex items-start gap-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface ring-1 ring-line">
            {value.logoUrl ? (
              <img src={value.logoUrl} alt="" className="size-full object-contain p-1" />
            ) : (
              <div className="grid size-full place-items-center text-subtext"><ImagePlus size={20} /></div>
            )}
            {value.logoUrl && (
              <button
                type="button"
                onClick={() => patch({ logoUrl: '' })}
                className="absolute top-1 start-1 rounded-full bg-primary/80 p-0.5 text-white hover:bg-danger"
                title="إزالة اللوجو"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
            <Btn type="button" variant="ghost" busy={uploading} onClick={() => fileRef.current?.click()}>
              رفع اللوجو
            </Btn>
          </div>
        </div>
      </Field>

      <Field label="أرقام التليفون" hint="ممكن أكتر من رقم — كلها بتظهر للمشتري">
        <div className="space-y-2">
          {value.phones.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {value.phones.map((p) => (
                <span key={p} className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs">
                  <span dir="ltr">{p}</span>
                  <button
                    type="button"
                    aria-label={`إزالة ${p}`}
                    className="text-danger"
                    onClick={() => patch({ phones: value.phones.filter((x) => x !== p) })}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              dir="ltr"
              placeholder="مثال: 55512345"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhone(); } }}
            />
            <Btn type="button" variant="ghost" onClick={addPhone}><Plus size={15} /> إضافة</Btn>
          </div>
        </div>
      </Field>

      <Field label="التخصصات الخاصة به" hint="التخصصات اللي الشركة بتشتغل فيها">
        <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-line p-2">
          {(specialties ?? []).map((s) => {
            const on = value.specialtyIds.includes(s.id);
            return (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface">
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  checked={on}
                  onChange={() =>
                    patch({
                      specialtyIds: on
                        ? value.specialtyIds.filter((id) => id !== s.id)
                        : [...value.specialtyIds, s.id],
                    })
                  }
                />
                {s.name_ar}
              </label>
            );
          })}
        </div>
      </Field>

      <Field label="طرق الدفع المعتمدة لديه">
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-2">
          {PAYMENT_METHODS.map((m) => {
            const on = value.paymentMethods.includes(m.value);
            return (
              <label key={m.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface">
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  checked={on}
                  onChange={() =>
                    patch({
                      paymentMethods: on
                        ? value.paymentMethods.filter((v) => v !== m.value)
                        : [...value.paymentMethods, m.value],
                    })
                  }
                />
                {m.label}
              </label>
            );
          })}
        </div>
      </Field>

      <Field label="نبذة عن الشركة">
        <Textarea rows={3} value={value.aboutAr} onChange={(e) => patch({ aboutAr: e.target.value })} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="الرقم الآلي للمحل">
          <Input dir="ltr" value={value.shopNumber} onChange={(e) => patch({ shopNumber: e.target.value })} />
        </Field>
        <Field label="رقم العقد">
          <Input dir="ltr" value={value.contractNumber} onChange={(e) => patch({ contractNumber: e.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="العقد من">
          <Input dir="ltr" type="date" value={value.contractFrom}
            max={value.contractTo || undefined}
            onChange={(e) => patch({ contractFrom: e.target.value })} />
        </Field>
        <Field label="العقد إلى">
          <Input dir="ltr" type="date" value={value.contractTo}
            min={value.contractFrom || undefined}
            onChange={(e) => patch({ contractTo: e.target.value })} />
        </Field>
      </div>

      <Field label="مواقع الشركة" hint="فروع/مخازن البائع — الموقع بيظهر للمشتري وبيتستخدم في التوصيل">
        <div className="space-y-2 rounded-lg border border-line p-2">
          {value.locations.length === 0 && (
            <p className="px-1 py-1 text-xs text-subtext">مافيش مواقع مسجّلة</p>
          )}
          {value.locations.map((l, i) => (
            <div key={l.id ?? `new-${i}`} className="space-y-2 rounded-md bg-surface p-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="اسم الموقع (مثال: الفرع الرئيسي)"
                  value={l.name}
                  onChange={(e) => patchLocation(i, { name: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="حذف الموقع"
                  className="shrink-0 rounded p-1.5 text-danger hover:bg-red-50"
                  onClick={() => patch({ locations: value.locations.filter((_, idx) => idx !== i) })}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="المحافظة" value={l.governorate}
                  onChange={(e) => patchLocation(i, { governorate: e.target.value })} />
                <Input placeholder="المنطقة" value={l.area}
                  onChange={(e) => patchLocation(i, { area: e.target.value })} />
                <Input placeholder="القطعة" value={l.block}
                  onChange={(e) => patchLocation(i, { block: e.target.value })} />
                <Input placeholder="الشارع" value={l.street}
                  onChange={(e) => patchLocation(i, { street: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input dir="ltr" placeholder="Latitude" value={l.lat}
                  onChange={(e) => patchLocation(i, { lat: e.target.value })} />
                <Input dir="ltr" placeholder="Longitude" value={l.lng}
                  onChange={(e) => patchLocation(i, { lng: e.target.value })} />
              </div>
            </div>
          ))}
          <Btn
            type="button"
            variant="ghost"
            onClick={() => patch({ locations: [...value.locations, emptyLocation()] })}
          >
            <Plus size={15} /> إضافة موقع
          </Btn>
        </div>
      </Field>
    </div>
  );
}
