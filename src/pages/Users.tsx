// المستخدمون — مفصولين: عاديون | بائعون | (الشركات من صفحة مستقلة)
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { supabase, arError } from '../lib/supabase';
import { setAccountStatus } from '../api/admin';
import { setUserPassword, generatePassword, MIN_PASSWORD_LENGTH } from '../api/account';
import { useAdmin } from '../components/Guard';
import { PageHeader, StatusChip, Select, Input, Btn, Field } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDate } from '../lib/format';
import { roleLabels, accountStatusLabels, labelOf } from '../lib/labels';

type Kind = 'buyers' | 'sellers';

type Row = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  account_code: string | null;
  created_at: string;
};

const KIND_META: Record<Kind, { title: string; subtitle: string; empty: string; roles: string[] }> = {
  buyers: {
    title: 'مستخدمون عاديون',
    subtitle: 'مشترو الأفراد وموظفو شركات الشراء',
    empty: 'لا يوجد مستخدمون عاديون',
    roles: ['individual_buyer', 'company_buyer'],
  },
  sellers: {
    title: 'البائعون',
    subtitle: 'حسابات البائعين (أفراد مرتبطون بشركات بيع)',
    empty: 'لا يوجد بائعون',
    roles: ['seller'],
  },
};

export default function UsersPage({ kind }: { kind: Kind }) {
  return <UsersList kind={kind} />;
}

function UsersList({ kind }: { kind: Kind }) {
  const meta = KIND_META[kind];
  const me = useAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [buyerType, setBuyerType] = useState<'all' | 'individual_buyer' | 'company_buyer'>('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<{ row: Row; to: 'active' | 'suspended' } | null>(null);
  const [pwdFor, setPwdFor] = useState<Row | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users', kind, buyerType, status, search, page],
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, status, account_code, created_at')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

      if (kind === 'buyers') {
        if (buyerType === 'all') q = q.in('role', ['individual_buyer', 'company_buyer']);
        else q = q.eq('role', buyerType);
      } else {
        q = q.eq('role', 'seller');
      }

      if (status !== 'all') q = q.eq('status', status as never);
      if (search.trim()) {
        q = q.or(
          `full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,account_code.ilike.%${search.trim()}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as Row[];
    },
  });

  const m = useMutation({
    mutationFn: (args: { id: string; to: 'active' | 'suspended' }) => setAccountStatus(args.id, args.to),
    onSuccess: (_d, v) => {
      toast('success', v.to === 'suspended' ? 'تم تعليق الحساب' : 'تم إعادة تفعيل الحساب');
      setTarget(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: kind === 'sellers' ? 'البائع' : 'المستخدم',
      render: (r) => (
        <div>
          <div className="font-medium">{r.full_name}</div>
          <div className="text-xs text-subtext" dir="ltr">{r.email ?? r.phone ?? ''}</div>
        </div>
      ),
    },
    { key: 'code', header: 'رقم الحساب', render: (r) => <span dir="ltr">{r.account_code ?? '—'}</span> },
    {
      key: 'role',
      header: 'النوع',
      render: (r) => {
        const l = labelOf(roleLabels, r.role);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (r) => {
        const l = labelOf(accountStatusLabels, r.status);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    { key: 'created', header: 'تاريخ التسجيل', render: (r) => fmtDate(r.created_at) },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (r) => {
        if (r.role === 'admin') {
          return r.id === me.id ? (
            <Link to="/account" className="text-sm text-accent hover:underline" onClick={(e) => e.stopPropagation()}>
              كلمة مروري
            </Link>
          ) : (
            <span className="text-xs text-subtext">حساب إداري</span>
          );
        }
        return (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Btn variant="ghost" onClick={() => setPwdFor(r)}>كلمة المرور</Btn>
            {r.status === 'active' ? (
              <Btn variant="ghost" onClick={() => setTarget({ row: r, to: 'suspended' })}>تعليق</Btn>
            ) : r.status === 'suspended' ? (
              <Btn variant="ghost" onClick={() => setTarget({ row: r, to: 'active' })}>إعادة تفعيل</Btn>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title={meta.title} subtitle={meta.subtitle} />

      <div className="mb-4 flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-line">
        <KindTab to="/users/buyers" label="مستخدمون عاديون" />
        <KindTab to="/users/sellers" label="بائعون" />
        <KindTab to="/companies" label="شركات" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="بحث بالاسم/البريد/رقم الحساب…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-64"
        />
        {kind === 'buyers' && (
          <Select
            value={buyerType}
            onChange={(e) => { setBuyerType(e.target.value as typeof buyerType); setPage(0); }}
            className="w-40"
          >
            <option value="all">كل المشترين</option>
            <option value="individual_buyer">مشتري فرد</option>
            <option value="company_buyer">مشتري شركة</option>
          </Select>
        )}
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-36">
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="pending">في الانتظار</option>
          <option value="suspended">موقوف</option>
          <option value="rejected">مرفوض</option>
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
        onRowClick={(r) => navigate(`/users/${r.id}`)}
        emptyTitle={meta.empty}
      />

      <ConfirmDialog
        open={!!target}
        title={target?.to === 'suspended' ? 'تعليق الحساب' : 'إعادة تفعيل الحساب'}
        message={
          target?.to === 'suspended'
            ? `سيتم تعليق حساب «${target?.row.full_name}» ومنعه من استخدام التطبيق. متابعة؟`
            : `سيتم إعادة تفعيل حساب «${target?.row.full_name}». متابعة؟`
        }
        confirmLabel={target?.to === 'suspended' ? 'تعليق' : 'إعادة تفعيل'}
        danger={target?.to === 'suspended'}
        busy={m.isPending}
        onConfirm={() => target && m.mutate({ id: target.row.id, to: target.to })}
        onClose={() => setTarget(null)}
      />
      {pwdFor && <PasswordModal user={pwdFor} onClose={() => setPwdFor(null)} />}
    </div>
  );
}

function KindTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary text-white' : 'text-subtext hover:text-primary'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function PasswordModal({ user, onClose }: { user: Row; onClose: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);

  const save = useMutation({
    mutationFn: () => setUserPassword(user.id, password),
    onSuccess: () => {
      setDone(true);
      toast('success', `تم تعيين كلمة مرور «${user.full_name}»`);
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={`كلمة مرور — ${user.full_name}`} open onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-surface p-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-subtext">البريد</span>
            <span dir="ltr">{user.email ?? '—'}</span>
          </div>
        </div>

        <Field label="كلمة المرور الجديدة" hint={`${MIN_PASSWORD_LENGTH} أحرف على الأقل`}>
          <div className="flex gap-2">
            <Input
              dir="ltr"
              autoComplete="off"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setDone(false); }}
              placeholder="اكتبها أو ولّدها تلقائيًا"
            />
            <Btn variant="ghost" onClick={() => { setPassword(generatePassword()); setDone(false); }}>
              توليد
            </Btn>
          </div>
        </Field>

        {done ? (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-success">
            تم التغيير. سلّم المستخدم كلمة المرور دي واطلب منه يغيّرها بعد أول دخول.
          </div>
        ) : (
          <p className="text-xs text-subtext">
            التغيير فوري ولا يُرسَل للمستخدم تلقائيًا — أنت مسؤول عن تسليمها له بطريقة آمنة.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={save.isPending}>
            {done ? 'إغلاق' : 'إلغاء'}
          </Btn>
          <Btn variant="accent" busy={save.isPending} disabled={!password} onClick={() => save.mutate()}>
            تعيين كلمة المرور
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
