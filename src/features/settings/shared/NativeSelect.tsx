import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/shared/ui/cn'

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative w-full', className)}>
      <select
        {...props}
        className="field-bloom peer h-9 w-full cursor-pointer appearance-none rounded-md border border-input bg-white pr-9 pl-3 text-sm shadow-sm transition-[border-color,box-shadow] outline-none hover:border-brand/80 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500 transition-transform duration-200 peer-focus-visible:rotate-180 peer-focus-visible:text-brand"
      />
    </div>
  )
}
