'use client'

import { forwardRef } from 'react'
import { Button, type ButtonProps } from './Button'

// Icon-only button: the type makes a non-empty accessible name mandatory.
export type IconButtonProps = Omit<ButtonProps, 'size' | 'aria-label'> & { 'aria-label': string }

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>((props, ref) => (
  <Button ref={ref} size="icon" {...props} />
))
IconButton.displayName = 'IconButton'
