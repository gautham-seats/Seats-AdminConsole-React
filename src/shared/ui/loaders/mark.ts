type Point = readonly [number, number]
type Leaf = { a: Point; b: Point; sagitta: number }

// Leaves traced from Seats.Trunk.Admin/images/SEAtS_Logo_square.png on a 100-unit circle of radius 46.
const LEAVES: readonly Leaf[] = [
  { a: [26.3, 30.65], b: [28.9, 70.85], sagitta: 10 },
  { a: [40.25, 15], b: [42.85, 55], sagitta: 9.8 },
  { a: [47.85, 55], b: [88.25, 52.35], sagitta: 10.4 },
  { a: [34.15, 70.85], b: [74.55, 68.05], sagitta: 10 },
]

const round = (value: number) => Number(value.toFixed(2))

export function leafPath({ a, b, sagitta }: Leaf): string {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = Math.hypot(dx, dy)
  const ux = dx / length
  const uy = dy / length
  const bulge = 1.333 * sagitta
  const at = (t: number, n: number) =>
    `${round(a[0] + ux * length * t + uy * n)} ${round(a[1] + uy * length * t - ux * n)}`
  return `M${at(0, 0)} C${at(0.2, bulge)} ${at(0.8, bulge)} ${at(1, 0)} Z`
}

export const LEAF_PATHS: readonly string[] = LEAVES.map(leafPath)

export function gearPath(cx: number, cy: number, teeth: number, outer: number, inner: number): string {
  const step = (Math.PI * 2) / teeth
  const top = 0.3
  const base = 0.52
  const at = (radius: number, angle: number) =>
    `${round(cx + radius * Math.cos(angle))} ${round(cy + radius * Math.sin(angle))}`
  let path = ''
  for (let tooth = 0; tooth < teeth; tooth++) {
    const centre = tooth * step + step / 2
    const nextBase = (tooth + 1) * step + step / 2 - (step * base) / 2
    path +=
      `${tooth === 0 ? 'M' : 'L'}${at(inner, centre - (step * base) / 2)} ` +
      `L${at(outer, centre - (step * top) / 2)} A${outer} ${outer} 0 0 1 ${at(outer, centre + (step * top) / 2)} ` +
      `L${at(inner, centre + (step * base) / 2)} A${inner} ${inner} 0 0 1 ${at(inner, nextBase)} `
  }
  return `${path}Z`
}

export const WAVE_PATH =
  'M-50 0 Q-37.5 -4 -25 0 T0 0 T25 0 T50 0 T75 0 T100 0 T125 0 T150 0 T175 0 T200 0 V140 H-50 Z'
