// تاب «حساب البائعين» في صفحة المال.
//
// الشاشة دي بتجاوب على سؤال واحد: **مين عليه كام؟** — وبعدين بتخليك تسجّل
// التحصيل من غير ما تسيبها.
//
// إشارة الرصيد هي كل الحكاية، فبتتعرض بكلمة مش بعلامة سالب: «عليه» بالأحمر
// و«له» بالأخضر. المحذوف بيفضل ظاهر طول ما عليه فلوس — الحذف بيوقف التعامل
// مش المديونية.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, HandCoins, Search, ArrowUpLeft, FileText } from 'lucide-react';
import {
  fetchSellerBalances, fetchSellerStatement, settleSeller,
  fetchSellerStatements, issueStatements, waiveStatement,
  LEDGER_KIND_LABELS, type SellerBalance, type SellerStatementRow,
} from '../api/seller-ledger';
import { Card, KpiCard, Money, Btn, Field, Input, Textarea, ErrorState, Spinner, StatusChip } from './ui';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { fmtDate } from '../lib/format';

/** «عليه 12.500» / «له 3.000» — الإشارة بكلمة مش بسالب. */
function BalanceCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-subtext">مقفول</span>;
  const owes = value < 0;
  return (
    <span className={owes ? 'font-medium text-danger' : 'font-medium text-success'}>
      {owes ? 'عليه ' : 'له '}
      <Money value={Math.abs(value)} />
    </span>
  );
}

