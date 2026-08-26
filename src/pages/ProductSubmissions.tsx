// منتجات مقترحة — اقتراحات البائعين لإضافة مواد جديدة للكتالوج.
//
// القبول هنا **مابينشئش** المنتج: الأدمن بيوافق (فيوصل البائع إشعار «خلال 7
// أيام»)، وبعدين بيضيف المادة بنفسه من صفحة «المنتجات»، وبعدين بيعلّم «تمت
// الإضافة». الفصل بين `approved` و`added` هو اللي بيخلّي فيه طريقة تعرف بيها
// أنهي وعد اتنفّذ.
//
// مودال التفاصيل بيعرض كل حقول الاقتراح عشان الأدمن ينسخ منه وهو فاتح صفحة
// المنتجات في تبويب جنبه.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Textarea, StatusChip, Select } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';
import { productSubmissionStatusLabels, labelOf } from '../lib/labels';
import { canDecide, nextStatuses, type SubmissionStatus } from '../lib/submission-status';

type Row = {
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

export default function ProductSubmissions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('open');
  const [viewing, setViewing] = useState<Row | null>(null);
  const [deciding, setDeciding] = useState<{ row: Row; to: SubmissionStatus } | null>(null);

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
      return data as unknown as Row[];
    },
  });

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
      setViewing(null);
      qc.invalidateQueries({ queryKey: ['product-submissions'] });
      qc.invalidateQueries({ queryKey: ['nav-badges'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    {
      key: 'product',
      header: 'المنتج المقترح',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-surface">
            {r.images?.[0] && <img src={r.images[0]} alt="" className="size-full object-cover" />}
          </div>
          <div>
            <div className="font-medium">{r.name_ar}</div>
            {r.name_en && <div className="text-xs text-subtext" dir="ltr">{r.name_en}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'seller',
      header: 'البائع',
      render: (r) => (
        <div>
          <div>{r.seller?.full_name ?? '—'}</div>
          {r.company?.name_ar && <div className="text-xs text-subtext">{r.company.name_ar}</div>}
        </div>
      ),
    },
    { key: 'specialty', header: 'التخصص', render: (r) => r.specialty?.name_ar ?? '—' },
    { key: 'unit', header: 'الوحدة', render: (r) => r.unit?.name_ar ?? '—' },
    {
      key: 'origin',
      header: 'الماركة / المنشأ',
      render: (r) => [r.brand, r.origin_country].filter(Boolean).join(' · ') || '—',
    },
    { key: 'created', header: 'التاريخ', render: (r) => <span className="text-xs">{fmtDateTime(r.created_at)}</span> },
    {
      key: 'status',
      header: 'الحالة',
      render: (r) => {
        const l = labelOf(productSubmissionStatusLabels, r.status);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    {
      key: 'actions',
      header: 'الإجراء',
      render: (r) => (
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setViewing(r)}>التفاصيل</Btn>
          {nextStatuses(r.status).map((to) => (
            <Btn
              key={to}
              variant={to === 'rejected' ? 'ghost' : 'accent'}
              onClick={() => setDeciding({ row: r, to })}
            >
              {DECISION_LABELS[to]}
            </Btn>
          ))}
          {!canDecide(r.status) && r.admin_note && (
            <span className="self-center text-xs text-subtext">{r.admin_note}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="منتجات مقترحة"
        subtitle="اقتراحات البائعين لإضافة مواد جديدة للكتالوج"
        actions={
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-48">
            <option value="open">الجديدة</option>
            <option value="approved">بانتظار الإضافة</option>
            <option value="added">تمت إضافتها</option>
            <option value="rejected">المرفوضة</option>
            <option value="all">الكل</option>
          </Select>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        page={page}
        hasMore={(data?.length ?? 0) > PAGE_SIZE}
        onPage={setPage}
        emptyTitle="لا توجد اقتراحات"
      />
      {viewing && <DetailsModal row={viewing} onClose={() => setViewing(null)} />}
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

/** كل بيانات الاقتراح في مكان واحد — الأدمن بينسخ منها لفورم المنتجات. */
function DetailsModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const lines: [string, string][] = [
    ['الاسم بالعربي', row.name_ar],
    ['الاسم بالإنجليزي', row.name_en ?? '—'],
    ['التخصص', row.specialty?.name_ar ?? '—'],
    ['الوحدة', row.unit?.name_ar ?? '—'],
    ['الماركة', row.brand ?? '—'],
    ['بلد المنشأ', row.origin_country ?? '—'],
    ['الوصف', row.description_ar ?? '—'],
    ['البائع', row.seller?.full_name ?? '—'],
    ['الشركة', row.company?.name_ar ?? '—'],
  ];
  return (
    <Modal title={`تفاصيل الاقتراح — ${row.name_ar}`} open onClose={onClose}>
      <div className="space-y-4">
        {row.images?.[0] && (
          <img src={row.images[0]} alt={row.name_ar} className="max-h-64 w-full rounded-lg object-contain" />
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {lines.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-subtext">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex justify-end">
          <Btn variant="ghost" onClick={onClose}>إغلاق</Btn>
        </div>
      </div>
    </Modal>
  );
}

function DecideModal({ row, to, busy, onClose, onSubmit }: {
  row: Row;
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
