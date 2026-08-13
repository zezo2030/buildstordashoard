// الإعدادات — أرقام المنصة (عمولة، سحب، إرجاع…) + أسباب الإرجاع اللي بتظهر للمشتري.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Input, Card, Toggle } from '../components/ui';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';
import { appSettingMeta } from '../lib/labels';

type SettingRow = { key: string; value: unknown; updated_at: string };

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function parseSettingValue(raw: string, kind: 'number' | 'text' | 'phone'): unknown {
  const trimmed = raw.trim();
  if (kind === 'number') {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) throw new Error('اكتب رقمًا صالحًا');
    return n;
  }
  if (!trimmed) throw new Error('القيمة مطلوبة');
  return trimmed;
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="الإعدادات"
        subtitle="أرقام المنصة اللي التطبيق بيشتغل بيها، وأسباب الإرجاع اللي بتظهر للمشتري لما يرجع طلب"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AppSettings />
        <ReturnReasons />
      </div>
    </div>
  );
}

function AppSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<SettingRow | null>(null);
  const [draft, setDraft] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').order('key');
      if (error) throw new Error(arError(error));
      return data as SettingRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const meta = appSettingMeta[editing.key];
      const value = parseSettingValue(draft, meta?.kind ?? 'text');
      const { error } = await supabase
        .from('app_settings')
        .update({ value: value as never, updated_at: new Date().toISOString() })
        .eq('key', editing.key);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم حفظ الإعداد');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['app-settings'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = (data ?? []).filter((s) => s.key !== 'supported_locales');

  return (
    <Card className="p-5">
      <h2 className="font-bold">إعدادات المنصة</h2>
      <p className="mt-1 mb-3 text-sm text-subtext">
        غيّر الرقم أو النص هنا، والتطبيق بياخده مباشرة: مدة الإرجاع، العمولة، حد السحب، ورقم واتساب الدعم.
      </p>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-subtext">لا توجد إعدادات</p>
      ) : (
        <div className="divide-y divide-line">
          {rows.map((s) => {
            const meta = appSettingMeta[s.key];
            return (
              <div key={s.key} className="flex items-start gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{meta?.label ?? s.key}</div>
                  {meta?.hint && <div className="mt-0.5 text-xs text-subtext">{meta.hint}</div>}
                  <div className="mt-1 font-semibold text-accent" dir="ltr">{displayValue(s.value)}</div>
                </div>
                <div className="shrink-0 text-end">
                  <div className="mb-1 text-[11px] text-subtext">{fmtDateTime(s.updated_at)}</div>
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      setEditing(s);
                      setDraft(displayValue(s.value));
                    }}
                  >
                    تعديل
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing && (
        <Modal title={appSettingMeta[editing.key]?.label ?? editing.key} open onClose={() => setEditing(null)}>
          <div className="space-y-4">
            {appSettingMeta[editing.key]?.hint && (
              <p className="text-sm text-subtext">{appSettingMeta[editing.key].hint}</p>
            )}
            <Field label="القيمة">
              <Input
                dir="ltr"
                type={appSettingMeta[editing.key]?.kind === 'number' ? 'number' : 'text'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditing(null)}>إلغاء</Btn>
              <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function ReturnReasons() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<{ code: string; label_ar: string; isNew?: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['return-reasons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('return_reasons').select('*').order('sort_order');
      if (error) throw new Error(arError(error));
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async (r: { code: string; is_active: boolean }) => {
      const { error } = await supabase.from('return_reasons').update({ is_active: !r.is_active }).eq('code', r.code);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['return-reasons'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editing.label_ar.trim()) throw new Error('التسمية مطلوبة');
      if (editing.isNew && !editing.code.trim()) throw new Error('الكود مطلوب');
      const q = editing.isNew
        ? supabase.from('return_reasons').insert({ code: editing.code.trim(), label_ar: editing.label_ar.trim(), sort_order: (data?.length ?? 0) + 1 })
        : supabase.from('return_reasons').update({ label_ar: editing.label_ar.trim() }).eq('code', editing.code);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم الحفظ');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['return-reasons'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-bold">أسباب الإرجاع</h2>
        <Btn variant="accent" onClick={() => setEditing({ code: '', label_ar: '', isNew: true })}>+ إضافة</Btn>
      </div>
      <p className="mb-3 text-sm text-subtext">
        القائمة اللي المشتري بيختار منها سبب الإرجاع. عطّل السبب لو مش عايزه يظهر من غير ما تمسحه.
      </p>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (
        <div className="divide-y divide-line">
          {(data ?? []).map((r) => (
            <div key={r.code} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1 font-medium">{r.label_ar}</span>
              <Toggle checked={r.is_active} onChange={() => toggle.mutate(r)} />
              <Btn variant="ghost" onClick={() => setEditing({ code: r.code, label_ar: r.label_ar })}>تعديل</Btn>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={editing.isNew ? 'سبب إرجاع جديد' : 'تعديل سبب إرجاع'} open onClose={() => setEditing(null)}>
          <div className="space-y-4">
            {editing.isNew && (
              <Field label="كود داخلي" hint="حروف إنجليزية صغيرة بدون مسافات، مثال: damaged">
                <Input dir="ltr" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
              </Field>
            )}
            <Field label="النص اللي يظهر للمشتري">
              <Input value={editing.label_ar} onChange={(e) => setEditing({ ...editing, label_ar: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditing(null)}>إلغاء</Btn>
              <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
