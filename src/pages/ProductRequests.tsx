// طلبات المواد — تابين على نفس الصفحة: طلب المشتري (جدول) واقتراح البائع
// (كروت + لوحة تفاصيل بكل أقسام الفورم). مش نفس الشكل عن قصد.
//
// طلب المشتري يفضل على `product_requests`. اقتراح البائع من
// `product_submissions` عبر `SellerSubmissionsPanel`.
//
// عمود الموضوع لسه بيرجع للقسم لما الاسم يبقى فاضي — صفوف البائع القديمة
// (قسم من غير `name_ar`) لسه في الجدول ولازم تفضل بتترسم.
//
// القرار بيمشي على `admin_decide_product_request` مش `update` مباشر: الحالة لازم
// تكون من قيم قيد الجدول، والدالة كمان بتبعت إشعار للطالب.
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Paperclip } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Textarea, StatusChip, Select } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';
import { productRequestStatusLabels, labelOf } from '../lib/labels';
import { materialsTabFromSearch } from '../lib/materials-requests';
import { SellerSubmissionsPanel } from './SellerSubmissionsPanel';

const REQUEST_DOCS_BUCKET = 'request-docs';

/** المرفقات في bucket خاص (قراءته للأدمن وصاحب الملف) — بنوقّع رابط وقت الضغط بس. */
async function openRequestDoc(path: string) {
  const { data, error } = await supabase.storage
    .from(REQUEST_DOCS_BUCKET)
    .createSignedUrl(path, 60);
  if (error) throw new Error(arError(error));
  window.open(data.signedUrl, '_blank', 'noopener');
}

function fileName(path: string) {
  return path.split('/').pop() || path;
}

type Row = {
  id: string;
  // nullable من ميجريشن `product_requests_allow_specialty_only` — طلب البائع
  // بيجي بقسم من غير اسم مادة.
  name_ar: string | null;
  qty: number | null;
  notes: string | null;
  status: string;
  admin_note: string | null;
  attachments: string[] | null;
  created_at: string;
  requester: { full_name: string } | null;
  company: { name_ar: string } | null;
  specialty: { name_ar: string } | null;
  unit: { name_ar: string } | null;
};

/** عنوان الطلب: اسم المادة، وإلا القسم المطلوب، وإلا شرطة. */
function subjectOf(r: Row) {
  const name = r.name_ar?.trim();
  if (name) return name;
  if (r.specialty?.name_ar) return `قسم: ${r.specialty.name_ar}`;
  return '—';
}

/** الحالات اللي لسه ممكن يتاخد عليها قرار — نفس شرط `admin_decide_product_request`. */
const DECIDABLE = ['open', 'in_review'];

