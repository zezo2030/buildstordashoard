// طلبات تسجيل البائعين — تفعيل (مع بيانات إنشاء الشركة) أو رفض.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { activateSeller, rejectSeller } from '../api/admin';
import { PageHeader, Btn, Field, Input, Textarea } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDate } from '../lib/format';

type PendingSeller = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  civil_id: string | null;
  created_at: string;
};

export default function SellerRequests() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activating, setActivating] = useState<PendingSeller | null>(null);
  const [rejecting, setRejecting] = useState<PendingSeller | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pending-sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, civil_id, created_at')
        .eq('role', 'seller')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw new Error(arError(error));
      return data as PendingSeller[];
    },
  });

  function done(msg: string) {
    toast('success', msg);
    setActivating(null);
    setRejecting(null);
    qc.invalidateQueries({ queryKey: ['pending-sellers'] });
    qc.invalidateQueries({ queryKey: ['nav-badges'] });
  }

  const columns: Column<PendingSeller>[] = [
    { key: 'name', header: 'الاسم', render: (r) => <span className="font-medium">{r.full_name}</span> },
    { key: 'email', header: 'البريد', render: (r) => <span dir="ltr">{r.email ?? '—'}</span> },
    { key: 'phone', header: 'الجوال', render: (r) => <span dir="ltr">{r.phone ?? '—'}</span> },
    { key: 'created', header: 'تاريخ التسجيل', render: (r) => fmtDate(r.created_at) },
    {
      key: 'actions',
      header: 'الإجراء',
      render: (r) => (
        <div className="flex gap-2">
          <Btn variant="accent" onClick={() => setActivating(r)}>
            تفعيل
          </Btn>
          <Btn variant="ghost" onClick={() => setRejecting(r)}>
            رفض
          </Btn>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="طلبات البائعين"
        subtitle="حسابات البائعين في انتظار الاعتماد — التفعيل ينشئ شركة البائع ومحفظتها"
      />
      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        emptyTitle="لا توجد طلبات بائعين معلقة"
      />
      {activating && <ActivateModal seller={activating} onClose={() => setActivating(null)} onDone={done} />}
      {rejecting && <RejectModal seller={rejecting} onClose={() => setRejecting(null)} onDone={done} />}
    </div>
  );
}

function ActivateModal({ seller, onClose, onDone }: {
  seller: PendingSeller;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const { toast } = useToast();
  const [nameAr, setNameAr] = useState(seller.full_name);
  const [phone, setPhone] = useState(seller.phone ?? '');
  const [governorate, setGovernorate] = useState('');
  const [register, setRegister] = useState('');

  const m = useMutation({
    mutationFn: () =>
      activateSeller({
        profileId: seller.id,
        nameAr,
        phone: phone || undefined,
        governorate: governorate || undefined,
        commercialRegister: register || undefined,
      }),
    onSuccess: () => onDone('تم تفعيل البائع وإنشاء شركته ومحفظته'),
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={`تفعيل البائع — ${seller.full_name}`} open onClose={onClose}>
      <div className="space-y-4">
        <Field label="اسم الشركة (عربي)" hint="سيظهر للمشترين في التطبيق">
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الجوال">
            <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="المحافظة">
            <Input value={governorate} onChange={(e) => setGovernorate(e.target.value)} placeholder="العاصمة" />
          </Field>
        </div>
        <Field label="السجل التجاري">
          <Input dir="ltr" value={register} onChange={(e) => setRegister(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={m.isPending}>
            إلغاء
          </Btn>
          <Btn variant="accent" busy={m.isPending} onClick={() => m.mutate()} disabled={!nameAr.trim()}>
            تفعيل وإنشاء الشركة
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function RejectModal({ seller, onClose, onDone }: {
  seller: PendingSeller;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const m = useMutation({
    mutationFn: () => rejectSeller(seller.id, note || undefined),
    onSuccess: () => onDone('تم رفض طلب البائع'),
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={`رفض طلب — ${seller.full_name}`} open onClose={onClose}>
      <div className="space-y-4">
        <Field label="سبب الرفض (اختياري)" hint="يصل للبائع كإشعار عند تطبيق ميجريشن admin_console">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={m.isPending}>
            إلغاء
          </Btn>
          <Btn variant="danger" busy={m.isPending} onClick={() => m.mutate()}>
            رفض الطلب
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
