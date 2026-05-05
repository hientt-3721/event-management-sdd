import { cn } from '@/lib/utils'

interface BentoGridProps {
  children: React.ReactNode
  className?: string
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        'grid-cols-1',
        'sm:grid-cols-2',
        'lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  )
}
