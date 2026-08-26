// حسابات المنصة — كل الأرقام محسوبة في الداتابيز عبر admin_accounts_* .
// المبالغ بترجع نصًا وبتتحوّل هنا بـ Number عشان مايحصلش فقدان دقة.
import { supabase, arError } from '../lib/supabase';

export type AccountKind = 'individual' | 'company_buyer' | 'seller';
export type AccountStatus = 'active' | 'suspended';

export type SortKey =
  | 'name' | 'account_code' | 'status' | 'phone' | 'created_at' | 'sub_accounts'
  | 'n_items' | 'n_orders' | 'n_sites' | 'n_partners' | 'total' | 'balance'
  | 'n_products' | 'commission' | 'commission_rate';

export type AccountRow = {
  id: string;
  ownerId: string | null;
  name: string;
  ownerName: string | null;
  accountCode: string | null;
  email: string | null;
  phone: string | null;
  status: AccountStatus;
  suspendedAt: string | null;
  suspendReason: string | null;
  createdAt: string;
  subAccounts: number;
  nItems: number;
  nOrders: number;
  nSites: number;
  nPartners: number;
  total: number;
  balance: number;
  nProducts: number;
  commission: number;
  commissionRate: number | null;
};

export type AccountsStats = {
  total: number;
  active: number;
  suspended: number;
  money: number;
  commission: number;
  nItems: number;
  nOrders: number;
  nProducts: number;
};

export type AccountsQuery = {
  kind: AccountKind;
  from: string | null;
  to: string | null;
  search: string;
  status: 'all' | AccountStatus;
  sort: SortKey;
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

const num = (v: unknown) => Number(v ?? 0);

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(arError(error));
  return data as T;
}

function toRow(r: Record<string, unknown>): AccountRow {
  return {
    id: String(r.id),
    ownerId: (r.owner_id as string | null) ?? null,
    name: String(r.name ?? ''),
    ownerName: (r.owner_name as string | null) ?? null,
    accountCode: (r.account_code as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    status: r.status === 'suspended' ? 'suspended' : 'active',
    suspendedAt: (r.suspended_at as string | null) ?? null,
    suspendReason: (r.suspend_reason as string | null) ?? null,
    createdAt: String(r.created_at),
    subAccounts: num(r.sub_accounts),
    nItems: num(r.n_items),
    nOrders: num(r.n_orders),
    nSites: num(r.n_sites),
    nPartners: num(r.n_partners),
    total: num(r.total),
    balance: num(r.balance),
    nProducts: num(r.n_products),
    commission: num(r.commission),
    commissionRate: r.commission_rate == null ? null : num(r.commission_rate),
  };
}

export async function fetchAccounts(q: AccountsQuery): Promise<{ rows: AccountRow[]; total: number }> {
  const r = await callRpc<Record<string, unknown>>('admin_accounts_list', {
    p_kind: q.kind,
    p_from: q.from,
    p_to: q.to,
    p_search: q.search.trim() || null,
    p_status: q.status,
    p_sort: q.sort,
    p_dir: q.dir,
    p_limit: q.pageSize,
    p_offset: q.page * q.pageSize,
  });
  const rows = (r.rows ?? []) as Record<string, unknown>[];
  return { rows: rows.map(toRow), total: num(r.total) };
}

export async function fetchAccountsStats(
  kind: AccountKind,
  from: string | null,
  to: string | null,
): Promise<AccountsStats> {
  const r = await callRpc<Record<string, unknown>>('admin_accounts_stats', {
    p_kind: kind,
    p_from: from,
    p_to: to,
  });
  return {
    total: num(r.total),
    active: num(r.active),
    suspended: num(r.suspended),
    money: num(r.money),
    commission: num(r.commission),
    nItems: num(r.n_items),
    nOrders: num(r.n_orders),
    nProducts: num(r.n_products),
  };
}

/** التعليق: البائع كيانه شركة، والمشتري كيانه حساب. */
export async function suspendAccount(kind: AccountKind, id: string, reason: string): Promise<void> {
  if (!reason.trim()) throw new Error('سبب التعليق مطلوب');
  if (kind === 'seller') {
    await callRpc('admin_suspend_company', { p_company_id: id, p_reason: reason.trim() });
  } else {
    await callRpc('admin_suspend_account', { p_profile_id: id, p_reason: reason.trim() });
  }
}

export async function reactivateAccount(kind: AccountKind, id: string): Promise<void> {
  if (kind === 'seller') {
    await callRpc('admin_reactivate_company', { p_company_id: id });
  } else {
    await callRpc('admin_reactivate_account', { p_profile_id: id });
  }
}

export async function setCommission(companyId: string, rate: number): Promise<void> {
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new Error('نسبة العمولة يجب أن تكون بين 0 و 100');
  }
  await callRpc('admin_set_company_commission', { p_company_id: companyId, p_rate: rate });
}

