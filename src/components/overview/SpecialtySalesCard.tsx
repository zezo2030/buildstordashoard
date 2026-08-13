// المبيعات حسب التخصص — الدايرة بتوري اللي بيتباع، والقائمة تحتها بتوري كل التخصصات
// بما فيهم اللي مبيعاتهم صفر، لأن دول بالظبط اللي الأدمن محتاج ياخد باله منهم.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { fetchSalesBySpecialty } from '../../api/stats';
import { Card, Spinner, ErrorState, Money } from '../ui';
import { DateRangePicker, todayISO, type DateRange } from '../DateRangePicker';
import { money } from '../../lib/format';

const COLORS = ['#7c4dff', '#f5851f', '#2f80ed', '#16a34a', '#f2c94c', '#16283f', '#dc2626', '#0ea5e9', '#a855f7'];

export default function SpecialtySalesCard() {
  const [range, setRange] = useState<DateRange>({ from: '2020-01-01', to: todayISO() });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sales-by-specialty', range.from, range.to],
    queryFn: () => fetchSalesBySpecialty(range.from, range.to),
  });

  const rows = data ?? [];
  const grand = rows.reduce((s, r) => s + r.total, 0);
  const sliced = rows.filter((r) => r.total > 0);

  return (
    <Card className="overflow-hidden p-5">
      <div className="mb-4">
        <h2 className="font-bold text-primary">المبيعات حسب التخصص</h2>
        <p className="mt-0.5 text-xs text-subtext">حسب قيمة المبيعات</p>
        <DateRangePicker value={range} onChange={setRange} className="mt-2.5" />
      </div>

      {isLoading ? (
        <div className="grid h-64 place-items-center"><Spinner label="جارٍ التحميل…" /></div>
      ) : error ? (
        <div className="grid h-64 place-items-center">
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        </div>
      ) : grand === 0 ? (
        <div className="grid h-64 place-items-center text-sm text-subtext">لا توجد مبيعات خلال الفترة</div>
      ) : (
        <>
          <div className="h-52" dir="ltr">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sliced} dataKey="total" nameKey="nameAr" innerRadius={48} outerRadius={76} paddingAngle={2}>
                  {sliced.map((r, i) => (
                    <Cell key={r.specialtyId ?? `x${i}`} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'Tajawal' }}
                  formatter={(v) => money(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-3 space-y-1.5">
            {rows.map((r, i) => {
              const pct = grand > 0 ? (r.total / grand) * 100 : 0;
              const zero = r.total === 0;
              const slice = sliced.findIndex((s) => s.specialtyId === r.specialtyId);
              const color = zero || slice < 0 ? '#d4d7dc' : COLORS[slice % COLORS.length];
              return (
                <li
                  key={r.specialtyId ?? `unspec-${i}`}
                  className={`flex items-center gap-2 text-xs ${zero ? 'text-subtext/70' : 'text-primary'}`}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="min-w-0 flex-1 truncate">{r.nameAr}</span>
                  <span className="shrink-0 tabular-nums" dir="ltr">{pct.toFixed(1)}%</span>
                  <span className="shrink-0"><Money value={r.total} /></span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
