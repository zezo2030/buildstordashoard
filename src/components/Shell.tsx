// هيكل اللوحة: سايدبار كحلي (يمين في RTL) + محتوى بعرض مرن.
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Store, Building2, UserRound, Package, PackagePlus, ClipboardList, ImageIcon, ShoppingCart,
  ReceiptText, FileSpreadsheet, Undo2, Wallet, Banknote, BadgePercent, Truck,
  CreditCard, Headset, Bell, Settings, ScrollText, LogOut, ChevronLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAdmin } from './Guard';

function useBadges() {
  return useQuery({
    queryKey: ['nav-badges'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [sellers, withdrawals, tickets, requests, submissions] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller').eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('product_requests').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('product_submissions').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      return {
        sellers: sellers.count ?? 0,
        withdrawals: withdrawals.count ?? 0,
        tickets: tickets.count ?? 0,
        requests: requests.count ?? 0,
        submissions: submissions.count ?? 0,
      };
    },
  });
}

type Item = { to: string; label: string; icon: React.ReactNode; badge?: number };

function NavItem({ item }: { item: Item }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        [
          'group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all duration-150',
          isActive
            ? 'bg-accent text-white font-semibold shadow-[0_6px_16px_-8px_rgba(245,133,31,0.9)]'
            : 'text-white/70 hover:bg-white/[0.08] hover:text-white',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {!isActive && (
            <span className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-accent opacity-0 transition-opacity group-hover:opacity-60" />
          )}
          <span className={isActive ? 'text-white' : 'text-white/55 group-hover:text-white/90'}>
            {item.icon}
          </span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {!!item.badge && item.badge > 0 && (
            <span
              className={[
                'min-w-5 rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums',
                isActive ? 'bg-white text-accent' : 'bg-accent text-white',
              ].join(' ')}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Shell() {
  const admin = useAdmin();
  const navigate = useNavigate();
  const { data: badges } = useBadges();

  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'عام',
      items: [{ to: '/', label: 'نظرة عامة', icon: <LayoutDashboard size={17} strokeWidth={1.75} /> }],
    },
    {
      title: 'الحسابات',
      items: [
        { to: '/requests/materials', label: 'طلبات المواد', icon: <FileSpreadsheet size={17} strokeWidth={1.75} />, badge: badges?.requests },
        { to: '/accounts/individuals', label: 'مشتري فرد', icon: <UserRound size={17} strokeWidth={1.75} /> },
        { to: '/accounts/companies', label: 'مشتري شركة', icon: <Building2 size={17} strokeWidth={1.75} /> },
        { to: '/accounts/sellers', label: 'البائعون', icon: <Store size={17} strokeWidth={1.75} />, badge: badges?.sellers },
      ],
    },
    {
      title: 'الكتالوج',
      items: [
        { to: '/catalog/products', label: 'المنتجات', icon: <Package size={17} strokeWidth={1.75} /> },
        { to: '/catalog/submissions', label: 'منتجات مقترحة', icon: <PackagePlus size={17} strokeWidth={1.75} />, badge: badges?.submissions },
        { to: '/catalog/taxonomy', label: 'التخصصات والفئات', icon: <ClipboardList size={17} strokeWidth={1.75} /> },
        { to: '/catalog/banners', label: 'بانرات الرئيسية', icon: <ImageIcon size={17} strokeWidth={1.75} /> },
      ],
    },
    {
      title: 'التجارة',
      items: [
        { to: '/orders', label: 'الطلبات', icon: <ShoppingCart size={17} strokeWidth={1.75} /> },
        { to: '/invoices', label: 'الفواتير', icon: <ReceiptText size={17} strokeWidth={1.75} /> },
        { to: '/returns', label: 'المرتجعات', icon: <Undo2 size={17} strokeWidth={1.75} /> },
      ],
    },
    {
      title: 'المال',
      items: [
        { to: '/wallets', label: 'المحافظ', icon: <Wallet size={17} strokeWidth={1.75} /> },
        { to: '/withdrawals', label: 'طلبات السحب', icon: <Banknote size={17} strokeWidth={1.75} />, badge: badges?.withdrawals },
        { to: '/credit', label: 'الكريديت', icon: <CreditCard size={17} strokeWidth={1.75} /> },
        { to: '/discounts', label: 'الخصومات', icon: <BadgePercent size={17} strokeWidth={1.75} /> },
        { to: '/delivery-fees', label: 'رسوم التوصيل', icon: <Truck size={17} strokeWidth={1.75} /> },
      ],
    },
    {
      title: 'النظام',
      items: [
        { to: '/support', label: 'الدعم الفني', icon: <Headset size={17} strokeWidth={1.75} />, badge: badges?.tickets },
        { to: '/notifications', label: 'الإشعارات', icon: <Bell size={17} strokeWidth={1.75} /> },
        { to: '/settings', label: 'الإعدادات', icon: <Settings size={17} strokeWidth={1.75} /> },
        { to: '/audit', label: 'سجل التدقيق', icon: <ScrollText size={17} strokeWidth={1.75} /> },
      ],
    },
  ];

  const initials = (admin.full_name || 'أ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('');

  return (
    <div className="flex min-h-dvh bg-surface">
      <aside className="sticky top-0 z-20 flex h-dvh w-[272px] shrink-0 flex-col overflow-hidden border-s border-white/5 bg-primary">
        {/* Brand */}
        <div className="shrink-0 px-4 pt-5 pb-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-3 ring-1 ring-white/10">
            <img
              src="/brand-mark.png"
              alt="Build Store"
              className="size-10 shrink-0 rounded-xl bg-white object-contain p-1 shadow-[0_8px_20px_-10px_rgba(245,133,31,0.95)] ring-1 ring-white/15"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-white">Build Store</div>
              <div className="truncate text-[11px] text-white/45">لوحة تحكم الإدارة</div>
            </div>
          </div>
        </div>

        {/* Nav — scrollbar مخفي بالكامل */}
        <nav className="sidebar-scroll min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pb-3">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">
                {g.title}
              </div>
              <div className="space-y-0.5">
                {g.items.map((it) => (
                  <NavItem key={it.to} item={it} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer داخل حدود السايدبار بالكامل */}
        <div className="shrink-0 space-y-2 border-t border-white/10 bg-[#122236] p-3">
          <NavLink
            to="/account"
            className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-2.5 py-2 ring-1 ring-white/8 transition-colors hover:bg-white/[0.1]"
            title="حسابي وكلمة المرور"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/20 text-xs font-bold text-accent">
              {initials || 'أ'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-white">{admin.full_name}</div>
              <div className="truncate text-[11px] text-white/45" dir="ltr">
                {admin.email}
              </div>
            </div>
            <ChevronLeft size={14} className="shrink-0 text-white/35" />
          </NavLink>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] font-medium text-white/70 transition-colors hover:border-danger/40 hover:bg-danger/15 hover:text-white"
            title="تسجيل الخروج"
          >
            <LogOut size={15} strokeWidth={1.75} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
