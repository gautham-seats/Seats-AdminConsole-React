'use client'

import Image from 'next/image'
import { ImageUp, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'

type LogoFieldProps = {
  id: string
  label: string
  fileName: string
  previewUrl: string
  isNew: boolean
  disabled: boolean
  text: {
    browse: string
    drop: string
    newLogo: string
    currentLogo: string
    noLogo: string
    remove: string
  }
  onPick: (file: File) => void
  onRemove: () => void
}

export function LogoField({
  id,
  label,
  fileName,
  previewUrl,
  isNew,
  disabled,
  text,
  onPick,
  onRemove,
}: LogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const pick = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onPick(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onDragOver={event => {
        if (disabled) return
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={event => {
        event.preventDefault()
        setOver(false)
        if (!disabled) pick(event.dataTransfer.files)
      }}
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-input bg-page/60 p-3 transition-[border-color,background-color] duration-200',
        over && 'border-brand bg-brand/[0.05]',
        disabled && 'opacity-60',
      )}
    >
      <div className="grid h-14 w-28 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-white">
        {previewUrl ? (
          <Image
            key={previewUrl}
            src={previewUrl}
            alt=""
            width={96}
            height={48}
            unoptimized
            className="max-h-12 w-auto max-w-24 animate-zoom-in object-contain motion-reduce:animate-none"
          />
        ) : (
          <ImageUp aria-hidden className="size-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={fileName || undefined}>
          {fileName || text.noLogo}
        </p>
        <p className={cn('text-xs', isNew ? 'text-brand' : 'text-muted-foreground')}>
          {isNew ? text.newLogo : fileName ? text.currentLogo : text.drop}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          aria-label={label}
          tabIndex={-1}
          disabled={disabled}
          onChange={event => pick(event.target.files)}
          className="sr-only"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="bg-white"
        >
          {text.browse}
        </Button>
        {isNew ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={text.remove}
            title={text.remove}
            className="size-9 text-muted-foreground"
          >
            <X aria-hidden className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
