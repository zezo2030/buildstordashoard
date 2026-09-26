// تاب «حساب البائعين» في صفحة المال.
//
// الشاشة دي بتجاوب على سؤال واحد: **مين عليه كام للمنصة؟**
//
// من ٢٥ سبتمبر مفيش بائع «ليه فلوس عند المنصة»: الفايض (حصيلة أونلاين بعد
// العمولة واللي عليه) بيتنقل لمحفظته تلقائي، وأي مستحق جديد بيتخصم من
// محفظته تلقائي. فالرصيد هنا يا «عليه» يا «مقفول»، والمحفظة معروضة جنبه.
// ومفيش «تسجيل حركة» يدوي — التحصيل بيحصل لوحده (خصم من المحفظة) أو
// بسداد البائع إلكتروني من التطبيق، والإيقاف بالقاعدة اللي في الإعدادات.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, Wallet, Search, ArrowUpLeft, FileText, ShieldAlert } from 'lucide-react';
import {
  fetchSellerBalances, fetchSellerStatements, issueStatements, waiveStatement, fetchSuspendRule,
  payoutSellerWallet,
  type SellerBalance, type SellerStatementRow,
} from '../api/seller-ledger';
import { Card, KpiCard, Money, Btn, Field, Input, Textarea, ErrorState, Spinner, StatusChip } from './ui';
import { Modal } from './Modal';
import { SellerStatementModal } from './SellerStatementModal';
import { useToast } from './Toast';
import { fmtDate } from '../lib/format';

/** «عليه 12.500 من 3 سبتمبر» / «مقفول». الإشارة بكلمة مش بسالب. */
function DebtCell({ value, since }: { value: number; since: string | null }) {
  if (value > -0.0005) return <span className="text-subtext">مقفول</span>;
  return (
    <span className="text-end">
      <span className="font-medium text-danger">عليه <Money value={-value} /></span>
      {since && <span className="block text-[11px] text-subtext">من {fmtDate(since)}</span>}
    </span>
  );
}

export function SellerLedgerTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statementOf, setStatementOf] = useState<SellerBalance | null>(null);
  // فلوس المحفظة فلوس البائع — الطريق الوحيد تطلع بيه لحد ما طلبات السحب تتعمل
  const [payoutOf, setPayoutOf] = useState<SellerBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const payout = useMutation({
    mutationFn: () => payoutSellerWallet(payoutOf!.id, amount, note),
    onSuccess: () => {
      toast('success', 'اتسجّل التحويل');
      setPayoutOf(null); setAmount(''); setNote('');
      qc.invalidateQueries({ queryKey: ['seller-balances'] });
      qc.invalidateQueries({ queryKey: ['seller-general-statement'] });
      qc.invalidateQueries({ queryKey: ['seller-commission-statement'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const q = useQuery({
    queryKey: ['seller-balances', search],
    queryFn: () => fetchSellerBalances(search),
  });
  const rule = useQuery({ queryKey: ['seller-suspend-rule'], queryFn: fetchSuspendRule });

  if (q.isError) {
    return (
      <Card className="p-4">
        <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </Card>
    );
  }
  if (q.isLoading) return <Spinner />;

  const rows = q.data ?? [];
  const debtors = rows.filter((r) => r.balance < -0.0005);
  const owed = debtors.reduce((a, r) => a - r.balance, 0);
  const wallets = rows.reduce((a, r) => a + r.wallet, 0);
  const r = rule.data;
  const ruleText = r
    ? [r.afterDays > 0 ? `بعد ${r.afterDays} يوم` : null, r.maxDebt > 0 ? `عند ${r.maxDebt.toFixed(3)} د.ك` : null]
        .filter(Boolean).join(' أو ') || 'مقفول'
    : '…';

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="مستحق على البائعين للمنصة"
          value={<Money value={owed} />}
          hint={`${debtors.length} بائع`}
          icon={<Receipt size={20} />}
          tone="red"
        />
        <KpiCard
          title="في محافظ البائعين"
          value={<Money value={wallets} />}
          hint="فلوسهم هم بعد خصم العمولة — بيسحبوها بطلب سحب"
          icon={<Wallet size={20} />}
          tone="green"
        />
        <KpiCard
          title="الإيقاف التلقائي"
          value={ruleText}
          hint="من صفحة الإعدادات — بيترفع لوحده أول ما يسدّد"
          icon={<ShieldAlert size={20} />}
          tone="navy"
        />
      </div>

      <StatementsStrip />

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 font-bold">حساب البائعين مع المنصة</h2>
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
          البائع عليه عمولة البيع الكاش والآجل بس (هو اللي قبض). البيع الإلكتروني بيدخل المنصة،
          فبتاخد منه عمولتها واللي عليه، والباقي بيروح لمحفظته على طول.
        </p>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-subtext">مفيش حركة على أي بائع</p>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    {s.deleted && <StatusChip label="محذوف" tone="red" />}
                    {!s.deleted && !s.isActive && <StatusChip label="موقوف" tone="orange" />}
                  </div>
                  <div className="mt-0.5 text-xs text-subtext">
                    في محفظته <Money value={s.wallet} />
                    {s.lastEntry && ` · آخر حركة ${fmtDate(s.lastEntry)}`}
                  </div>
                </div>
                <DebtCell value={s.balance} since={s.debtSince} />
                <button
                  type="button"
                  onClick={() => setStatementOf(s)}
                  className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-subtext transition-colors hover:bg-surface hover:text-primary"
                >
                  كشف حساب <ArrowUpLeft size={12} />
                </button>
                {s.wallet > 0 && (
                  <Btn
                    variant="ghost"
                    className="px-2.5 py-1 text-xs"
                    onClick={() => { setPayoutOf(s); setAmount(s.wallet.toFixed(3)); }}
                  >
                    حوّل لحسابه البنكي
                  </Btn>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {statementOf && (
        <SellerStatementModal
          companyId={statementOf.id}
          name={statementOf.name}
          onClose={() => setStatementOf(null)}
        />
      )}

      {payoutOf && (
        <Modal title={`تحويل من محفظة ${payoutOf.name}`} open onClose={() => setPayoutOf(null)}>
          <p className="mb-3 text-sm text-subtext">
            في محفظته <Money value={payoutOf.wallet} />. سجّل التحويل بعد ما يطلع من البنك — المبلغ
            بيتخصم من محفظته والبائع بيوصله إشعار. ده مش قيد على حسابه مع المنصة.
          </p>
          <Field label="المبلغ (د.ك)">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
          </Field>
          <Field label="ملاحظة (رقم التحويل مثلًا)">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="mt-3 flex gap-2">
            <Btn onClick={() => payout.mutate()} busy={payout.isPending} disabled={!amount.trim()}>
              تسجيل التحويل
            </Btn>
            <Btn variant="ghost" onClick={() => setPayoutOf(null)}>إلغاء</Btn>
          </div>
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
