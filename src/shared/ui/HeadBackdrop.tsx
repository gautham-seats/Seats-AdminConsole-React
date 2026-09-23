// The nav bar's colour on every header cell. A *vertical* gradient paints identically in each cell, so
// columns never show a seam, and every header keeps its colour however far the table is scrolled.
// (An absolutely positioned strip one container wide used to do this: it left the columns past the
// first screen with white text on white, and it stretched the scroll area — see RB-004.)
// The band, from tokens.css: one recipe for card, table and dialog headers.
const HEAD_FILL = 'nav-band-cell'

export const HEAD_CELL = `sticky top-0 z-10 h-10 ${HEAD_FILL} px-3 text-left align-middle text-[12.5px] font-bold tracking-[0.01em] whitespace-nowrap text-white transition-shadow duration-300`

export { HEAD_FILL }

// Curves the outer corners of the header row; put on the <table>.
export const HEAD_ROUND = '[&_thead_th:first-child]:rounded-tl-lg [&_thead_th:last-child]:rounded-tr-lg'
