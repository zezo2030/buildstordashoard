// رسم المبيعات — فلتر فترة مستقل، وبيتحوّل للتجميع الشهري لوحده لو المدة أطول من شهرين.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { fetchSalesSeries } from '../../api/stats';
import { Card, Spinner, ErrorState } from '../ui';
import { DateRangePicker, todayISO, daysAgoISO, type DateRange } from '../DateRangePicker';
import { money, fmtDayShort, fmtMonthShort } from '../../lib/format';

export default function SalesChartCard() {
  const [range, setRange] = useState<DateRange>({ from: daysAgoISO(13), to: todayISO() });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sales-series', range.from, range.to],
    queryFn: () => fetchSalesSeries(range.from, range.to),
  });

  const fmtLabel = data?.bucket === 'month' ? fmtMonthShort : fmtDayShort;

  return (
    <Card className="overflow-hidden p-5 lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-bold text-primary">المبيعات</h2>
          <p className="mt-0.5 text-xs text-subtext">
            {data?.bucket === 'month' ? 'إجمالي شهري بالدينار الكويتي' : 'إجمالي يومي بالدينار الكويتي'}
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div className="grid h-72 place-items-center"><Spinner label="جارٍ تحميل المبيعات…" /></div>
      ) : error || !data ? (
        <div className="grid h-72 place-items-center">
          <ErrorState message={(error as Error)?.message ?? 'تعذر تحميل المبيعات'} onRetry={() => refetch()} />
        </div>
      ) : (
        <div className="h-72" dir="ltr">
          <ResponsiveContainer>
            <BarChart data={data.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" tickFormatter={fmtLabel} fontSize={11} stroke="#828a89" tickLine={false} axisLine={false} />
              <YAxis fontSize={11} stroke="#828a89" width={70} tickLine={false} axisLine={false} tickFormatter={(v: number) => money(v).replace(' د.ك', '')} />
              <Tooltip
                cursor={{ fill: 'rgba(22, 40, 63, 0.04)' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'Tajawal' }}
                formatter={(v) => [money(Number(v)), 'المبيعات']}
                labelFormatter={(l) => fmtLabel(String(l))}
              />
              <Bar dataKey="total" fill="#f5851f" radius={[8, 8, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
