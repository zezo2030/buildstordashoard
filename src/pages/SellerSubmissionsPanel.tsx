// عرض اقتراحات البائعين داخل «طلبات المواد» — مش جدول زي طلب المشتري:
// قائمة كروت + لوحة تفاصيل بنفس أقسام فورم «اضافة منتج جديد».
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { Btn, Card, EmptyState, ErrorState, Field, Select, Spinner, StatusChip, Textarea } from '../components/ui';
import { PAGE_SIZE } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';
import { productSubmissionStatusLabels, labelOf } from '../lib/labels';
import { sellerSubmissionSections } from '../lib/materials-requests';
import { nextStatuses, type SubmissionStatus } from '../lib/submission-status';

export type SubmissionRow = {
  id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  brand: string | null;
  origin_country: string | null;
  images: string[];
  status: string;
  admin_note: string | null;
  created_at: string;
  seller: { full_name: string } | null;
  company: { name_ar: string } | null;
  specialty: { name_ar: string } | null;
  unit: { name_ar: string } | null;
};

const DECISION_LABELS: Record<SubmissionStatus, string> = {
  approved: 'موافقة',
  added: 'تمت الإضافة',
  rejected: 'رفض',
  open: 'إعادة فتح',
};

export function SellerSubmissionsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<{ row: SubmissionRow; to: SubmissionStatus } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['product-submissions', status, page],
    queryFn: async () => {
      let q = supabase
        .from('product_submissions')
        .select(
          `id, name_ar, name_en, description_ar, brand, origin_country, images,
           status, admin_note, created_at,
           seller:profiles!product_submissions_seller_id_fkey (full_name),
           company:companies (name_ar),
           specialty:specialties (name_ar), unit:units (name_ar)`,
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as SubmissionRow[];
    },
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);
  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
    if (!rows.length && selectedId) setSelectedId(null);
  }, [selected, selectedId, rows.length]);

  const decide = useMutation({
    mutationFn: async (args: { id: string; to: SubmissionStatus; note: string }) => {
      const { error } = await supabase.rpc('admin_decide_product_submission', {
        p_id: args.id,
        p_status: args.to,
        p_note: args.note || undefined,
      });
      if (error) throw new Error(arError(error));
    },
    onSuccess: (_d, v) => {
      toast('success', `${DECISION_LABELS[v.to]} — تم إبلاغ البائع بإشعار`);
      setDeciding(null);
      qc.invalidateQueries({ queryKey: ['product-submissions'] });
      qc.invalidateQueries({ queryKey: ['nav-badges'] });
      qc.invalidateQueries({ queryKey: ['overview-open-submissions'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); setSelectedId(null); }} className="w-48">
          <option value="open">الجديدة</option>
          <option value="approved">بانتظار الإضافة</option>
          <option value="added">تمت إضافتها</option>
          <option value="rejected">المرفوضة</option>
          <option value="all">الكل</option>
        </Select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <Card><EmptyState title="لا توجد اقتراحات" /></Card>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-80">
            {rows.map((row) => {
              const on = row.id === selected?.id;
              const l = labelOf(productSubmissionStatusLabels, row.status);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={[
                    'flex w-full items-center gap-3 rounded-(--radius-card) border p-3 text-start transition-colors',
                    on ? 'border-accent bg-accent-soft/60' : 'border-line bg-white hover:border-accent/40',
                  ].join(' ')}
                >
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {row.images?.[0] && <img src={row.images[0]} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-primary">{row.name_ar}</div>
                    <div className="truncate text-xs text-subtext">{row.seller?.full_name ?? '—'}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusChip label={l.label} tone={l.tone} />
                      <span className="text-[11px] text-subtext">{fmtDateTime(row.created_at)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            <div className="flex justify-between pt-1">
              <Btn variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>السابق</Btn>
              <Btn variant="ghost" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>التالي</Btn>
            </div>
          </aside>

          {selected && (
            <SellerDetail
              row={selected}
              onDecide={(to) => setDeciding({ row: selected, to })}
            />
          )}
        </div>
      )}

      {deciding && (
        <DecideModal
          row={deciding.row}
          to={deciding.to}
          busy={decide.isPending}
          onClose={() => setDeciding(null)}
          onSubmit={(note) => decide.mutate({ id: deciding.row.id, to: deciding.to, note })}
        />
      )}
    </div>
  );
}

function SellerDetail({ row, onDecide }: {
  row: SubmissionRow;
  onDecide: (to: SubmissionStatus) => void;
}) {
  const sections = sellerSubmissionSections(row);
  const description = sections.find((s) => s.label === 'الوصف');
  const rest = sections.filter((s) => s.label !== 'الوصف');
  const actions = nextStatuses(row.status);

  return (
    <Card className="min-w-0 flex-1 p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">{row.name_ar}</h2>
          <p className="mt-1 text-xs text-subtext">كل المعلومات اللي البائع بعتها في الفورم</p>
        </div>
        <StatusChip
          label={labelOf(productSubmissionStatusLabels, row.status).label}
          tone={labelOf(productSubmissionStatusLabels, row.status).tone}
        />
      </div>

      {row.images?.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-primary">صورة المنتج</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {row.images.map((src) => (
              <img
                key={src}
                src={src}
                alt={row.name_ar}
                className="max-h-64 w-full rounded-xl bg-surface object-contain ring-1 ring-line"
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {rest.map((s) => (
          <ReadField key={s.label} label={s.label} value={s.value} dir={s.label === 'الاسم بالإنجليزي' ? 'ltr' : undefined} />
        ))}
        {description && (
          <div className="sm:col-span-2">
            <ReadField label={description.label} value={description.value} tall />
          </div>
        )}
      </div>

      {row.admin_note && (
        <p className="mt-4 text-xs text-subtext">ملاحظة الإدارة: {row.admin_note}</p>
      )}

      {actions.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {actions.map((to) => (
            <Btn
              key={to}
              variant={to === 'rejected' ? 'ghost' : 'accent'}
              onClick={() => onDecide(to)}
            >
              {DECISION_LABELS[to]}
            </Btn>
          ))}
        </div>
      )}
    </Card>
  );
}

function ReadField({ label, value, tall, dir }: {
  label: string; value: string; tall?: boolean; dir?: 'ltr' | 'rtl';
}) {
  return (
    <Field label={label}>
      <div
        dir={dir}
        className={`rounded-lg border border-line bg-surface px-3 py-2 text-sm text-primary ${tall ? 'min-h-24 whitespace-pre-wrap' : ''}`}
      >
        {value}
      </div>
    </Field>
  );
}

function DecideModal({ row, to, busy, onClose, onSubmit }: {
  row: SubmissionRow;
  to: SubmissionStatus;
  busy: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <Modal title={`${DECISION_LABELS[to]} — ${row.name_ar}`} open onClose={onClose}>
      <div className="space-y-4">
        {to === 'approved' && (
          <p className="text-xs text-subtext">
            البائع هيوصله إشعار إن المنتج هيتضاف خلال 7 أيام. أضف المادة من صفحة «المنتجات»
            ثم ارجع هنا واضغط «تمت الإضافة».
          </p>
        )}
        <Field label="ملاحظة الإدارة (اختياري)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <p className="text-xs text-subtext">الملاحظة دي بتظهر للبائع في متن الإشعار.</p>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={busy}>إلغاء</Btn>
          <Btn variant={to === 'rejected' ? 'danger' : 'accent'} busy={busy} onClick={() => onSubmit(note)}>
            {DECISION_LABELS[to]}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
