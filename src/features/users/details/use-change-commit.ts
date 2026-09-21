import { useRef, type FocusEvent } from 'react'

type Handlers = {
  onFocus: (event: FocusEvent<HTMLInputElement>) => void
  onBlur: (event: FocusEvent<HTMLInputElement>) => void
}

// knockout value binding writes on the change event: blur with text different from the text at focus.
export function useChangeCommit(): (onCommit: () => void) => Handlers {
  const focusText = useRef('')
  return onCommit => ({
    onFocus: event => {
      focusText.current = event.currentTarget.value
    },
    onBlur: event => {
      if (event.currentTarget.value !== focusText.current) onCommit()
    },
  })
}