export default function ProductRequests() {
  const tab = materialsTabFromSearch(useLocation().search);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('open');
  const [deciding, setDeciding] = useState<{ row: Row; to: 'fulfilled' | 'rejected' } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['product-requests', status, page],
    enabled: tab === 'buyers',
    queryFn: async () => {
      let q = supabase
        .from('product_requests')
        .select(
          `id, name_ar, qty, notes, status, admin_note, attachments, created_at,
           requester:profiles!product_requests_requester_id_fkey (full_name),
           company:companies (name_ar),
           specialty:specialties (name_ar), unit:units (name_ar)`,
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (status !== 'all') q = q.eq('status', status as never);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as Row[];
    },
  });

  const decide = useMutation({
    mutationFn: async (args: { id: string; to: string; note: string }) => {
      const { error } = await supabase.rpc('admin_decide_product_request', {
        p_request_id: args.id,
        p_status: args.to,
        p_note: args.note || undefined,
      });
      if (error) throw new Error(arError(error));
    },
    onSuccess: (_d, v) => {
      toast(
        'success',
        v.to === 'fulfilled'
          ? 'تم قبول الطلب وإبلاغ مقدّمه — أضف المنتج من صفحة المنتجات'
          : 'تم رفض الطلب وإبلاغ مقدّمه',
      );
      setDeciding(null);
      qc.invalidateQueries({ queryKey: ['product-requests'] });
      qc.invalidateQueries({ queryKey: ['nav-badges'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'المنتج المطلوب',
      render: (r) => (
        <div>
          <div className="font-medium">{subjectOf(r)}</div>
          {r.notes && <div className="text-xs text-subtext">{r.notes}</div>}
        </div>
      ),
    },
    { key: 'requester', header: 'مقدّم الطلب', render: (r) => r.requester?.full_name ?? '—' },
    { key: 'company', header: 'الشركة المستهدفة', render: (r) => r.company?.name_ar ?? '—' },
    { key: 'specialty', header: 'التخصص', render: (r) => r.specialty?.name_ar ?? '—' },
    { key: 'qty', header: 'الكمية', render: (r) => (r.qty != null ? <span dir="ltr">{r.qty} {r.unit?.name_ar ?? ''}</span> : '—') },
    {
      key: 'docs',
      header: 'المرفقات',
      render: (r) =>
        r.attachments?.length ? (
          <div className="flex max-w-44 flex-col items-start gap-1">
            {r.attachments.map((path) => (
              <button
                key={path}
                type="button"
                className="flex w-full items-center gap-2 text-start text-xs text-accent hover:underline"
                onClick={() => {
                  openRequestDoc(path).catch((e) => toast('error', (e as Error).message));
                }}
              >
                <Paperclip size={13} className="shrink-0" />
                <span className="truncate" dir="ltr">{fileName(path)}</span>
              </button>
            ))}
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'created', header: 'التاريخ', render: (r) => <span className="text-xs">{fmtDateTime(r.created_at)}</span> },
    {
      key: 'status',
      header: 'الحالة',
      render: (r) => {
        const l = labelOf(productRequestStatusLabels, r.status);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    {
      key: 'actions',
      header: 'الإجراء',
      render: (r) =>
        DECIDABLE.includes(r.status) ? (
          <div className="flex gap-2">
            <Btn variant="accent" onClick={() => setDeciding({ row: r, to: 'fulfilled' })}>قبول</Btn>
            <Btn variant="ghost" onClick={() => setDeciding({ row: r, to: 'rejected' })}>رفض</Btn>
          </div>
        ) : (
          <span className="text-xs text-subtext">{r.admin_note ?? ''}</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="طلبات المواد"
        subtitle={tab === 'sellers'
          ? 'اقتراحات البائعين لإضافة منتج للكتالوج — كل حقول الفورم'
          : 'طلبات المشترين لإضافة مادة بمواصفات خاصة'}
        actions={tab === 'buyers' ? (
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-40">
            <option value="open">المفتوحة</option>
            <option value="in_review">قيد المراجعة</option>
            <option value="fulfilled">المقبولة</option>
            <option value="rejected">المرفوضة</option>
            <option value="all">الكل</option>
          </Select>
        ) : undefined}
      />

      <div className="mb-4 flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-line">
        <TabLink to="/requests/materials" active={tab === 'buyers'} label="طلبات المشترين" />
        <TabLink to="/requests/materials?tab=sellers" active={tab === 'sellers'} label="اقتراحات البائعين" />
      </div>

      {tab === 'sellers' ? <SellerSubmissionsPanel /> : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            loading={isLoading}
            error={error ? (error as Error).message : null}
            onRetry={() => refetch()}
            page={page}
            hasMore={(data?.length ?? 0) > PAGE_SIZE}
            onPage={setPage}
            emptyTitle="لا توجد طلبات"
          />
          {deciding && (
            <DecideModal
              row={deciding.row}
              to={deciding.to}
              busy={decide.isPending}
              onClose={() => setDeciding(null)}
              onSubmit={(note) => decide.mutate({ id: deciding.row.id, to: deciding.to, note })}
            />
          )}
        </>
      )}
    </div>
  );
}

function TabLink({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-primary text-white' : 'text-subtext hover:text-primary'
      }`}
    >
      {label}
    </Link>
  );
}

function DecideModal({ row, to, busy, onClose, onSubmit }: {
  row: Row;
  to: 'fulfilled' | 'rejected';
  busy: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  // طلب البائع مفيهوش غير القسم — فملاحظة الإدارة هي المحتوى الوحيد اللي هيوصله.
  const specialtyOnly = !row.name_ar?.trim() && !!row.specialty?.name_ar;
  return (
    <Modal title={`${to === 'fulfilled' ? 'قبول' : 'رفض'} طلب — ${subjectOf(row)}`} open onClose={onClose}>
      <div className="space-y-4">
        {specialtyOnly && (
          <p className="text-xs text-subtext">
            الطلب من بائع اختار قسمًا فقط دون تحديد مادة — الملاحظة هنا هي وسيلة التواصل
            الوحيدة معه، فاكتب فيها الخطوة التالية.
          </p>
        )}
        <Field label="ملاحظة الإدارة (اختياري)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {to === 'fulfilled' && (
          <p className="text-xs text-subtext">بعد القبول أضف المنتج فعليًا من صفحة «المنتجات» ليصبح متاحًا للبائعين.</p>
        )}
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={busy}>إلغاء</Btn>
          <Btn variant={to === 'fulfilled' ? 'accent' : 'danger'} busy={busy} onClick={() => onSubmit(note)}>
            {to === 'fulfilled' ? 'قبول' : 'رفض'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
