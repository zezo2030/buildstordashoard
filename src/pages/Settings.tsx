// الإعدادات — أرقام المنصة (عمولة، إرجاع…) + قايمتين أسباب منفصلتين:
// أسباب الإرجاع اللي المشتري بيختار منها، وأسباب الرفض اللي البائع بيختار منها.
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Input, Card, Toggle } from '../components/ui';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';
import { appSettingMeta } from '../lib/labels';

type SettingRow = { key: string; value: unknown; updated_at: string };

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function asBoolean(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return false;
}

function parseSettingValue(raw: string, kind: 'number' | 'text' | 'phone' | 'boolean'): unknown {
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
        subtitle="أرقام المنصة اللي التطبيق بيشتغل بيها، وقايمتين الأسباب: إرجاع المشتري ورفض البائع"
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <AppSettings />
        <div className="grid gap-4">
          <ReturnReasons side="buyer" />
          <ReturnReasons side="seller" />
        </div>
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

  const toggleBool = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: value as never, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم حفظ الإعداد');
      qc.invalidateQueries({ queryKey: ['app-settings'] });
    },
    onError: (e) => toast('error', (e as Error).message),
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

  // `default_commission_rate` اتشال من هنا: الرسوم بقت لكل حساب على حدة في
  // قسم «المال» (نسبة أو اشتراك بمدة)، فرقم افتراضي عام هنا بيضلّل.
  const HIDDEN_KEYS = ['supported_locales', 'min_withdrawal_amount', 'default_commission_rate'];
  const rows = (data ?? []).filter((s) => !HIDDEN_KEYS.includes(s.key));

  return (
    <Card className="p-5">
      <h2 className="font-bold">إعدادات المنصة</h2>
      <p className="mt-1 mb-3 text-sm text-subtext">
        غيّر الرقم أو النص هنا، والتطبيق بياخده مباشرة: مدة الإرجاع، العمولة، حدود الشحن، ورقم واتساب الدعم.
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
                  {meta?.kind !== 'boolean' && (
                    <div className="mt-1 font-semibold text-accent" dir="ltr">{displayValue(s.value)}</div>
                  )}
                </div>
                <div className="shrink-0 text-end">
                  {meta?.kind === 'boolean' ? (
                    <Toggle
                      checked={asBoolean(s.value)}
                      onChange={(v) => toggleBool.mutate({ key: s.key, value: v })}
                      disabled={toggleBool.isPending}
                    />
                  ) : (
                    <>
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
                    </>
                  )}
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

/**
 * أسباب الإرجاع وأسباب الرفض — قايمتين مستقلتين في نفس الجدول، الفرق `side`.
 *
 * المشتري بيشوف أسباب `buyer` لما يرجّع طلب، والبائع بيشوف أسباب `seller` لما
 * يرفض بند. قبل كده الشاشة كانت بتعرضهم مخلوطين، فالمالك يلاقي «فات وقت الإرجاع»
 * (سبب بائع) جوّه قايمة المشتري، وأي سبب جديد بيتضاف كان بينزل للمشتري بالغصب
 * لأن `side` الافتراضي `buyer` — يعني إضافة سبب رفض للبائع مكانتش ممكنة أصلاً.
 */
const REASON_SIDES = {
  buyer: {
    title: 'أسباب إرجاع المشتري',
    hint: 'القائمة اللي المشتري بيختار منها سبب الإرجاع. عطّله لو مش عايزه يظهر مؤقتًا، أو احذفه نهائيًا — السبب المستخدم في سند إرجاع قايم مايتحذفش.',
    newTitle: 'سبب إرجاع جديد',
    editTitle: 'تعديل سبب إرجاع',
    deleteTitle: 'حذف سبب إرجاع',
    deleteMessage: (label: string) => `سيتم حذف «${label}» نهائيًا من قائمة المشتري. متابعة؟`,
    labelField: 'النص اللي يظهر للمشتري',
    codeHint: 'حروف إنجليزية صغيرة بدون مسافات، مثال: damaged',
  },
  seller: {
    title: 'أسباب رفض البائع',
    hint: 'القائمة اللي البائع بيختار منها سبب رفض بند في المرتجع. عطّله لو مش عايزه يظهر مؤقتًا، أو احذفه نهائيًا.',
    newTitle: 'سبب رفض جديد',
    editTitle: 'تعديل سبب رفض',
    deleteTitle: 'حذف سبب رفض',
    deleteMessage: (label: string) => `سيتم حذف «${label}» نهائيًا من قائمة البائع. متابعة؟`,
    labelField: 'النص اللي يظهر للبائع',
    codeHint: 'حروف إنجليزية صغيرة بدون مسافات، وهيتحط قدامه seller_ تلقائيًا، مثال: window_passed',
  },
} as const;

type ReasonSide = keyof typeof REASON_SIDES;

/** الكود مفتاح أساسي للجدول كله، فأكواد البائع مسبوقة عشان ما تتصادمش مع أكواد المشتري. */
function reasonCode(side: ReasonSide, raw: string): string {
  const code = raw.trim();
  if (side !== 'seller' || !code) return code;
  return code.startsWith('seller_') ? code : `seller_${code}`;
}

function ReturnReasons({ side }: { side: ReasonSide }) {
  const copy = REASON_SIDES[side];
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<{ code: string; label_ar: string; isNew?: boolean } | null>(null);
  const [deleting, setDeleting] = useState<{ code: string; label_ar: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['return-reasons', side],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('return_reasons')
        .select('*')
        .eq('side', side)
        .order('sort_order');
      if (error) throw new Error(arError(error));
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async (r: { code: string; is_active: boolean }) => {
      const { error } = await supabase.from('return_reasons').update({ is_active: !r.is_active }).eq('code', r.code);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['return-reasons', side] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  // الحذف بيمر على RPC عشان يرفض السبب المستخدم في سند إرجاع قايم — من غير
  // كده كان السند القديم هيفضل بكود سبب مالوش صف يترجم منه.
  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.rpc('admin_delete_return_reason', { p_code: code });
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم حذف السبب');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['return-reasons', side] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editing.label_ar.trim()) throw new Error('التسمية مطلوبة');
      const code = reasonCode(side, editing.code);
      if (editing.isNew && !code) throw new Error('الكود مطلوب');
      // الترتيب بيتحسب جوّه القايمة دي لوحدها — القايمتين مستقلتين.
      const lastOrder = (data ?? []).reduce((max, r) => Math.max(max, r.sort_order), 0);
      const q = editing.isNew
        ? supabase.from('return_reasons').insert({ code, label_ar: editing.label_ar.trim(), side, sort_order: lastOrder + 1 })
        : supabase.from('return_reasons').update({ label_ar: editing.label_ar.trim() }).eq('code', editing.code);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم الحفظ');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['return-reasons', side] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-bold">{copy.title}</h2>
        <Btn variant="accent" onClick={() => setEditing({ code: '', label_ar: '', isNew: true })}>+ إضافة</Btn>
      </div>
      <p className="mb-3 text-sm text-subtext">{copy.hint}</p>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (data ?? []).length === 0 ? (
        <p className="py-4 text-center text-sm text-subtext">لا توجد أسباب</p>
      ) : (
        <div className="divide-y divide-line">
          {(data ?? []).map((r) => (
            <div key={r.code} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1 font-medium">{r.label_ar}</span>
              <Toggle checked={r.is_active} onChange={() => toggle.mutate(r)} />
              <Btn variant="ghost" onClick={() => setEditing({ code: r.code, label_ar: r.label_ar })}>تعديل</Btn>
              <button
                type="button"
                title="حذف السبب"
                aria-label={`حذف ${r.label_ar}`}
                className="rounded-lg p-1.5 text-danger hover:bg-red-50"
                onClick={() => setDeleting({ code: r.code, label_ar: r.label_ar })}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title={copy.deleteTitle}
        message={deleting ? copy.deleteMessage(deleting.label_ar) : null}
        confirmLabel="حذف"
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.code)}
        onClose={() => setDeleting(null)}
      />
      {editing && (
        <Modal title={editing.isNew ? copy.newTitle : copy.editTitle} open onClose={() => setEditing(null)}>
          <div className="space-y-4">
            {editing.isNew && (
              <Field label="كود داخلي" hint={copy.codeHint}>
                <Input dir="ltr" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
              </Field>
            )}
            <Field label={copy.labelField}>
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
