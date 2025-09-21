import * as React from 'react'

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className = '', children, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={`w-full caption-bottom text-sm ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  )
)

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className = '', children, ...props }, ref) => (
    <thead ref={ref} className={`[&_tr]:border-b ${className}`} {...props}>
      {children}
    </thead>
  )
)

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className = '', children, ...props }, ref) => (
    <tbody
      ref={ref}
      className={`[&_tr:last-child]:border-0 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  )
)

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className = '', children, ...props }, ref) => (
    <tr
      ref={ref}
      className={`border-b border-slate-200 transition-colors hover:bg-slate-50 data-[state=selected]:bg-slate-100 ${className}`}
      {...props}
    >
      {children}
    </tr>
  )
)

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className = '', children, ...props }, ref) => (
    <th
      ref={ref}
      className={`h-12 px-4 text-left align-middle font-semibold text-slate-600 bg-slate-50 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    >
      {children}
    </th>
  )
)

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className = '', children, ...props }, ref) => (
    <td
      ref={ref}
      className={`p-4 align-middle font-medium text-slate-700 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    >
      {children}
    </td>
  )
)

Table.displayName = 'Table'
TableHeader.displayName = 'TableHeader'
TableBody.displayName = 'TableBody'
TableRow.displayName = 'TableRow'
TableHead.displayName = 'TableHead'
TableCell.displayName = 'TableCell'

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
}