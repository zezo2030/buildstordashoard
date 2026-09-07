// المرتجعات — إشراف على طلبات الإرجاع وقرارات البائعين والمبالغ المستردة،
// بنفس بنية الطلبات والفواتير: كروت بفترة + جدول بفرز وبحث من الداتابيز.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
import { Undo2, Package, Wallet, FileText, Paperclip } from 'lucide-react';
import {
  fetchReturns, fetchReturnsStats, decideReturn, receiveReturn,
  type ReturnRow, type ReturnSortKey, type ReturnDecision,
} from '../api/returns';
import { supabase, arError } from '../lib/supabase';
import {
  PageHeader, KpiCard, StatusChip, Select, Input, Money, Card, ErrorState, Btn, Textarea,
} from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { DateRangePicker, todayISO, daysAgoISO, type DateRange } from '../components/DateRangePicker';
import { LocationCell } from '../components/LocationCell';
import { Modal } from '../components/Modal';
import { fmtDateTime, qty } from '../lib/format';
import { returnStatusLabels, refundMethodLabels, returnDocLabels, labelOf } from '../lib/labels';

export default function Returns() {
  const [range, setRange] = useState<DateRange>({ from: daysAgoISO(30), to: todayISO() });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<ReturnSortKey>('requested_at');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReturnRow | null>(null);

  useEffect(() => {
    if (search === debouncedSearch) return;
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const stats = useQuery({
    queryKey: ['returns-stats', range.from, range.to],
    queryFn: () => fetchReturnsStats(range.from, range.to),
  });

  const list = useQuery({
    queryKey: ['returns', range.from, range.to, debouncedSearch, status, sort, dir, page],
    queryFn: () => fetchReturns({
      from: range.from, to: range.to, search: debouncedSearch, status, sort, dir, page, pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  function toggleSort(key: string) {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(key as ReturnSortKey); setDir('desc'); }
    setPage(0);
  }

  const s = stats.data;

  const columns: Column<ReturnRow>[] = [
    { key: 'number', header: 'رقم المرتجع', sortKey: 'return_number',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span dir="ltr" className="font-medium">{r.returnNumber}</span>
          {r.orderNumber && <span dir="ltr" className="text-xs text-subtext">{r.orderNumber}</span>}
        </div>
      ) },
    { key: 'buyer', header: 'المشتري', sortKey: 'buyer_name', render: (r) => r.buyerName ?? '—' },
    { key: 'seller', header: 'البائع', sortKey: 'seller_name', render: (r) => r.sellerName ?? '—' },
    { key: 'location', header: 'الموقع', render: (r) => <LocationCell loc={r.location} /> },
    { key: 'status', header: 'الحالة', sortKey: 'status',
      render: (r) => { const l = labelOf(returnStatusLabels, r.status); return <StatusChip label={l.label} tone={l.tone} />; } },
    { key: 'refund', header: 'المبلغ المسترد', sortKey: 'refund_amount',
      render: (r) => <Money value={r.refundAmount} /> },
    { key: 'at', header: 'التاريخ', sortKey: 'requested_at',
      render: (r) => <span className="text-xs">{fmtDateTime(r.requestedAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="المرتجعات" subtitle="طلبات الإرجاع وقرارات البائعين والمبالغ المستردة" />

      {stats.isError ? (
        <Card className="mb-4 p-4">
          <ErrorState
            message={(stats.error as Error)?.message ?? 'تعذر تحميل المؤشرات'}
            onRetry={() => stats.refetch()}
          />
        </Card>
      ) : (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="إجمالي المسترد" value={s ? <Money value={s.refund} /> : '…'}
            icon={<Wallet size={20} />} tone="orange"
            footer={<DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0); }} presets allowAll />} />
          <KpiCard title="عدد المرتجعات" value={s ? s.nReturns : '…'} icon={<Undo2 size={20} />} tone="navy" />
          <KpiCard title="عدد المواد المرتجعة" value={s ? s.nItems : '…'} icon={<Package size={20} />} tone="blue" />
          {/* الرسوم اللي المنصة رجّعتها للبائع على المواد المرتجعة — البائع
              اللي على اشتراك ثابت مالوش استرداد لأنه مادفعش عمولة أصلاً. */}
          <KpiCard title="الرسوم المعادة للبائعين" value={s ? <Money value={s.feesRefunded} /> : '…'}
            icon={<Undo2 size={20} />} tone="green" />
        </div>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input
          placeholder="رقم المرتجع / رقم الطلب / المشتري / البائع…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-44">
          <option value="all">كل الحالات</option>
          {Object.entries(returnStatusLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0); }} presets allowAll />
      </Card>

      <DataTable
        columns={columns}
        rows={list.data?.rows ?? []}
        loading={list.isLoading}
        error={list.error ? (list.error as Error).message : null}
        onRetry={() => list.refetch()}
        page={page}
        hasMore={(page + 1) * PAGE_SIZE < (list.data?.total ?? 0)}
        onPage={setPage}
        sort={sort}
        dir={dir}
        onSort={toggleSort}
        onRowClick={setSelected}
        emptyTitle="لا توجد مرتجعات"
      />
      {selected && <ReturnModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/** كل بيانات سند المرتجع — نفس ما يظهر للمشتري والبائع في المستند. */
type ReturnItemRow = {
  id: string;
  qty_requested: string | number;
  qty_accepted: string | number | null;
  qty_rejected: string | number | null;
  rejection_reason: string | null;
  unit_price: string | number;
  accepted_total: string | number | null;
  order_item: { name_ar: string; sku: string | null; unit_ar: string | null; origin_country: string | null } | null;
};

type ReturnDetail = {
  reason_code: string | null;
  reason_text: string | null;
  rejection_reason: string | null;
  refund_method: string | null;
  attachments: string[] | null;
  total_accepted: string | number;
  total_rejected: string | number;
  refund_amount: string | number;
  requested_at: string;
  seller_decided_at: string | null;
  picked_up_at: string | null;
  received_at: string | null;
  refunded_at: string | null;
  return_reasons: { label_ar: string } | null;
  return_items: ReturnItemRow[];
  return_documents: { id: string; doc_type: string; pdf_path: string; created_at: string }[];
};

const RETURN_DOCS_BUCKET = 'return-docs';

/** ملفات المرتجع في bucket خاص — بنوقّع رابط مؤقت وقت الضغط بس. */
async function openReturnFile(path: string) {
  const { data, error } = await supabase.storage
    .from(RETURN_DOCS_BUCKET)
    .createSignedUrl(path, 60);
  if (error) throw new Error(arError(error));
  window.open(data.signedUrl, '_blank', 'noopener');
}

function fileName(path: string) {
  return path.split('/').pop() || path;
}

/**
 * قرار البائع على بنود السند + تعليم الاستلام.
 *
 * القرار مابيقيّدش رصيد — القيد بيحصل في `receive_return` لما البضاعة توصل
 * فعلًا. من غير الفصل ده كان المشتري بياخد القيمة والمنتج لسه معاه.
 */
function DecisionPanel({ returnId, items, unitOf, onDone }: {
  returnId: string;
  items: ReturnItemRow[];
  unitOf: (it: ReturnItemRow) => string;
  onDone: () => void;
}) {
  // المبدئي: قبول الكمية المطلوبة كاملة لكل بند.
  const [accepted, setAccepted] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((it) => [it.id, Number(it.qty_requested ?? 0)])),
  );
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const decide = useMutation({
    mutationFn: () => {
      const decisions: ReturnDecision[] = items.map((it) => {
        const req = Number(it.qty_requested ?? 0);
        const acc = Math.max(0, Math.min(req, accepted[it.id] ?? 0));
        return {
          returnItemId: it.id,
          qtyAccepted: acc,
          qtyRejected: req - acc,
          rejectionReason: req - acc > 0 ? (reasons[it.id] || null) : null,
        };
      });
      return decideReturn(returnId, decisions, note.trim() || null);
    },
    onMutate: () => setErr(null),
    onSuccess: onDone,
    onError: (e: Error) => setErr(e.message),
  });

  const acceptAll = () =>
    setAccepted(Object.fromEntries(items.map((it) => [it.id, Number(it.qty_requested ?? 0)])));
  const rejectAll = () => setAccepted(Object.fromEntries(items.map((it) => [it.id, 0])));

  return (
    <div className="mt-3 rounded-lg border border-accent/40 bg-accent/5 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold">قرار على السند</div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={acceptAll}>قبول الكل</Btn>
          <Btn variant="ghost" onClick={rejectAll}>رفض الكل</Btn>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((it) => {
          const req = Number(it.qty_requested ?? 0);
          const acc = accepted[it.id] ?? 0;
          return (
            <div key={it.id} className="rounded-md border border-line bg-white p-2.5">
              <div className="mb-1.5 text-sm font-medium">{it.order_item?.name_ar ?? '—'}</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="text-xs text-subtext">
                  المقبول من {qty(req)} {unitOf(it)}
                </label>
                <Input
                  type="number"
                  min={0}
                  max={req}
                  value={acc}
                  onChange={(e) =>
                    setAccepted((cur) => ({
                      ...cur,
                      [it.id]: Math.max(0, Math.min(req, Number(e.target.value))),
                    }))
                  }
                  className="w-24"
                />
                {req - acc > 0 && (
                  <Input
                    placeholder="سبب رفض هذا الصنف"
                    value={reasons[it.id] ?? ''}
                    onChange={(e) => setReasons((cur) => ({ ...cur, [it.id]: e.target.value }))}
                    className="min-w-[180px] flex-1"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2">
        <Textarea
          rows={2}
          placeholder="ملاحظة عامة على القرار (اختياري)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {err && <p className="mt-2 text-sm text-danger">{err}</p>}

      <p className="mt-2 text-xs text-subtext">
        القرار مش بيحوّل فلوس — المبلغ بيتقيّد في محفظة المشتري بعد تعليم استلام البضاعة.
      </p>

      <div className="mt-2">
        <Btn onClick={() => decide.mutate()} busy={decide.isPending}>حفظ القرار</Btn>
      </div>
    </div>
  );
}

function ReturnModal({ row, onClose }: { row: ReturnRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [actionErr, setActionErr] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['return', row.id] });
    void queryClient.invalidateQueries({ queryKey: ['returns'] });
    void queryClient.invalidateQueries({ queryKey: ['returns-stats'] });
  };

  const receive = useMutation({
    mutationFn: () => receiveReturn(row.id),
    onMutate: () => setActionErr(null),
    onSuccess: refresh,
    onError: (e: Error) => setActionErr(e.message),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['return', row.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('return_requests')
        .select(
          `reason_code, reason_text, rejection_reason, refund_method, attachments,
           total_accepted, total_rejected, refund_amount,
           requested_at, seller_decided_at, picked_up_at, received_at, refunded_at,
           return_reasons (label_ar),
           return_items (
             id, qty_requested, qty_accepted, qty_rejected, rejection_reason,
             unit_price, accepted_total,
             order_item:order_items (name_ar, sku, unit_ar, origin_country)
           ),
           return_documents (id, doc_type, pdf_path, created_at)`,
        )
        .eq('id', row.id)
        .single();
      if (error) throw new Error(arError(error));
      return data as unknown as ReturnDetail;
    },
  });

  const st = labelOf(returnStatusLabels, row.status);
  const reasonLabel = data?.return_reasons?.label_ar ?? null;
  const items = data?.return_items ?? [];
  const docs = data?.return_documents ?? [];
  const attachments = data?.attachments ?? [];

  // الخط الزمني للسند — بنعرض المحطات اللي حصلت بس
  const steps: { label: string; at: string | null }[] = [
    { label: 'تقديم الطلب', at: data?.requested_at ?? row.requestedAt },
    { label: 'قرار البائع', at: data?.seller_decided_at ?? null },
    { label: 'الاستلام من العميل', at: data?.picked_up_at ?? null },
    { label: 'الوصول للبائع', at: data?.received_at ?? null },
    { label: 'رد المبلغ', at: data?.refunded_at ?? null },
  ];

  return (
    <Modal title={`مرتجع ${row.returnNumber}`} open onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusChip label={st.label} tone={st.tone} />
        {data?.refund_method && (() => {
          const rm = labelOf(refundMethodLabels, data.refund_method);
          return <StatusChip label={`الاسترداد: ${rm.label}`} tone={rm.tone} />;
        })()}
        {row.orderId && row.orderNumber && (
          <Link to={`/orders/${row.orderId}`} className="text-sm font-medium text-accent hover:underline" dir="ltr">
            {row.orderNumber}
          </Link>
        )}
      </div>

      <div className="mb-3 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-line p-3">
          <div className="mb-1.5 text-xs font-medium text-subtext">الأطراف والموقع</div>
          <div className="font-medium">{row.buyerName ?? '—'}</div>
          <div className="text-xs text-subtext">البائع: {row.sellerName ?? '—'}</div>
          <div className="mt-1.5"><LocationCell loc={row.location} /></div>
        </div>
        <div className="rounded-lg border border-line p-3">
          <div className="mb-1.5 text-xs font-medium text-subtext">سبب الإرجاع</div>
          <div className="font-medium">{reasonLabel ?? data?.reason_code ?? '—'}</div>
          {(data?.reason_text ?? row.reasonText) && (
            <p className="mt-0.5 whitespace-pre-line text-xs text-subtext">
              {data?.reason_text ?? row.reasonText}
            </p>
          )}
          {data?.rejection_reason && (
            <p className="mt-1.5 whitespace-pre-line text-xs text-danger">
              سبب رفض البائع: {data.rejection_reason}
            </p>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} />
      ) : isLoading ? (
        <div className="py-8 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (
        <>
          <div className="rounded-lg border border-line">
            <table className="w-full table-fixed text-[13px]">
              <thead>
                <tr className="bg-surface text-subtext">
                  <th className="px-3 py-2 text-start font-medium">الصنف</th>
                  <th className="w-24 px-3 py-2 text-start font-medium">المطلوب</th>
                  <th className="w-24 px-3 py-2 text-start font-medium">المقبول</th>
                  <th className="w-24 px-3 py-2 text-start font-medium">المرفوض</th>
                  <th className="w-28 px-3 py-2 text-start font-medium">سعر الوحدة</th>
                  <th className="w-28 px-3 py-2 text-start font-medium">قيمة المقبول</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const unit = it.order_item?.unit_ar ?? '';
                  // qty_accepted/qty_rejected أعمدة not null default 0، فقبل قرار البائع
                  // بتبقى أصفار مالهاش معنى — بنعرض «—» لحد ما يتسجّل قرار.
                  const decided = !!data?.seller_decided_at;
                  return (
                    <tr key={it.id} className="border-t border-line align-top">
                      <td className="px-3 py-2 text-start">
                        <div className="font-medium">{it.order_item?.name_ar ?? '—'}</div>
                        {(it.order_item?.sku || it.order_item?.origin_country) && (
                          <div className="text-xs text-subtext">
                            {it.order_item?.sku && <span dir="ltr">{it.order_item.sku}</span>}
                            {it.order_item?.sku && it.order_item?.origin_country && ' · '}
                            {it.order_item?.origin_country}
                          </div>
                        )}
                        {it.rejection_reason && (
                          <div className="mt-0.5 text-xs text-danger">رفض: {it.rejection_reason}</div>
                        )}
                      </td>
                      {/* من غير dir="ltr" على الخلية — بيحاذي الرقم لليسار تحت عنوان
                          محاذي لليمين فتبان الكمية زاحفة على العمود المجاور. */}
                      <td className="px-3 py-2 text-start tabular-nums whitespace-nowrap">
                        {qty(it.qty_requested)} {unit}
                      </td>
                      <td className="px-3 py-2 text-start tabular-nums whitespace-nowrap">
                        {decided ? `${qty(it.qty_accepted)} ${unit}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-start tabular-nums whitespace-nowrap">
                        {decided ? `${qty(it.qty_rejected)} ${unit}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-start whitespace-nowrap"><Money value={it.unit_price} /></td>
                      <td className="px-3 py-2 text-start whitespace-nowrap">
                        {decided ? <Money value={it.accepted_total} /> : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* لسه مافيش قرار ⇒ نموذج القرار. اتقرر ومستنّي البضاعة ⇒ زر الاستلام. */}
          {!data?.seller_decided_at && items.length > 0 && (
            <DecisionPanel
              returnId={row.id}
              items={items}
              unitOf={(it) => it.order_item?.unit_ar ?? ''}
              onDone={refresh}
            />
          )}

          {!!data?.seller_decided_at && !data?.refunded_at && Number(data.refund_amount ?? 0) > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3">
              <div className="text-sm">
                <div className="font-bold">البضاعة وصلت؟</div>
                <p className="text-xs text-subtext">
                  بتعليم الاستلام بيتقيّد <Money value={data.refund_amount} /> في محفظة المشتري.
                </p>
              </div>
              <Btn onClick={() => receive.mutate()} busy={receive.isPending}>
                تم استلام المرتجع
              </Btn>
            </div>
          )}

          {actionErr && <p className="mt-2 text-sm text-danger">{actionErr}</p>}

          <dl className="mt-3 space-y-1.5 rounded-lg bg-surface px-3 py-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-subtext">قيمة المقبول</dt>
              <dd>{data?.seller_decided_at ? <Money value={data.total_accepted} /> : 'بانتظار قرار البائع'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-subtext">قيمة المرفوض</dt>
              <dd>{data?.seller_decided_at ? <Money value={data.total_rejected} /> : '—'}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5 font-bold">
              <dt>المبلغ المسترد</dt><dd><Money value={data?.refund_amount ?? row.refundAmount} /></dd>
            </div>
          </dl>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line p-3">
              <div className="mb-1.5 text-xs font-medium text-subtext">مسار السند</div>
              <ol className="space-y-1 text-sm">
                {steps.filter((s) => s.at).map((s) => (
                  <li key={s.label} className="flex items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{s.label}</span>
                    <span className="text-xs text-subtext">{fmtDateTime(s.at)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border border-line p-3">
              <div className="mb-1.5 text-xs font-medium text-subtext">المستندات والمرفقات</div>
              {docs.length === 0 && attachments.length === 0 ? (
                <p className="text-sm text-subtext">لا توجد مستندات</p>
              ) : (
                <div className="space-y-1.5 text-sm">
                  {docs.map((d) => {
                    const l = labelOf(returnDocLabels, d.doc_type);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => { void openReturnFile(d.pdf_path).catch((e) => alert((e as Error).message)); }}
                        className="flex w-full items-center gap-2 text-start text-accent hover:underline"
                      >
                        <FileText size={14} className="shrink-0" />
                        <span className="truncate">{l.label}</span>
                        <span className="shrink-0 text-xs text-subtext">{fmtDateTime(d.created_at)}</span>
                      </button>
                    );
                  })}
                  {attachments.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => { void openReturnFile(a).catch((e) => alert((e as Error).message)); }}
                      className="flex w-full items-center gap-2 text-start text-accent hover:underline"
                    >
                      <Paperclip size={14} className="shrink-0" />
                      <span className="truncate" dir="ltr">{fileName(a)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
