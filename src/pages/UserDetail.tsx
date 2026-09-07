// تفاصيل مستخدم: الملف + المحفظة + الشركات + العناوين + الطلبات + التذاكر + إجراءات إدارية.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { suspendAccount, reactivateAccount, type AccountKind } from '../api/accounts';
import { setUserPassword, generatePassword, MIN_PASSWORD_LENGTH } from '../api/account';
import { useAdmin } from '../components/Guard';
import {
  PageHeader, Card, StatusChip, Money, Btn, Field, Input, Textarea, Spinner, ErrorState,
} from '../components/ui';
import { BuyerStatsPanel } from '../components/AccountStatsPanel';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDate, fmtDateTime, localPhone } from '../lib/format';
import { roleLabels, accountStatusLabels, orderStatusLabels, labelOf } from '../lib/labels';

const memberRoleLabel: Record<string, string> = {
  owner: 'مالك',
  manager: 'مدير',
  purchaser: 'مشتري',
  viewer: 'مطّلع',
};

const ticketStatusLabel: Record<string, { label: string; tone: 'gray' | 'green' | 'orange' | 'red' | 'blue' | 'navy' }> = {
  open: { label: 'مفتوحة', tone: 'orange' },
  in_progress: { label: 'قيد المعالجة', tone: 'blue' },
  waiting_user: { label: 'بانتظار المستخدم', tone: 'navy' },
  resolved: { label: 'محلولة', tone: 'green' },
  closed: { label: 'مغلقة', tone: 'gray' },
};

