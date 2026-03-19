import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Column<T> accepts any T — callers pass typed rows (ChurnPrediction, SmartAlert, etc.)
interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface ServerPagination {
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSearch?: (query: string) => void;
}

// T is unconstrained — removing `extends Record<string, unknown>` fixes the
// "index signature missing" error when passing ChurnPrediction[], SmartAlert[], etc.
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;   // kept for API compatibility — search is handled by parent
  exportable?: boolean;   // kept for API compatibility — export buttons removed
  pageSize?: number;
  emptyMessage?: string;
  getRowStyle?: (row: T, globalIndex: number) => React.CSSProperties;
  serverPagination?: ServerPagination;
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 10,
  emptyMessage = 'No data available',
  getRowStyle,
  serverPagination,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const isServer          = !!serverPagination;
  const effectivePage     = isServer ? serverPagination!.page     : currentPage;
  const effectivePageSize = isServer ? serverPagination!.pageSize : pageSize;
  const totalItems        = isServer ? serverPagination!.totalCount : data.length;
  const totalPages        = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const startIndex        = (effectivePage - 1) * effectivePageSize;
  const endIndex          = startIndex + effectivePageSize;
  const paginatedData     = isServer ? data : data.slice(startIndex, endIndex);

  function changePage(newPage: number) {
    if (isServer) serverPagination!.onPageChange(newPage);
    else setCurrentPage(newPage);
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {columns.map((column) => (
                  <TableHead key={column.key} className="font-semibold">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rowIndex) => {
                  const globalIndex = startIndex + rowIndex;
                  const rowStyle    = getRowStyle ? getRowStyle(row, globalIndex) : undefined;
                  return (
                    <TableRow
                      key={rowIndex}
                      className={
                        getRowStyle
                          ? 'transition-opacity hover:opacity-80'
                          : 'hover:bg-muted/50'
                      }
                      style={rowStyle}
                    >
                      {columns.map((column) => (
                        <TableCell key={column.key}>
                          {column.render
                            ? column.render(row)
                            : String((row as Record<string, unknown>)[column.key] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(Math.max(1, effectivePage - 1))}
              disabled={effectivePage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {effectivePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(Math.min(totalPages, effectivePage + 1))}
              disabled={effectivePage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}