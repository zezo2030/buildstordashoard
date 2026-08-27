// جدول عام: أعمدة معرّفة + ترقيم صفحات range() + حالات تحميل/خطأ/فراغ موحّدة.
// الفرز اختياري: العمود اللي ليه sortKey بيبقى عنوانه زرار، والفرز نفسه بيتم
// في الداتابيز — الجدول بيبلّغ بالمفتاح بس.
// table-fixed + لفّ النص بدل overflow-x عشان الجدول ياخد عرض الصفحة كامل
// وكل الخلايا ظاهرة من غير سكرول أفقي.
import type { ReactNode } from 'react';
import { ChevronRight, ChevronLeft, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, Spinner, EmptyState, ErrorState } from './ui';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  sortKey?: string;
};

export const PAGE_SIZE = 25;

export function DataTable<T>({
  columns, rows, loading, error, onRetry, page, hasMore, onPage, onRowClick, emptyTitle,
  sort, dir, onSort,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  page?: number;
  hasMore?: boolean;
  onPage?: (p: number) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <table className="w-full table-fixed text-[13px]">
          <thead>
            <tr className="bg-primary text-white">
              {columns.map((c) => {
                const sortable = !!c.sortKey && !!onSort;
                const active = sortable && sort === c.sortKey;
                const ariaSort = active && dir ? (dir === 'asc' ? 'ascending' : 'descending') : undefined;
                return (
                  <th
                    key={c.key}
                    aria-sort={ariaSort}
                    className={`px-2 py-2 text-start text-[12px] font-medium leading-snug ${c.className ?? ''}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.sortKey as string)}
                        className="inline-flex max-w-full items-start gap-0.5 rounded text-start transition-opacity hover:opacity-80"
                      >
                        <span>{c.header}</span>
                        {active ? (
                          dir === 'asc' ? <ChevronUp size={12} className="mt-0.5 shrink-0" /> : <ChevronDown size={12} className="mt-0.5 shrink-0" />
                        ) : (
                          <ChevronsUpDown size={12} className="mt-0.5 shrink-0 opacity-40" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-t border-line ${onRowClick ? 'cursor-pointer hover:bg-surface' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`wrap-anywhere px-2 py-2 align-top leading-snug ${c.className ?? ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {onPage !== undefined && page !== undefined && !loading && !error && (page > 0 || hasMore) && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-sm text-subtext">
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-surface disabled:opacity-40"
            disabled={page === 0}
            onClick={() => onPage(page - 1)}
          >
            <ChevronRight size={15} /> السابق
          </button>
          <span>صفحة {page + 1}</span>
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-surface disabled:opacity-40"
            disabled={!hasMore}
            onClick={() => onPage(page + 1)}
          >
            التالي <ChevronLeft size={15} />
          </button>
        </div>
      )}
    </Card>
  );
}
