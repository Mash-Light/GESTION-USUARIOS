import * as React from 'react'
import { cn } from '../../lib/utils'

export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(function Table({ className, ...props }, ref) {
  return <div className="w-full overflow-auto"><table className={cn('w-full caption-bottom text-sm', className)} ref={ref} {...props} /></div>
})
export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className={cn('border-b', className)} {...props} />
export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => <tr className={cn('border-b transition-colors hover:bg-slate-50/80', className)} {...props} />
export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className={cn('h-11 px-3 text-left align-middle text-xs font-semibold text-muted', className)} {...props} />
export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn('p-3 align-middle', className)} {...props} />
