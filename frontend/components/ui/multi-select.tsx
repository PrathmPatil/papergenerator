'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { ChevronDownIcon, CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Option = {
  value: string
  label: string
}

type MultiSelectProps = {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options',
  disabled,
  className,
}: MultiSelectProps) {
  const toggleValue = (val: string) => {
    onChange(
      value.includes(val)
        ? value.filter(v => v !== val)
        : [...value, val]
    )
  }

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "border-input flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className="truncate text-muted-foreground">
            {value.length
              ? `${value.length} selected`
              : placeholder}
          </span>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover p-1 shadow-md"
        >
          <div className="max-h-60 overflow-auto">
            {options.map(opt => {
              const checked = value.includes(opt.value)
              return (
                <div
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent`}
                  onClick={() => toggleValue(opt.value)}
                >
                  <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${checked ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border'}`}>
                    {checked && <CheckIcon className="h-3 w-3" />}
                  </div>
                  <span>{opt.label}</span>
                </div>
              )
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