export function SellerLedgerTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<SellerBalance | null>(null);
  const [statementOf, setStatementOf] = useState<SellerBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'settlement' | 'payout'>('settlement');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');

  const q = useQuery({
    queryKey: ['seller-balances', search],
    queryFn: () => fetchSellerBalances(search),
  });

  const statement = useQuery({
    queryKey: ['seller-statement', statementOf?.id],
    queryFn: () => fetchSellerStatement(statementOf!.id),
    enabled: !!statementOf,
  });

  const save = useMutation({
    mutationFn: () => settleSeller({
      companyId: open!.id, amount, kind, note, date: date || null,
    }),
    onSuccess: () => {
      toast('success', kind === 'settlement' ? 'اتسجّل التحصيل' : 'اتسجّل التحويل');
      setOpen(null); setAmount(''); setNote(''); setDate('');
      qc.invalidateQueries({ queryKey: ['seller-balances'] });
      qc.invalidateQueries({ queryKey: ['seller-statement'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  if (q.isError) {
    return (
      <Card className="p-4">
        <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </Card>
    );
  }
  if (q.isLoading) return <Spinner />;

  const rows = q.data ?? [];
  const owed = rows.filter((r) => r.balance < 0).reduce((a, r) => a + -r.balance, 0);
  const due = rows.filter((r) => r.balance > 0).reduce((a, r) => a + r.balance, 0);

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="مستحق على البائعين"
          value={<Money value={owed} />}
          hint={`${rows.filter((r) => r.balance < 0).length} بائع`}
          icon={<Receipt size={20} />}
          tone="red"
        />
        <KpiCard
          title="مستحق للبائعين"
          value={<Money value={due} />}
          hint={`${rows.filter((r) => r.balance > 0).length} بائع`}
          icon={<HandCoins size={20} />}
          tone="green"
        />
        <KpiCard
          title="صافي المركز"
          value={<Money value={owed - due} />}
          hint="اللي المنصة دائنة بيه بعد المقاصة"
          icon={<Receipt size={20} />}
          tone="navy"
        />
      </div>

      <StatementsStrip />

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 font-bold">حساب البائعين الجاري</h2>
          <div className="relative">
            <Search size={14} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-subtext" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم البائع…"
              className="ps-2 pe-8"
            />
          </div>
        </div>

        <p className="mb-3 text-sm text-subtext">
          البيع الكاش بيروح للبائع مباشرة فالعمولة بتفضل عليه؛ والبيع الإلكتروني بيدخل
          المنصة فبتبقى هي اللي عليها. الرقم هنا هو الاتنين بعد المقاصة.
        </p>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-subtext">مفيش حركة على أي بائع</p>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.deleted && <StatusChip label="محذوف" tone="red" />}
                    {!r.deleted && !r.isActive && <StatusChip label="موقوف" tone="orange" />}
                  </div>
                  <div className="mt-0.5 text-xs text-subtext">
                    محمّل عليه <Money value={r.charged} /> · محصّل <Money value={r.settled} />
                    {r.lastEntry && ` · آخر حركة ${fmtDate(r.lastEntry)}`}
                  </div>
                </div>
                <BalanceCell value={r.balance} />
                <button
                  type="button"
                  onClick={() => setStatementOf(r)}
                  className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-subtext transition-colors hover:bg-surface hover:text-primary"
                >
                  كشف حساب <ArrowUpLeft size={12} />
                </button>
                <Btn
                  variant="ghost"
                  onClick={() => {
                    setOpen(r);
                    setKind(r.balance < 0 ? 'settlement' : 'payout');
                    setAmount(Math.abs(r.balance).toFixed(3));
                  }}
                >
                  تسجيل حركة
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>

      {open && (
        <Modal title={`حركة على حساب ${open.name}`} open onClose={() => setOpen(null)}>
          <p className="mb-3 text-sm text-subtext">
            الرصيد الحالي <BalanceCell value={open.balance} />.
          </p>

          <Field label="نوع الحركة">
            <div className="flex gap-2">
              {([
                ['settlement', 'تحصيل من البائع'],
                ['payout', 'تحويل للبائع'],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    kind === k ? 'border-accent bg-accent-soft text-accent' : 'border-line text-subtext'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="المبلغ (د.ك)">
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
            </Field>
            <Field label="التاريخ">
              <Input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="ملاحظة (رقم التحويل مثلًا)">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          <div className="mt-3 flex gap-2">
            <Btn onClick={() => save.mutate()} busy={save.isPending} disabled={!amount.trim()}>
              تسجيل
            </Btn>
            <Btn variant="ghost" onClick={() => setOpen(null)}>إلغاء</Btn>
          </div>
        </Modal>
      )}

      {statementOf && (
        <Modal
          title={`كشف حساب ${statementOf.name}`}
          open
          onClose={() => setStatementOf(null)}
          wide
        >
          {statement.isLoading || !statement.data ? <Spinner /> : (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
                <span className="text-subtext">الرصيد الحالي</span>
                <BalanceCell value={statement.data.balance} />
              </div>
              <div className="divide-y divide-line">
                {statement.data.rows.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="w-24 shrink-0 text-xs text-subtext">{fmtDate(e.entryDate)}</span>
                    <StatusChip label={LEDGER_KIND_LABELS[e.kind] ?? e.kind} tone="navy" />
                    <span className="min-w-0 flex-1 truncate text-xs text-subtext">
                      {e.description ?? ''}
                    </span>
                    <span className={e.amount < 0 ? 'text-danger' : 'text-success'}>
                      {e.amount < 0 ? '−' : '+'}
                      <Money value={Math.abs(e.amount)} />
                    </span>
                  </div>
                ))}
              </div>
              {statement.data.rows.length === 0 && (
                <p className="py-6 text-center text-sm text-subtext">مفيش قيود</p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/**
 * شريط الكشوف — المطالبات المفتوحة والمتأخرة.
 *
 * الكشف مطالبة بتاريخ، والدفتر هو المصدر. عشان كده بنعرض «مستحق الكشف»
 * و«الرصيد دلوقتي» جنب بعض: لو البائع سدّد بعد الإصدار، الاتنين هيختلفوا
 * والفرق ده هو اللي بيفسّر ليه الإيقاف اترفع.
 */
function StatementsStrip() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [waiving, setWaiving] = useState<SellerStatementRow | null>(null);
  const [waiveNote, setWaiveNote] = useState('');

  const q = useQuery({
    queryKey: ['seller-statements'],
    queryFn: () => fetchSellerStatements('due'),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['seller-statements'] });
    qc.invalidateQueries({ queryKey: ['seller-balances'] });
  };

  const issue = useMutation({
    mutationFn: () => issueStatements(null),
    onSuccess: (n) => {
      toast('success', n > 0 ? `اتصدر ${n} كشف واتبعت` : 'مفيش بائع عليه مستحقات للشهر اللي فات');
      refresh();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const waive = useMutation({
    mutationFn: () => waiveStatement(waiving!.id, waiveNote),
    onSuccess: () => {
      toast('success', 'اتسقطت المطالبة');
      setWaiving(null); setWaiveNote(''); refresh();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = q.data ?? [];

  return (
    <Card className="mb-4 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">كشوف الحساب</h2>
          <p className="text-xs text-subtext">
            بتتصدر أول كل شهر وبتتبعت للبائع. بعد مهلة السداد بيتوقف عرض منتجاته تلقائيًا،
            وبيرجع لوحده أول ما يسدّد.
          </p>
        </div>
        <Btn variant="ghost" onClick={() => issue.mutate()} busy={issue.isPending}>
          <FileText size={15} /> إصدار كشوف الشهر اللي فات
        </Btn>
      </div>

      {rows.length === 0 ? (
        <p className="py-3 text-center text-sm text-subtext">مفيش مطالبات مفتوحة</p>
      ) : (
        <div className="divide-y divide-line">
          {rows.map((s) => {
            // الصيغة على الأيام مش على الحالة: الكشف بيفضل open لحد ما
            // الشغل اليومي يعلّمه overdue، فلو اتفرجت عليه في اليوم اللي بين
            // الاتنين كان بيقول «باقي −2 يوم».
            const late = s.daysLeft < 0;
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                <span className="text-xs text-subtext">حتى {fmtDate(s.periodEnd)}</span>
                <StatusChip
                  label={late ? `متأخر ${Math.abs(s.daysLeft)} يوم` : `باقي ${s.daysLeft} يوم`}
                  tone={late ? 'red' : 'orange'}
                />
                {s.suspended && <StatusChip label="العرض موقوف" tone="red" />}
                <span className="text-xs text-subtext">
                  مطالبة <Money value={s.amountDue} />
                  {Math.abs(s.balanceNow - s.amountDue) >= 0.001 && (
                    <> · الرصيد دلوقتي <Money value={s.balanceNow} /></>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setWaiving(s)}
                  className="rounded-lg border border-line px-2 py-1 text-xs text-subtext transition-colors hover:bg-surface hover:text-primary"
                >
                  إسقاط
                </button>
              </div>
            );
          })}
        </div>
      )}

      {waiving && (
        <Modal title={`إسقاط مطالبة ${waiving.name}`} open onClose={() => setWaiving(null)}>
          <p className="mb-3 text-sm text-subtext">
            الإسقاط بيقفل المطالبة بس — <strong>الدفتر ما بيتلمسش</strong> والرصيد هيفضل زي ما هو.
            لو قصدك تشطب المديونية نفسها، سجّل تسوية من «تسجيل حركة».
          </p>
          <Field label="السبب">
            <Textarea rows={2} value={waiveNote} onChange={(e) => setWaiveNote(e.target.value)} />
          </Field>
          <div className="mt-3 flex gap-2">
            <Btn onClick={() => waive.mutate()} busy={waive.isPending}>إسقاط</Btn>
            <Btn variant="ghost" onClick={() => setWaiving(null)}>إلغاء</Btn>
          </div>
        </Modal>
      )}
    </Card>
  );
}
