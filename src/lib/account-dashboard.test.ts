import { describe, expect, it } from 'vitest';
import {
  MINI_ROWS,
  parseBuyerDashboard,
  parseSellerDashboard,
  toPieSlices,
  topRows,
} from './account-dashboard';

describe('toPieSlices', () => {
  it('يرتب تنازليًا ويحتفظ بأكبر خمس شرائح', () => {
    const slices = toPieSlices(
      [
        { key: 'a', label: 'أ', value: 10 },
        { key: 'b', label: 'ب', value: 40 },
        { key: 'c', label: 'ج', value: 20 },
      ],
      'آخرون',
    );
    expect(slices.map((s) => s.key)).toEqual(['b', 'c', 'a']);
    expect(slices[0]?.value).toBe(40);
  });

  it('يجمع الباقي في شريحة آخرون بعد خمس شرائح', () => {
    const slices = toPieSlices(
      [
        { key: '1', label: '1', value: 60 },
        { key: '2', label: '2', value: 50 },
        { key: '3', label: '3', value: 40 },
        { key: '4', label: '4', value: 30 },
        { key: '5', label: '5', value: 20 },
        { key: '6', label: '6', value: 7 },
        { key: '7', label: '7', value: 3 },
      ],
      'آخرون',
    );
    expect(slices).toHaveLength(6);
    expect(slices[5]).toMatchObject({ key: '__other__', label: 'آخرون', value: 10 });
  });

  it('يتجاهل القيم صفر والسالب', () => {
    expect(toPieSlices(
      [
        { key: 'z', label: 'صفر', value: 0 },
        { key: 'n', label: 'سالب', value: -4 },
        { key: 'ok', label: 'تمام', value: 8 },
      ],
      'آخرون',
    ).map((s) => s.key)).toEqual(['ok']);
  });
});

describe('topRows', () => {
  it('يقصّ للعرض المصغّر ويسيب الأصل زي ما هو', () => {
    const rows = [1, 2, 3, 4, 5];
    expect(topRows(rows)).toHaveLength(MINI_ROWS);
    expect(rows).toHaveLength(5);
  });

  it('يرجّع اللي موجود لو أقل من الحد', () => {
    expect(topRows([1])).toEqual([1]);
  });
});

describe('parseSellerDashboard', () => {
  it('يحوّل مبالغ النص ويسيب كل الصفوف للمودال', () => {
    const d = parseSellerDashboard({
      total_sales: '12.500',
      orders_count: 4,
      products_sold: 2,
      customers_count: 3,
      listed_items: 9,
      specialties: [{ id: 's1', name: 'أسمنت', total: '100.000' }],
      customers: [{ key: 'c1', label: 'مقاول', total: '50.000' }],
      products: [
        { id: 'p1', name: 'أ', image_url: null, qty: '10.000', unit: 'كيس', total: '1' },
        { id: 'p2', name: 'ب', image_url: null, qty: 2, unit: 'كيس', total: 2 },
        { id: 'p3', name: 'ج', image_url: null, qty: 3, unit: 'كيس', total: 3 },
        { id: 'p4', name: 'د', image_url: null, qty: 4, unit: 'كيس', total: 4 },
      ],
      sites: [{ id: 'site', name: 'موقع 1', note: 'شركة', total: '8.000' }],
    });
    expect(d.totalSales).toBe(12.5);
    expect(d.ordersCount).toBe(4);
    expect(d.listedItems).toBe(9);
    expect(d.specialties).toEqual([{ id: 's1', name: 'أسمنت', total: 100 }]);
    expect(d.products).toHaveLength(4);
    expect(d.products[0]?.qty).toBe(10);
    expect(d.sites[0]).toMatchObject({ name: 'موقع 1', note: 'شركة', total: 8 });
  });

  it('يرجّع أصفار ومصفوفات فاضية للحمولة الفاضية', () => {
    const d = parseSellerDashboard(null);
    expect(d.totalSales).toBe(0);
    expect(d.ordersCount).toBe(0);
    expect(d.products).toEqual([]);
    expect(d.specialties).toEqual([]);
  });
});

describe('parseBuyerDashboard', () => {
  it('يحوّل مؤشرات المشتري من snake_case', () => {
    const d = parseBuyerDashboard({
      total_purchases: '200.000',
      orders_count: 5,
      items_count: 12,
      suppliers_count: 2,
      sites_count: 3,
      specialties: [],
      products: [{ id: 'p1', name: 'حديد', image_url: null, qty: 1, unit: 'طن', total: '9' }],
      suppliers: [{ id: 'sel', name: 'بائع', image_url: null, total: '9' }],
      sites: [],
    });
    expect(d.totalPurchases).toBe(200);
    expect(d.ordersCount).toBe(5);
    expect(d.itemsCount).toBe(12);
    expect(d.suppliersCount).toBe(2);
    expect(d.sitesCount).toBe(3);
    expect(d.products[0]?.name).toBe('حديد');
    expect(d.suppliers[0]?.total).toBe(9);
  });
});
