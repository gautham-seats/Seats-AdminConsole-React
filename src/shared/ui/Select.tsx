'use client'

import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from './cn'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = forwardRef<
  ComponentRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'field-bloom flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:min-w-0 [&>span]:truncate',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronsUpDown aria-hidden className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

export const SelectContent = forwardRef<
  ComponentRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] origin-[var(--radix-select-content-transform-origin)] overflow-hidden rounded-lg border border-slate-200/80 bg-popover text-popover-foreground shadow-float data-[state=open]:animate-[picker-in_380ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none',
        '[&_[role=option]]:animate-item-in motion-reduce:[&_[role=option]]:animate-none [&_[role=option]:nth-child(2)]:[animation-delay:30ms] [&_[role=option]:nth-child(3)]:[animation-delay:60ms] [&_[role=option]:nth-child(4)]:[animation-delay:90ms] [&_[role=option]:nth-child(5)]:[animation-delay:120ms] [&_[role=option]:nth-child(6)]:[animation-delay:150ms] [&_[role=option]:nth-child(n+7)]:[animation-delay:180ms]',
        position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = 'SelectContent'

export const SelectItem = forwardRef<
  ComponentRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-2 pr-8 text-sm outline-none transition-[background-color,color,padding,box-shadow] duration-150 ease-premium focus:bg-brand/[.07] focus:pl-2.5 focus:text-foreground focus:shadow-[inset_3px_0_0_var(--color-brand)] data-[state=checked]:font-medium data-[state=checked]:text-brand data-[disabled]:pointer-events-none data-[disabled]:opacity-50 motion-reduce:transition-none',
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check
          aria-hidden
          className="h-4 w-4 animate-[badge-in_220ms_cubic-bezier(0.3,1.6,0.5,1)_both] motion-reduce:animate-none"
        />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'
