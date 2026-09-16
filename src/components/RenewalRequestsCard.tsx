// طلبات تجديد عقود البائعين — بتظهر في «نظرة عامة» لما يكون فيه طلب معلّق.
//
// جنب «اشتراكات قاربت على الانتهاء» عن قصد: الكارت ده اللي البائع طلب فيه،
// والتاني هو اللي **ما طلبش** وعقده بيقرب — الاتنين محتاجين قرار منك، بس
// التاني بيقف لوحده أول ما التاريخ يعدّي.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileClock } from 'lucide-react';
import { fetchRenewals, decideRenewal, type RenewalRow } from '../api/renewals';
import { Card, StatusChip, Btn, Field, Input, Textarea } from './ui';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { fmtDate } from '../lib/format';

function termsText(r: RenewalRow): string {
  if (r.kind === 'commission') return `نسبة ${r.rate ?? 0}%`;
  if (r.kind === 'subscription') return `اشتراك ${r.fee ?? 0} د.ك`;
  return '—';
}

/** الافتراضي: سنة من نهاية العقد الحالية، أو من النهارده لو خلص. */
function defaultEndsOn(current: string | null): string {
  const today = new Date().toISOString().slice(0, 10);
  const base = current && current > today ? current : today;
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function RenewalRequestsCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [target, setTarget] = useState<{ row: RenewalRow; approve: boolean } | null>(null);
  const [endsOn, setEndsOn] = useState('');
  const [note, setNote] = useState('');

  const q = useQuery({
    queryKey: ['renewals', 'pending'],
    queryFn: () => fetchRenewals('pending'),
    refetchInterval: 300_000,
  });

  const decide = useMutation({
    mutationFn: () => decideRenewal({
      id: target!.row.id, approve: target!.approve, endsOn, note,
    }),
    onSuccess: () => {
      toast('success', target?.approve ? 'تم تجديد العقد' : 'تم رفض الطلب');
      setTarget(null); setNote(''); setEndsOn('');
      qc.invalidateQueries({ queryKey: ['renewals'] });
      qc.invalidateQueries({ queryKey: ['expiring-plans'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const open = (row: RenewalRow, approve: boolean) => {
    setTarget({ row, approve });
    setEndsOn(approve ? defaultEndsOn(row.currentEndsOn) : '');
    setNote('');
  };

  const rows = q.data ?? [];
  if (q.isLoading || rows.length === 0) return null;

  return (
    <>
      <Card className="mb-6 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <FileClock size={18} />
          </span>
          <div>
            <h2 className="font-bold">طلبات تجديد عقود</h2>
            <p className="text-xs text-subtext">
              {rows.length} بائع طلب تجديد عقده — الموافقة بتمدّ العقد بنفس شروطه وبتفك الإيقاف لو كان موقوف
            </p>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <Link to={`/companies/${r.companyId}`} className="min-w-0 flex-1 truncate font-medium hover:text-accent">
                {r.companyName}
              </Link>
              {r.suspended && <StatusChip label="موقوف" tone="red" />}
              <span className="text-xs text-subtext" dir="ltr">{termsText(r)}</span>
              <span className="text-xs text-subtext">
                ينتهي {r.currentEndsOn ? fmtDate(r.currentEndsOn) : '—'}
              </span>
              {r.note && <span className="w-full truncate text-xs text-subtext">«{r.note}»</span>}
              <div className="flex shrink-0 gap-2">
                <Btn onClick={() => open(r, true)}>تجديد</Btn>
                <Btn variant="ghost" onClick={() => open(r, false)}>رفض</Btn>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {target && (
        <Modal
          title={target.approve ? `تجديد عقد ${target.row.companyName}` : `رفض طلب ${target.row.companyName}`}
          open
          onClose={() => setTarget(null)}
        >
          {target.approve ? (
            <>
              <p className="mb-3 text-sm text-subtext">
                الشروط بتفضل زي ما هي ({termsText(target.row)}) — اللي بيتغيّر هو تاريخ النهاية بس.
                لو عايز تغيّر النسبة نفسها، اعملها من صفحة الشركة.
              </p>
              <Field label="نهاية العقد الجديدة">
                <Input
                  type="date"
                  value={endsOn}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setEndsOn(e.target.value)}
                />
              </Field>
            </>
          ) : (
            <p className="mb-3 text-sm text-subtext">
              الرفض مابيوقفش الشركة فورًا — بتقف لوحدها لما تاريخ العقد يعدّي. السبب بيوصل للبائع في إشعار.
            </p>
          )}

          <Field label={target.approve ? 'ملاحظة (اختياري)' : 'سبب الرفض'}>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          <div className="mt-3 flex gap-2">
            <Btn
              onClick={() => decide.mutate()}
              busy={decide.isPending}
              disabled={target.approve && !endsOn}
            >
              {target.approve ? 'تأكيد التجديد' : 'تأكيد الرفض'}
            </Btn>
            <Btn variant="ghost" onClick={() => setTarget(null)}>إلغاء</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
