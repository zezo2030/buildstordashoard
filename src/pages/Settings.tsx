// الإعدادات — أزواج app_settings (JSON) + أسباب الإرجاع.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Input, Textarea, Card, Toggle } from '../components/ui';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="إعدادات المنصة العامة وأسباب الإرجاع" />
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
  const [editing, setEditing] = useState<{ key: string; value: string; isNew?: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').order('key');
      if (error) throw new Error(arError(error));
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editing.key.trim()) throw new Error('المفتاح مطلوب');
      let value: unknown;
      try {
        value = JSON.parse(editing.value);
      } catch {
        throw new Error('القيمة يجب أن تكون JSON صالحًا (مثال: "نص" أو 5 أو {"a":1})');
      }
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: editing.key.trim(), value: value as never, updated_at: new Date().toISOString() });
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم حفظ الإعداد');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['app-settings'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">إعدادات المنصة (app_settings)</h2>
        <Btn variant="accent" onClick={() => setEditing({ key: '', value: '""', isNew: true })}>+ إضافة</Btn>
      </div>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (data ?? []).length === 0 ? (
        <p className="py-4 text-center text-sm text-subtext">لا توجد إعدادات</p>
      ) : (
        <div className="divide-y divide-line">
          {(data ?? []).map((s) => (
            <div key={s.key} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium" dir="ltr">{s.key}</div>
                <div className="truncate text-xs text-subtext" dir="ltr">{JSON.stringify(s.value)}</div>
              </div>
              <span className="text-[11px] text-subtext">{fmtDateTime(s.updated_at)}</span>
              <Btn variant="ghost" onClick={() => setEditing({ key: s.key, value: JSON.stringify(s.value, null, 2) })}>
                تعديل
              </Btn>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={editing.isNew ? 'إعداد جديد' : `تعديل — ${editing.key}`} open onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <Field label="المفتاح">
              <Input dir="ltr" value={editing.key} disabled={!editing.isNew} onChange={(e) => setEditing({ ...editing, key: e.target.value })} />
            </Field>
            <Field label="القيمة (JSON)">
              <Textarea dir="ltr" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} />
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
      if (!editing.code.trim() || !editing.label_ar.trim()) throw new Error('الكود والتسمية مطلوبان');
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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">أسباب الإرجاع</h2>
        <Btn variant="accent" onClick={() => setEditing({ code: '', label_ar: '', isNew: true })}>+ إضافة</Btn>
      </div>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (
        <div className="divide-y divide-line">
          {(data ?? []).map((r) => (
            <div key={r.code} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1 font-medium">{r.label_ar}</span>
              <span className="text-xs text-subtext" dir="ltr">{r.code}</span>
              <Toggle checked={r.is_active} onChange={() => toggle.mutate(r)} />
              <Btn variant="ghost" onClick={() => setEditing({ code: r.code, label_ar: r.label_ar })}>تعديل</Btn>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={editing.isNew ? 'سبب إرجاع جديد' : 'تعديل سبب إرجاع'} open onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="الكود">
                <Input dir="ltr" value={editing.code} disabled={!editing.isNew} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
              </Field>
              <Field label="التسمية (عربي)">
                <Input value={editing.label_ar} onChange={(e) => setEditing({ ...editing, label_ar: e.target.value })} />
              </Field>
            </div>
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