// الصفحة دي ملف شخصي دايمًا، يعني الـ id بتاعها profiles.id — البائع في جدول
// الحسابات كيانه شركة، لكن هنا إحنا على ملفه هو. عمرنا ما نمرّر id شركة من هنا.
// الفرق بين النوعين دون بائع وصفي بس: الاتنين بيروحوا على admin_suspend_account.
const accountKindOf = (role: string | null | undefined): AccountKind =>
  role === 'company_buyer' ? 'company_buyer' : 'individual';

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const me = useAdmin();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusTarget, setStatusTarget] = useState<'active' | 'suspended' | null>(null);
  const [reason, setReason] = useState('');
  const [pwdOpen, setPwdOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user', id],
    enabled: !!id,
    queryFn: async () => {
      const [profile, memberships, wallet, addresses, orders, tickets] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id!).single(),
        supabase
          .from('company_members')
          .select('id, member_role, status, company:companies (id, name_ar, type, is_active)')
          .eq('user_id', id!),
        supabase.from('wallets').select('id, balance, is_frozen, currency').eq('owner_type', 'user').eq('owner_id', id!).maybeSingle(),
        supabase
          .from('addresses')
          .select('id, label, recipient, phone, governorate, area, block, street, building, floor, apartment, is_default')
          .eq('user_id', id!)
          .order('is_default', { ascending: false }),
        supabase
          .from('orders')
          .select('id, order_number, status, grand_total, placed_at')
          .eq('buyer_id', id!)
          .order('placed_at', { ascending: false })
          .limit(15),
        supabase
          .from('support_tickets')
          .select('id, ticket_number, subject, status, created_at')
          .eq('user_id', id!)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      if (profile.error) throw new Error(arError(profile.error));
      return {
        profile: profile.data as typeof profile.data & { account_code: string | null },
        memberships: (memberships.data ?? []) as unknown as {
          id: string;
          member_role: string;
          status: string;
          company: { id: string; name_ar: string; type: string; is_active: boolean } | null;
        }[],
        wallet: wallet.data,
        addresses: addresses.data ?? [],
        orders: orders.data ?? [],
        tickets: tickets.data ?? [],
      };
    },
  });

  // نفس طريق جدول الحسابات بالظبط: تعليق بسبب إجباري وختم زمني، مش الغلاف القديم
  // اللي كان بيكتب سبب معلّب. والإبطال بيمسّ ['accounts'] و['accounts-stats'] عشان
  // الرجوع للتاب في أقل من 30 ثانية ما يعرضش الصف بحالة قديمة.
  const statusMut = useMutation({
    mutationFn: (to: 'active' | 'suspended') => {
      const kind = accountKindOf(data?.profile.role);
      return to === 'suspended'
        ? suspendAccount(kind, id!, reason)
        : reactivateAccount(kind, id!);
    },
    onSuccess: (_d, to) => {
      toast('success', to === 'suspended' ? 'تم تعليق الحساب' : 'تم إعادة تفعيل الحساب');
      setStatusTarget(null);
      setReason('');
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  if (isLoading) return <Spinner />;
  if (error || !data?.profile)
    return <ErrorState message={(error as Error)?.message ?? 'المستخدم غير موجود'} onRetry={() => refetch()} />;

  const p = data.profile;
  const role = labelOf(roleLabels, p.role);
  const status = labelOf(accountStatusLabels, p.status);

  return (
    <div>
      <PageHeader
        title={p.full_name}
        subtitle={`${role.label} · سُجّل ${fmtDate(p.created_at)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {p.role !== 'admin' && (
              <>
                <Btn variant="ghost" onClick={() => setPwdOpen(true)}>كلمة المرور</Btn>
                {p.status === 'active' && (
                  <Btn variant="ghost" onClick={() => setStatusTarget('suspended')}>تعليق</Btn>
                )}
                {p.status === 'suspended' && (
                  <Btn variant="accent" onClick={() => setStatusTarget('active')}>إعادة تفعيل</Btn>
                )}
              </>
            )}
            {p.id === me.id && (
              <Link to="/account" className="text-sm text-accent hover:underline">حسابي</Link>
            )}
            {/* الرجوع لازم يوصّل للتاب اللي فيه الصف فعلاً: مشتري الشركة مش موجود
                في تاب الأفراد، والمسارات القديمة بتحوّل عليه غلط. */}
            <Link
              to={
                p.role === 'seller' ? '/accounts/sellers'
                  : p.role === 'company_buyer' ? '/accounts/companies'
                  : '/accounts/individuals'
              }
              className="flex items-center gap-1 text-sm text-subtext hover:text-primary"
            >
              <ArrowRight size={15} /> رجوع
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-4 lg:col-span-2">
          <div className="mb-4 flex items-start gap-4">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="size-16 rounded-2xl object-cover ring-1 ring-line" />
            ) : (
              <div className="grid size-16 place-items-center rounded-2xl bg-primary text-xl font-bold text-white">
                {(p.full_name || '?').trim().charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-primary">{p.full_name}</h2>
                <StatusChip label={role.label} tone={role.tone} />
                <StatusChip label={status.label} tone={status.tone} />
              </div>
              <div className="mt-1 text-sm text-subtext" dir="ltr">{p.account_code ?? p.id}</div>
            </div>
          </div>

          <h3 className="mb-3 font-bold">البيانات الشخصية</h3>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row label="البريد" value={p.email} ltr />
            <Row label="الهاتف" value={localPhone(p.phone)} ltr />
            <Row label="الرقم المدني" value={p.civil_id} ltr />
            <Row label="الجنسية" value={p.nationality} />
            <Row label="اللغة" value={p.locale === 'en' ? 'English' : p.locale === 'ar' ? 'العربية' : p.locale} />
            <Row label="رقم الحساب" value={p.account_code} ltr />
            <Row label="قبول الشروط" value={p.accepted_terms_at ? fmtDateTime(p.accepted_terms_at) : '—'} />
            <Row label="آخر ظهور" value={p.last_seen_at ? fmtDateTime(p.last_seen_at) : '—'} />
            <Row label="تاريخ التسجيل" value={fmtDateTime(p.created_at)} />
            <Row label="آخر تحديث" value={fmtDateTime(p.updated_at)} />
          </dl>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-bold">المحفظة</h2>
          {data.wallet ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-subtext">الرصيد</span>
                <Money value={data.wallet.balance} />
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-subtext">العملة</span>
                <span dir="ltr">{data.wallet.currency}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-subtext">الحالة</span>
                {data.wallet.is_frozen
                  ? <StatusChip label="مجمّدة" tone="red" />
                  : <StatusChip label="نشطة" tone="green" />}
              </div>
              <Link to="/wallets" className="mt-2 block text-sm text-accent hover:underline">إدارة المحافظ ←</Link>
            </div>
          ) : (
            <p className="text-sm text-subtext">لا توجد محفظة شخصية لهذا المستخدم</p>
          )}
        </Card>
      </div>

      {(p.role === 'individual_buyer' || p.role === 'company_buyer') && (
        <BuyerStatsPanel profileId={p.id} />
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-bold">العضوية في الشركات ({data.memberships.length})</h2>
          {data.memberships.length === 0 ? (
            <p className="text-sm text-subtext">غير مرتبط بأي شركة</p>
          ) : (
            <div className="divide-y divide-line">
              {data.memberships.map((m) => {
                const s = labelOf(accountStatusLabels, m.status);
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      {m.company ? (
                        <Link to={`/companies/${m.company.id}`} className="font-medium text-primary hover:text-accent">
                          {m.company.name_ar}
                        </Link>
                      ) : (
                        <span className="font-medium">—</span>
                      )}
                      <div className="text-xs text-subtext">
                        {m.company?.type === 'seller' ? 'بائع' : m.company?.type === 'buyer' ? 'مشتري' : m.company?.type ?? ''}
                      </div>
                    </div>
                    <StatusChip label={memberRoleLabel[m.member_role] ?? m.member_role} tone="navy" />
                    <StatusChip label={s.label} tone={s.tone} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-bold">العناوين ({data.addresses.length})</h2>
          {data.addresses.length === 0 ? (
            <p className="text-sm text-subtext">لا توجد عناوين محفوظة</p>
          ) : (
            <div className="divide-y divide-line">
              {data.addresses.map((a) => (
                <div key={a.id} className="py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.label || a.recipient || 'عنوان'}</span>
                    {a.is_default && <StatusChip label="افتراضي" tone="orange" />}
                  </div>
                  <div className="mt-0.5 text-xs text-subtext">
                    {[a.governorate, a.area, a.block && `قطعة ${a.block}`, a.street && `شارع ${a.street}`, a.building && `مبنى ${a.building}`, a.floor && `دور ${a.floor}`, a.apartment && `شقة ${a.apartment}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {(a.phone || a.recipient) && (
                    <div className="mt-0.5 text-xs text-subtext" dir="ltr">
                      {[a.recipient, a.phone ? localPhone(a.phone) : null].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-bold">آخر الطلبات</h2>
          {data.orders.length === 0 ? (
            <p className="text-sm text-subtext">لا توجد طلبات كمشتري</p>
          ) : (
            <div className="divide-y divide-line">
              {data.orders.map((o) => {
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
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-bold">تذاكر الدعم</h2>
          {data.tickets.length === 0 ? (
            <p className="text-sm text-subtext">لا توجد تذاكر</p>
          ) : (
            <div className="divide-y divide-line">
              {data.tickets.map((t) => {
                const s = ticketStatusLabel[t.status] ?? { label: t.status, tone: 'gray' as const };
                return (
                  <Link key={t.id} to="/support" className="flex items-center gap-3 py-2.5 text-sm hover:bg-surface">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{t.subject}</div>
                      <div className="text-xs text-subtext" dir="ltr">{t.ticket_number} · {fmtDateTime(t.created_at)}</div>
                    </div>
                    <StatusChip label={s.label} tone={s.tone} />
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* السبب إجباري زي جدول الحسابات — الزرار مقفول لحد ما يتكتب، والـ RPC
          نفسه بيرفض السبب الفاضي كخط دفاع تاني. */}
      {statusTarget === 'suspended' && (
        <Modal
          title={`تعليق — ${p.full_name}`}
          open
          onClose={() => { setStatusTarget(null); setReason(''); }}
        >
          <div className="space-y-4">
            <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">
              سيتم إيقاف الحساب وكل حساباته الفرعية عن الدخول.
            </p>

            <Field label="سبب التعليق" hint="إجباري — بيتسجّل مع التاريخ وبيظهر في جدول الحسابات">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: مخالفة شروط الاستخدام — بلاغات متكررة"
              />
            </Field>

            <div className="flex justify-end gap-2">
              <Btn
                variant="ghost"
                onClick={() => { setStatusTarget(null); setReason(''); }}
                disabled={statusMut.isPending}
              >
                إلغاء
              </Btn>
              <Btn
                variant="danger"
                busy={statusMut.isPending}
                disabled={!reason.trim()}
                onClick={() => statusMut.mutate('suspended')}
              >
                تعليق
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={statusTarget === 'active'}
        title="إعادة تفعيل الحساب"
        message={`سيتم إعادة تفعيل حساب «${p.full_name}». متابعة؟`}
        confirmLabel="إعادة تفعيل"
        busy={statusMut.isPending}
        onConfirm={() => statusMut.mutate('active')}
        onClose={() => setStatusTarget(null)}
      />

      {pwdOpen && (
        <PasswordModal
          user={{ id: p.id, full_name: p.full_name, email: p.email }}
          onClose={() => setPwdOpen(false)}
        />
      )}
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string | null | undefined; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line/70 py-1.5 last:border-0">
      <dt className="shrink-0 text-subtext">{label}</dt>
      <dd className="min-w-0 truncate text-end font-medium text-primary" dir={ltr ? 'ltr' : undefined}>
        {value?.trim() ? value : '—'}
      </dd>
    </div>
  );
}

function PasswordModal({
  user,
  onClose,
}: {
  user: { id: string; full_name: string; email: string | null };
  onClose: () => void;
}) {
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
              onChange={(e) => {
                setPassword(e.target.value);
                setDone(false);
              }}
              placeholder="اكتبها أو ولّدها تلقائيًا"
            />
            <Btn
              variant="ghost"
              onClick={() => {
                setPassword(generatePassword());
                setDone(false);
              }}
            >
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
