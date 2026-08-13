// بائعون سجّلوا من التطبيق ولسه مالهمش شركة — شريط اعتماد فوق جدول البائعين.
// مش حالة في فلتر الجدول: الجدول بيعرض نشط/موقوف بس.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { supabase, arError } from '../../lib/supabase';
import { activateSeller, rejectSeller } from '../../api/admin';
import { Btn, Field, Input, Textarea, Card, ErrorState } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { fmtDate } from '../../lib/format';

type Pending = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export function PendingSellersStrip() {
  const [activating, setActivating] = useState<Pending | null>(null);
  const [rejecting, setRejecting] = useState<Pending | null>(null);
  const qc = useQueryClient();

  const { data, isError, error } = useQuery({
    queryKey: ['pending-sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .eq('role', 'seller')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw new Error(arError(error));
      return data as Pending[];
    },
  });

  // تعذّر تحميل قائمة البائعين
  if (isError) {
    const message = (error as Error)?.message ?? 'تعذر تحميل البائعين بانتظار الاعتماد';
    return (
      <Card className="mb-4 p-4">
        <ErrorState
          message={message}
          onRetry={() => qc.refetchQueries({ queryKey: ['pending-sellers'] })}
        />
      </Card>
    );
  }

  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <>
      <Card className="mb-4 border-accent/30 bg-accent-soft/60 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent">
          <AlertCircle size={16} />
          {rows.length} بانتظار الاعتماد
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2">
              <div className="min-w-40 flex-1">
                <div className="text-sm font-medium">{r.full_name}</div>
                <div className="text-xs text-subtext" dir="ltr">{r.email ?? r.phone ?? ''}</div>
              </div>
              <span className="text-xs text-subtext">{fmtDate(r.created_at)}</span>
              <Btn variant="accent" onClick={() => setActivating(r)}>تفعيل</Btn>
              <Btn variant="ghost" onClick={() => setRejecting(r)}>رفض</Btn>
            </div>
          ))}
        </div>
      </Card>

      {activating && <ActivateModal seller={activating} onClose={() => setActivating(null)} />}
      {rejecting && <RejectModal seller={rejecting} onClose={() => setRejecting(null)} />}
    </>
  );
}

function useDone(onClose: () => void, msg: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return () => {
    toast('success', msg);
    qc.invalidateQueries({ queryKey: ['pending-sellers'] });
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['accounts-stats'] });
    qc.invalidateQueries({ queryKey: ['nav-badges'] });
    onClose();
  };
}

function ActivateModal({ seller, onClose }: { seller: Pending; onClose: () => void }) {
  const { toast } = useToast();
  const done = useDone(onClose, 'تم تفعيل البائع وإنشاء شركته ومحفظته');
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
    onSuccess: done,
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
          <Btn variant="ghost" onClick={onClose} disabled={m.isPending}>إلغاء</Btn>
          <Btn variant="accent" busy={m.isPending} onClick={() => m.mutate()} disabled={!nameAr.trim()}>
            تفعيل وإنشاء الشركة
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function RejectModal({ seller, onClose }: { seller: Pending; onClose: () => void }) {
  const { toast } = useToast();
  const done = useDone(onClose, 'تم رفض طلب البائع');
  const [note, setNote] = useState('');

  const m = useMutation({
    mutationFn: () => rejectSeller(seller.id, note || undefined),
    onSuccess: done,
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={`رفض طلب — ${seller.full_name}`} open onClose={onClose}>
      <div className="space-y-4">
        <Field label="سبب الرفض (اختياري)" hint="يصل للبائع كإشعار">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={m.isPending}>إلغاء</Btn>
          <Btn variant="danger" busy={m.isPending} onClick={() => m.mutate()}>رفض الطلب</Btn>
        </div>
      </div>
    </Modal>
  );
}
