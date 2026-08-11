// الإشعارات — إرسال جماعي لشريحة (RPC admin_broadcast) + آخر الإشعارات المرسلة.
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { broadcast } from '../api/admin';
import { PageHeader, Btn, Field, Input, Textarea, Select, Card, StatusChip } from '../components/ui';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';

export default function NotificationsPage() {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [role, setRole] = useState('');

  const send = useMutation({
    mutationFn: () => broadcast(title, body || undefined, role || undefined),
    onSuccess: (count) => {
      toast('success', `تم إرسال الإشعار إلى ${count} مستخدم`);
      setTitle('');
      setBody('');
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  // آخر الإشعارات في النظام (قراءة أدمن عبر RLS غير متاحة على notifications —
  // سياستها owner فقط، فنعرض سجل الإرسالات الأخيرة كمعاينة إن توفرت)
  const { data: recent } = useQuery({
    queryKey: ['recent-notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title_ar, body_ar, type, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader title="الإشعارات" subtitle="إرسال إشعار جماعي داخل التطبيق (مع دفع Push عبر send-push)" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-bold">إشعار جديد</h2>
          <div className="space-y-4">
            <Field label="الشريحة المستهدفة">
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">كل المستخدمين النشطين</option>
                <option value="individual_buyer">المشترون الأفراد</option>
                <option value="company_buyer">مشترو الشركات</option>
                <option value="seller">البائعون</option>
              </Select>
            </Field>
            <Field label="عنوان الإشعار">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عروض نهاية الأسبوع 🎉" />
            </Field>
            <Field label="نص الإشعار (اختياري)">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Btn variant="accent" busy={send.isPending} disabled={!title.trim()} onClick={() => send.mutate()}>
              إرسال الإشعار
            </Btn>
            <p className="text-xs text-subtext">
              يتطلب تطبيق ميجريشن admin_console — الإدراج في جدول الإشعارات محصور في دوال الخادم.
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-bold">آخر الإشعارات</h2>
          {(recent ?? []).length === 0 ? (
            <p className="text-sm text-subtext">لا يوجد ما يُعرض (إشعارات المستخدمين خاصة بهم عبر RLS)</p>
          ) : (
            <div className="divide-y divide-line">
              {(recent ?? []).map((n) => (
                <div key={n.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{n.title_ar}</span>
                    <StatusChip label={n.type} tone="gray" />
                  </div>
                  {n.body_ar && <div className="mt-0.5 text-xs text-subtext">{n.body_ar}</div>}
                  <div className="mt-0.5 text-[11px] text-subtext">{fmtDateTime(n.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
