// الدعم الفني — تذاكر مع محادثة + إدارة الأسئلة الشائعة + المستندات القانونية.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { useAdmin } from '../components/Guard';
import { PageHeader, Btn, Field, Input, Textarea, StatusChip, Select, Card, Toggle } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';
import { ticketStatusLabels, labelOf } from '../lib/labels';

type Tab = 'tickets' | 'faqs' | 'legal';

export default function Support() {
  const [tab, setTab] = useState<Tab>('tickets');
  return (
    <div>
      <PageHeader title="الدعم الفني" />
      <div className="mb-4 flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-line">
        {(
          [
            ['tickets', 'التذاكر'],
            ['faqs', 'الأسئلة الشائعة'],
            ['legal', 'المستندات القانونية'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === k ? 'bg-primary text-white' : 'text-subtext hover:text-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'tickets' && <Tickets />}
      {tab === 'faqs' && <Faqs />}
      {tab === 'legal' && <Legal />}
    </div>
  );
}

type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  user: { full_name: string } | null;
};

function Tickets() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState<Ticket | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tickets', status, page],
    queryFn: async () => {
      let q = supabase
        .from('support_tickets')
        .select('id, ticket_number, subject, status, priority, created_at, user:profiles!support_tickets_user_id_fkey (full_name)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (status !== 'all') q = q.eq('status', status as never);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as Ticket[];
    },
  });

  const setTicketStatus = useMutation({
    mutationFn: async (args: { id: string; status: string }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: args.status as 'open' | 'in_progress' | 'resolved' | 'closed' })
        .eq('id', args.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['nav-badges'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Ticket>[] = [
    { key: 'number', header: 'الرقم', render: (r) => <span dir="ltr" className="font-medium">{r.ticket_number}</span> },
    { key: 'subject', header: 'الموضوع', render: (r) => r.subject },
    { key: 'user', header: 'المستخدم', render: (r) => r.user?.full_name ?? '—' },
    {
      key: 'status',
      header: 'الحالة',
      render: (r) => {
        const l = labelOf(ticketStatusLabels, r.status);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    { key: 'created', header: 'التاريخ', render: (r) => <span className="text-xs">{fmtDateTime(r.created_at)}</span> },
    {
      key: 'set',
      header: 'تغيير الحالة',
      render: (r) => (
        <Select
          value={r.status}
          onChange={(e) => setTicketStatus.mutate({ id: r.id, status: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="w-36"
        >
          {Object.entries(ticketStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-44">
          <option value="all">كل الحالات</option>
          {Object.entries(ticketStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        page={page}
        hasMore={(data?.length ?? 0) > PAGE_SIZE}
        onPage={setPage}
        onRowClick={setOpen}
        emptyTitle="لا توجد تذاكر"
      />
      {open && <TicketChat ticket={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function TicketChat({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const me = useAdmin();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ticket-messages', ticket.id],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('id, sender_id, body, created_at')
        .eq('ticket_id', ticket.id)
        .order('created_at');
      if (error) throw new Error(arError(error));
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error('اكتب الرد أولًا');
      const { error } = await supabase
        .from('ticket_messages')
        .insert({ ticket_id: ticket.id, sender_id: me.id, body: body.trim() });
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={`تذكرة ${ticket.ticket_number} — ${ticket.subject}`} open onClose={onClose} wide>
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg bg-surface p-3">
        {isLoading ? (
          <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
        ) : (data ?? []).length === 0 ? (
          <div className="py-6 text-center text-sm text-subtext">لا توجد رسائل بعد</div>
        ) : (
          (data ?? []).map((m) => {
            const mine = m.sender_id === me.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${mine ? 'bg-primary text-white' : 'bg-white ring-1 ring-line'}`}>
                  <div>{m.body}</div>
                  <div className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-subtext'}`}>{fmtDateTime(m.created_at)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب ردك…" onKeyDown={(e) => e.key === 'Enter' && send.mutate()} />
        <Btn variant="accent" busy={send.isPending} onClick={() => send.mutate()}>إرسال</Btn>
      </div>
    </Modal>
  );
}

type Faq = { id: string; question_ar: string; answer_ar: string; category: string | null; sort_order: number; is_active: boolean };

function Faqs() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Partial<Faq> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('faqs').select('*').order('sort_order');
      if (error) throw new Error(arError(error));
      return data as Faq[];
    },
  });

  const toggle = useMutation({
    mutationFn: async (f: Faq) => {
      const { error } = await supabase.from('faqs').update({ is_active: !f.is_active }).eq('id', f.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faqs'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing?.question_ar?.trim() || !editing?.answer_ar?.trim()) throw new Error('السؤال والإجابة مطلوبان');
      const payload = {
        question_ar: editing.question_ar.trim(),
        answer_ar: editing.answer_ar.trim(),
        category: editing.category?.trim() || null,
        sort_order: editing.sort_order ?? 0,
      };
      const q = editing.id
        ? supabase.from('faqs').update(payload).eq('id', editing.id)
        : supabase.from('faqs').insert(payload);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم الحفظ');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['faqs'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end">
        <Btn variant="accent" onClick={() => setEditing({ sort_order: (data?.length ?? 0) + 1 })}>+ إضافة سؤال</Btn>
      </div>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (data ?? []).length === 0 ? (
        <div className="py-6 text-center text-sm text-subtext">لا توجد أسئلة بعد</div>
      ) : (
        <div className="divide-y divide-line">
          {(data ?? []).map((f) => (
            <div key={f.id} className="flex items-start gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{f.question_ar}</div>
                <div className="mt-0.5 text-xs leading-5 text-subtext">{f.answer_ar}</div>
              </div>
              <Toggle checked={f.is_active} onChange={() => toggle.mutate(f)} />
              <Btn variant="ghost" onClick={() => setEditing(f)}>تعديل</Btn>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={editing.id ? 'تعديل سؤال' : 'إضافة سؤال'} open onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <Field label="السؤال">
              <Input value={editing.question_ar ?? ''} onChange={(e) => setEditing({ ...editing, question_ar: e.target.value })} />
            </Field>
            <Field label="الإجابة">
              <Textarea value={editing.answer_ar ?? ''} onChange={(e) => setEditing({ ...editing, answer_ar: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditing(null)}>إلغاء</Btn>
              <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

type LegalDoc = { id: string; slug: string; locale: string; version: number; body: string; published_at: string | null };

function Legal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Partial<LegalDoc> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['legal'],
    queryFn: async () => {
      const { data, error } = await supabase.from('legal_documents').select('*').order('slug');
      if (error) throw new Error(arError(error));
      return data as LegalDoc[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing?.slug?.trim() || !editing?.body?.trim()) throw new Error('المعرف والمحتوى مطلوبان');
      const payload = {
        slug: editing.slug.trim(),
        locale: editing.locale ?? 'ar',
        version: editing.version ?? 1,
        body: editing.body,
        published_at: new Date().toISOString(),
      };
      const q = editing.id
        ? supabase.from('legal_documents').update(payload).eq('id', editing.id)
        : supabase.from('legal_documents').insert(payload);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم النشر');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['legal'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end">
        <Btn variant="accent" onClick={() => setEditing({ locale: 'ar', version: 1 })}>+ مستند جديد</Btn>
      </div>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (data ?? []).length === 0 ? (
        <div className="py-6 text-center text-sm text-subtext">لا توجد مستندات (مثل: privacy / terms)</div>
      ) : (
        <div className="divide-y divide-line">
          {(data ?? []).map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1 font-medium" dir="ltr">{d.slug}</span>
              <span className="text-xs text-subtext" dir="ltr">v{d.version} · {d.locale}</span>
              <span className="text-xs text-subtext">{d.published_at ? fmtDateTime(d.published_at) : 'غير منشور'}</span>
              <Btn variant="ghost" onClick={() => setEditing(d)}>تحرير</Btn>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={editing.id ? `تحرير — ${editing.slug}` : 'مستند قانوني جديد'} open onClose={() => setEditing(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="المعرف (slug)" hint="privacy / terms">
                <Input dir="ltr" value={editing.slug ?? ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} disabled={!!editing.id} />
              </Field>
              <Field label="اللغة">
                <Select value={editing.locale ?? 'ar'} onChange={(e) => setEditing({ ...editing, locale: e.target.value })}>
                  <option value="ar">عربي</option>
                  <option value="en">English</option>
                </Select>
              </Field>
              <Field label="الإصدار">
                <Input dir="ltr" type="number" min="1" value={editing.version ?? 1} onChange={(e) => setEditing({ ...editing, version: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="المحتوى">
              <Textarea className="min-h-64" value={editing.body ?? ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditing(null)}>إلغاء</Btn>
              <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>نشر</Btn>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
