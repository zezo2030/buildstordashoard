// طلبات المواد — اقتراحات البائعين للكتالوج (`product_submissions`).
//
// تاب «طلبات المشترين» اتشال: طلب المشتري في `product_requests` بيتبعت لشركة
// بائع معيّنة (`company_id`) مش للمنصة، فالأدمن مالوش قرار فيه أصلاً. الجدول
// نفسه سايب في القاعدة والتطبيق لسه بيكتب فيه — اللي اتشال هو شاشة الأدمن بس.
import { PageHeader } from '../components/ui';
import { SellerSubmissionsPanel } from './SellerSubmissionsPanel';

export default function ProductRequests() {
  return (
    <div>
      <PageHeader
        title="طلبات المواد"
        subtitle="اقتراحات البائعين لإضافة مواد جديدة للكتالوج"
      />
      <SellerSubmissionsPanel />
    </div>
  );
}
