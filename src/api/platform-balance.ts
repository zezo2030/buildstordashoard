// رصيد المنصة والسحب البنكي.
//
// **رصيد محسوب مش محفظة**: العمولة عمرها ما اتنقلت من محفظة لمحفظة — رقم على
// الطلب. فالرصيد بيتجمّع من مصادره في الداتابيز:
//
//     + عمولات الطلبات + الاشتراكات − عمولات المرتجعات − المسحوب للبنك
//
// و«عمولات المرتجعات» = اللي اترد فعلًا في `platform_fees` وبس. العمولة
// بترجع للبائع ساعة ما يأكد استلام البضاعة المرتجعة، فقبل كده المنصة ما
// دفعتش حاجة والفلوس متاحة. نفس الرقم في «١٤ · الرسوم المعادة» بالإحصائيات.
//
// و«السحب» تسجيل لتحويل بنكي حصل بره النظام، مش أمر تحويل — عشان كده مفيش
// حالات ولا موافقات زي طلبات سحب البائعين.
import { supabase, arError } from '../lib/supabase';

export type PlatformBalance = {
  /** حركة الفترة المختارة. */
  commission: number;
  subscriptions: number;
  refunds: number;
  periodNet: number;
  /** تراكمي من أول يوم — الرصيد المتاح مالوش فترة. */
  totalCommission: number;
  totalSubscriptions: number;
  totalRefunds: number;
  totalIncome: number;
  withdrawn: number;
  balance: number;
  /**
   * أموال العملاء المحتجزة — **أمانة مش ربح**.
   *
   * لما العميل يشحن محفظته الفلوس بتدخل حساب المنصة البنكي فعلًا، بس تفضل ملكه
   * لحد ما يشتري بيها أو يسحبها. يعني الحساب البنكي شايل الاتنين مخلوطين، وده
   * الرقم اللي **ما ينفعش** يتسحب. مش داخل `balance` أصلًا.
   */
  customerFunds: number;
  buyerFunds: number;
  sellerFunds: number;
  /** حركة أموال العملاء في الفترة المختارة. */
  customerTopups: number;
  customerPayouts: number;
};

export type PlatformWithdrawal = {
  id: string;
  amount: number;
  bankRef: string | null;
  note: string | null;
  withdrawnAt: string;
  createdAt: string;
  createdByName: string | null;
};

const num = (v: unknown) => Number(v ?? 0);

export async function fetchPlatformBalance(
  from: string | null,
  to: string | null,
): Promise<PlatformBalance> {
  const { data, error } = await supabase.rpc('admin_platform_balance' as never, {
    p_from: from || null, p_to: to || null,
  } as never);
  if (error) throw new Error(arError(error));
  const r = data as unknown as Record<string, unknown>;
  return {
    commission: num(r.commission),
    subscriptions: num(r.subscriptions),
    refunds: num(r.refunds),
    periodNet: num(r.period_net),
    totalCommission: num(r.total_commission),
    totalSubscriptions: num(r.total_subscriptions),
    totalRefunds: num(r.total_refunds),
    totalIncome: num(r.total_income),
    withdrawn: num(r.withdrawn),
    balance: num(r.balance),
    customerFunds: num(r.customer_funds),
    buyerFunds: num(r.buyer_funds),
    sellerFunds: num(r.seller_funds),
    customerTopups: num(r.customer_topups),
    customerPayouts: num(r.customer_payouts),
  };
}

/** صاحب كل رصيد المنصة شايلاه — «أموال العملاء» رقم مجمّع، وده تفصيله. */
export type CustomerWallet = {
  walletId: string;
  side: 'buyer' | 'seller' | null;
  ownerType: string;
  ownerId: string;
  name: string;
  balance: number;
  /**
   * المشتري فلوسه في محفظة، والبائع رصيده في دفتر الحساب — مفيش محفظة
   * للبائع أصلًا، حصيلة البيع الأونلاين بتتقيّد في الدفتر على طول.
   */
  source: 'wallet' | 'ledger';
  lastTxnAt: string | null;
};

export async function fetchCustomerWallets(): Promise<CustomerWallet[]> {
  const { data, error } = await supabase.rpc('admin_customer_wallets' as never);
  if (error) throw new Error(arError(error));
  return ((data ?? []) as Record<string, unknown>[]).map((w) => ({
    walletId: String(w.wallet_id),
    side: (w.side as 'buyer' | 'seller' | null) ?? null,
    ownerType: String(w.owner_type),
    ownerId: String(w.owner_id),
    name: String(w.name),
    balance: num(w.balance),
    source: w.source === 'ledger' ? 'ledger' : 'wallet',
    lastTxnAt: (w.last_txn_at as string | null) ?? null,
  }));
}

export async function fetchWithdrawals(limit = 50): Promise<PlatformWithdrawal[]> {
  const { data, error } = await supabase.rpc('admin_platform_withdrawals_list' as never, {
    p_limit: limit,
  } as never);
  if (error) throw new Error(arError(error));
  return ((data ?? []) as Record<string, unknown>[]).map((w) => ({
    id: String(w.id),
    amount: num(w.amount),
    bankRef: (w.bank_ref as string | null) ?? null,
    note: (w.note as string | null) ?? null,
    withdrawnAt: String(w.withdrawn_at),
    createdAt: String(w.created_at),
    createdByName: (w.created_by_name as string | null) ?? null,
  }));
}

export async function recordWithdrawal(args: {
  amount: string;
  bankRef?: string | null;
  note?: string | null;
  at?: string | null;
}): Promise<void> {
  // المبلغ نص لحد الداتابيز — ولا `parseFloat` على فلوس.
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(args.amount.trim())) {
    throw new Error('اكتب مبلغًا صالحًا');
  }
  const { error } = await supabase.rpc('admin_record_withdrawal' as never, {
    p_amount: args.amount.trim(),
    p_bank_ref: args.bankRef?.trim() || null,
    p_note: args.note?.trim() || null,
    p_at: args.at || null,
  } as never);
  if (error) throw new Error(arError(error));
}

export async function deleteWithdrawal(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_withdrawal' as never, {
    p_id: id,
  } as never);
  if (error) throw new Error(arError(error));
}