export type CreateSellerInput = {
  email: string;
  password: string;
  fullName: string;
  nameAr: string;
  phone?: string;
  governorate?: string;
  commercialRegister?: string;
  commissionRate?: number;
};

/** إنشاء بائع — Edge Function لأن إنشاء مستخدم Auth محتاج service role. */
export async function createSeller(input: CreateSellerInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ company_id?: string; error?: string }>(
    'admin-create-seller',
    {
      body: {
        email: input.email,
        password: input.password,
        full_name: input.fullName,
        name_ar: input.nameAr,
        phone: input.phone ?? null,
        governorate: input.governorate ?? null,
        commercial_register: input.commercialRegister ?? null,
        commission_rate: input.commissionRate ?? null,
      },
    },
  );

  if (data?.error) throw new Error(data.error);
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      // بس فشل الـ parse نفسه بيتبلع هنا — أي خطأ منطقي جاي من الـ body لازم
      // يترمي برّه الـ try عشان ميتلخبطش مع فشل قراءة الاستجابة (صفحة HTML من
      // gateway، خطأ إقلاع الـ worker، body فاضي).
      let parsedBody: { error?: string } | undefined;
      try {
        parsedBody = await ctx.json();
      } catch {
        parsedBody = undefined;
      }
      if (parsedBody?.error) throw new Error(parsedBody.error);
    }
    throw new Error(arError(error));
  }
  if (!data?.company_id) throw new Error('تعذر إنشاء البائع');
  return data.company_id;
}

export type CreateIndividualBuyerInput = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  civilId: string;
  nationality: string;
};

export type CreateCompanyBuyerInput = {
  email: string;
  password: string;
  companyName: string;
  phone: string;
  civilId: string;
  commercialRegister: string;
  address: string;
  companyCode?: string;
};

async function invokeAdminFn<T extends Record<string, unknown>>(
  name: string,
  body: Record<string, unknown>,
  emptyMessage: string,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, { body });
  if (data?.error) throw new Error(data.error);
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      let parsedBody: { error?: string } | undefined;
      try {
        parsedBody = await ctx.json();
      } catch {
        parsedBody = undefined;
      }
      if (parsedBody?.error) throw new Error(parsedBody.error);
    }
    throw new Error(arError(error));
  }
  if (!data) throw new Error(emptyMessage);
  return data;
}

/** إنشاء مشتري فرد — Edge Function لأن إنشاء مستخدم Auth محتاج service role. */
export async function createIndividualBuyer(input: CreateIndividualBuyerInput): Promise<string> {
  const data = await invokeAdminFn<{ profile_id?: string }>(
    'admin-create-buyer',
    {
      kind: 'individual',
      email: input.email,
      password: input.password,
      full_name: input.fullName,
      phone: input.phone,
      civil_id: input.civilId,
      nationality: input.nationality,
    },
    'تعذر إنشاء المشتري',
  );
  if (!data.profile_id) throw new Error('تعذر إنشاء المشتري');
  return data.profile_id;
}

/** إنشاء مشتري شركة — حساب مالك + شركة مشترية + محفظة. */
export async function createCompanyBuyer(input: CreateCompanyBuyerInput): Promise<string> {
  const data = await invokeAdminFn<{ company_id?: string }>(
    'admin-create-buyer',
    {
      kind: 'company',
      email: input.email,
      password: input.password,
      name_ar: input.companyName,
      phone: input.phone,
      civil_id: input.civilId,
      commercial_register: input.commercialRegister,
      address: input.address,
      company_code: input.companyCode || null,
    },
    'تعذر إنشاء المشتري',
  );
  if (!data.company_id) throw new Error('تعذر إنشاء المشتري');
  return data.company_id;
}
