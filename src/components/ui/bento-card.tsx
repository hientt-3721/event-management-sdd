import { cn } from '@/lib/utils'

type ColSpan = 1 | 2 | 3 | 4
type RowSpan = 1 | 2

interface BentoCardProps {
  children: React.ReactNode
  className?: string
  colSpan?: ColSpan
  rowSpan?: RowSpan
}

const colSpanClasses: Record<ColSpan, string> = {
  1: 'col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-2 lg:col-span-3',
  4: 'col-span-1 sm:col-span-2 lg:col-span-4',
}

const rowSpanClasses: Record<RowSpan, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
}

export function BentoCard({ children, className, colSpan = 1, rowSpan = 1 }: BentoCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm',
        'hover:shadow-md transition-shadow duration-200',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {children}
    </div>
  )
}
