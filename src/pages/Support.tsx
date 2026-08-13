// الدعم الفني — رسائل المستخدمين داخل التطبيق + الأسئلة الشائعة + شروط التطبيق.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { useAdmin } from '../components/Guard';
import { PageHeader, Btn, Field, Input, Textarea, StatusChip, Select, Card, Toggle } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { Modal, ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';
import { ticketStatusLabels, labelOf, legalSlugLabels } from '../lib/labels';

type Tab = 'tickets' | 'faqs' | 'legal';

export default function Support() {
  const [tab, setTab] = useState<Tab>('tickets');
  return (
    <div>
      <PageHeader
        title="الدعم الفني"
        subtitle="رسائل المستخدمين داخل التطبيق، والأسئلة الشائعة، وشروط التطبيق اللي بتظهر في الموبايل"
      />
      <div className="mb-4 flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-line">
        {(
          [
            ['tickets', 'رسائل الدعم'],
            ['faqs', 'الأسئلة الشائعة'],
            ['legal', 'شروط التطبيق'],
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-subtext">
          الرسائل اللي المستخدم بيبعتها من داخل التطبيق تظهر هنا. تقدر تفتح الرسالة وترد عليها. التواصل عبر واتساب ما بيظهرش في الصفحة دي.
        </p>
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
        emptyTitle="لا توجد رسائل دعم بعد"
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
      <p className="mb-3 text-sm text-subtext">
        الأسئلة دي بتظهر للمستخدم في التطبيق عشان يلاقي الإجابة من غير ما يكلّم الدعم.
      </p>
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

type LegalSlug = 'terms' | 'privacy' | 'return_policy';
type LegalDoc = { id: string; slug: LegalSlug; locale: string; version: number; body: string; published_at: string | null };

const LEGAL_SLUGS: LegalSlug[] = ['terms', 'privacy', 'return_policy'];

function clausesOf(body: string): string[] {
  return body.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
}

function Legal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<LegalDoc | null>(null);
  const [creating, setCreating] = useState<LegalSlug | null>(null);
  const [deleting, setDeleting] = useState<LegalDoc | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['legal'],
    queryFn: async () => {
      const { data, error } = await supabase.from('legal_documents').select('*').eq('locale', 'ar').order('slug');
      if (error) throw new Error(arError(error));
      return data as LegalDoc[];
    },
  });

  const docs = data ?? [];
  const missing = LEGAL_SLUGS.filter((slug) => !docs.some((d) => d.slug === slug));

  return (
    <div className="space-y-4">
      <p className="text-sm text-subtext">
        النصوص دي بتظهر في التطبيق عند التسجيل وفي قائمة الحساب. عدّل البند أو زوّد أو امسح — التغيير يظهر للمستخدم فور الحفظ.
      </p>
      {isLoading ? (
        <Card className="p-4">
          <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
        </Card>
      ) : (
        <>
          {docs.map((d) => (
            <LegalCard key={d.id} doc={d} onEdit={() => setEditing(d)} onDelete={() => setDeleting(d)} />
          ))}
          {missing.length > 0 && (
            <Card className="p-4">
              <div className="mb-3 text-sm font-medium">مستندات لسه مش موجودة</div>
              <div className="flex flex-wrap gap-2">
                {missing.map((slug) => (
                  <Btn key={slug} variant="ghost" onClick={() => setCreating(slug)}>
                    + {legalSlugLabels[slug]}
                  </Btn>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
      {editing && (
        <LegalEditor
          title={`تعديل — ${legalSlugLabels[editing.slug] ?? editing.slug}`}
          initialClauses={clausesOf(editing.body)}
          onClose={() => setEditing(null)}
          onSave={async (clauses) => {
            const { error } = await supabase
              .from('legal_documents')
              .update({
                body: clauses.join('\n'),
                version: editing.version + 1,
                published_at: new Date().toISOString(),
              })
              .eq('id', editing.id);
            if (error) throw new Error(arError(error));
            toast('success', 'تم حفظ الشروط — هتظهر في التطبيق فورًا');
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['legal'] });
          }}
        />
      )}
      {creating && (
        <LegalEditor
          title={`إضافة — ${legalSlugLabels[creating]}`}
          initialClauses={['']}
          onClose={() => setCreating(null)}
          onSave={async (clauses) => {
            const { error } = await supabase.from('legal_documents').insert({
              slug: creating,
              locale: 'ar',
              version: 1,
              body: clauses.join('\n'),
              published_at: new Date().toISOString(),
            });
            if (error) throw new Error(arError(error));
            toast('success', 'تم إضافة المستند');
            setCreating(null);
            qc.invalidateQueries({ queryKey: ['legal'] });
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open
          danger
          title="حذف المستند؟"
          message={`هيتشال «${legalSlugLabels[deleting.slug] ?? deleting.slug}» من التطبيق، والمستخدم مش هيشوفه لحد ما تضيفه تاني.`}
          confirmLabel="حذف"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const { error } = await supabase.from('legal_documents').delete().eq('id', deleting.id);
            if (error) {
              toast('error', arError(error));
              return;
            }
            toast('success', 'تم الحذف');
            setDeleting(null);
            qc.invalidateQueries({ queryKey: ['legal'] });
          }}
        />
      )}
    </div>
  );
}

function LegalCard({ doc, onEdit, onDelete }: { doc: LegalDoc; onEdit: () => void; onDelete: () => void }) {
  const clauses = clausesOf(doc.body);
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">{legalSlugLabels[doc.slug] ?? doc.slug}</h2>
          <p className="mt-0.5 text-xs text-subtext">
            {clauses.length} بند · آخر تحديث {fmtDateTime(doc.published_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onDelete}>حذف</Btn>
          <Btn variant="accent" onClick={onEdit}>تعديل البنود</Btn>
        </div>
      </div>
      {clauses.length === 0 ? (
        <p className="text-sm text-subtext">لا توجد بنود بعد</p>
      ) : (
        <ol className="space-y-2">
          {clauses.map((clause, i) => (
            <li key={`${i}-${clause.slice(0, 24)}`} className="flex gap-3 text-sm">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <span className="leading-6">{clause}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function LegalEditor({
  title,
  initialClauses,
  onClose,
  onSave,
}: {
  title: string;
  initialClauses: string[];
  onClose: () => void;
  onSave: (clauses: string[]) => Promise<void>;
}) {
  const { toast } = useToast();
  const [clauses, setClauses] = useState(initialClauses.length ? initialClauses : ['']);
  const [saving, setSaving] = useState(false);

  function setClause(index: number, value: string) {
    setClauses((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  async function submit() {
    const cleaned = clauses.map((c) => c.trim()).filter((c) => c.length > 0);
    if (cleaned.length === 0) {
      toast('error', 'أضف بندًا واحدًا على الأقل');
      return;
    }
    setSaving(true);
    try {
      await onSave(cleaned);
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={title} open onClose={onClose} wide>
      <p className="mb-4 text-sm text-subtext">كل خانة بند يظهر برقم في التطبيق. تقدر تزود أو تمسح أي بند.</p>
      <div className="space-y-3">
        {clauses.map((clause, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-2 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <Textarea
              className="min-h-16"
              value={clause}
              onChange={(e) => setClause(i, e.target.value)}
              placeholder="اكتب نص البند…"
            />
            <Btn
              variant="ghost"
              className="mt-1 shrink-0"
              onClick={() => setClauses((prev) => (prev.length === 1 ? [''] : prev.filter((_, j) => j !== i)))}
            >
              حذف
            </Btn>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Btn variant="ghost" onClick={() => setClauses((prev) => [...prev, ''])}>+ بند جديد</Btn>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn variant="accent" busy={saving} onClick={() => void submit()}>حفظ ونشر</Btn>
        </div>
      </div>
    </Modal>
  );
}
