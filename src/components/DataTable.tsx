// جدول عام: أعمدة معرّفة + ترقيم صفحات range() + حالات تحميل/خطأ/فراغ موحّدة.
import type { ReactNode } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Card, Spinner, EmptyState, ErrorState } from './ui';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export const PAGE_SIZE = 25;

export function DataTable<T>({ columns, rows, loading, error, onRetry, page, hasMore, onPage, onRowClick, emptyTitle }: {
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary text-white">
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 text-start font-medium whitespace-nowrap ${c.className ?? ''}`}>
                    {c.header}
                  </th>
                ))}
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
                    <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
