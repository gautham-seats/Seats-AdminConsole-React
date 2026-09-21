// bootstrap3-typeahead.js:175-195: next and prev wrap around the menu.
export function stepIndex(index: number, step: 1 | -1, length: number): number {
  if (length <= 0) return 0
  return (((index + step) % length) + length) % length
}
