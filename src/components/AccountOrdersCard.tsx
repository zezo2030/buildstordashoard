// «آخر الطلبات» في صفحة حساب — بيعرض أحدث عشرة، و«عرض الكل» بيفتح الباقي في
// مودال من نفس البيانات المحمّلة (الاستعلام بيجيب لحد 200 صف).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Money, StatusChip } from './ui';
import { Modal } from './Modal';
import { fmtDateTime } from '../lib/format';
import { orderStatusLabels, labelOf } from '../lib/labels';

export type OrderBrief = {
  id: string;
  order_number: string;
  status: string;
  grand_total: number | string;
  placed_at: string;
};

const SHOWN = 10;

export function AccountOrdersCard({ orders, emptyText }: { orders: OrderBrief[]; emptyText: string }) {
  const [open, setOpen] = useState(false);

  const list = (rows: OrderBrief[]) => (
    <div className="divide-y divide-line">
      {rows.map((o) => {
        const s = labelOf(orderStatusLabels, o.status);
        return (
          <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:bg-surface">
            <span className="font-medium" dir="ltr">{o.order_number}</span>
            <span className="flex-1 text-xs text-subtext">{fmtDateTime(o.placed_at)}</span>
            <StatusChip label={s.label} tone={s.tone} />
            <Money value={o.grand_total} />
          </Link>
        );
      })}
    </div>
  );

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold">آخر الطلبات</h2>
        {orders.length > SHOWN && (
          <button type="button" onClick={() => setOpen(true)} className="text-xs text-accent hover:underline">
            عرض الكل ({orders.length})
          </button>
        )}
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-subtext">{emptyText}</p>
      ) : (
        list(orders.slice(0, SHOWN))
      )}
      <Modal title="كل الطلبات" open={open} onClose={() => setOpen(false)} wide>
        {list(orders)}
      </Modal>
    </Card>
  );
}
