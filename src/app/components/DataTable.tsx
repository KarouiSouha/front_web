import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Download, FileText, FileSpreadsheet, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportToCSV } from '../lib/utils';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

/** Pass this prop to delegate filtering and pagination to the server. */
interface ServerPagination {
  /** Total number of rows across all pages (from API `count`). */
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSearch?: (query: string) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  exportable?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  /** Optional per-row background. Receives the row and its 0-based index in the
   *  full filtered dataset (i.e. global position, not page-local). */
  getRowStyle?: (row: T, globalIndex: number) => React.CSSProperties;
  /** When provided, filtering and pagination are handled server-side. */
  serverPagination?: ServerPagination;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  exportable = true,
  pageSize = 10,
  emptyMessage = 'No data available',
  getRowStyle,
  serverPagination,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const isServer = !!serverPagination;

  // When server-paginated, data is already the current page; skip client filtering.
  const filteredData = isServer || !searchQuery
    ? data
    : data.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );

  // Effective pagination values
  const effectivePage     = isServer ? serverPagination!.page     : currentPage;
  const effectivePageSize = isServer ? serverPagination!.pageSize : pageSize;
  const totalItems        = isServer ? serverPagination!.totalCount : filteredData.length;
  const totalPages        = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const startIndex        = (effectivePage - 1) * effectivePageSize;
  const endIndex          = startIndex + effectivePageSize;
  const paginatedData     = isServer ? data : filteredData.slice(startIndex, endIndex);

  function changePage(newPage: number) {
    if (isServer) serverPagination!.onPageChange(newPage);
    else setCurrentPage(newPage);
  }

  function changeSearch(q: string) {
    setSearchQuery(q);
    if (isServer) serverPagination!.onSearch?.(q);
    else setCurrentPage(1);
  }

  const handleExport = (_format: 'csv' | 'excel') => {
    const exportData = filteredData.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => {
        obj[col.label] = row[col.key];
      });
      return obj;
    });

    exportToCSV(exportData, `export-${Date.now()}`);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {searchable && (
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => changeSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {exportable && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
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
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rowIndex) => {
                  const globalIndex = startIndex + rowIndex;
                  const rowStyle = getRowStyle ? getRowStyle(row, globalIndex) : undefined;
                  return (
                    <TableRow
                      key={rowIndex}
                      className={getRowStyle ? 'transition-opacity hover:opacity-80' : 'hover:bg-muted/50'}
                      style={rowStyle}
                    >
                      {columns.map((column) => (
                        <TableCell key={column.key}>
                          {column.render ? column.render(row) : row[column.key]}
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
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{' '}
            {totalItems} results
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
