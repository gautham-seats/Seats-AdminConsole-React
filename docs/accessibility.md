# Accessibility and UX requirements for the React rewrite

Source: a WCAG 2.1 AA / 2.2 AA audit (axe-core scan plus manual verification) of the Angular
application, with related UX and form-validation defects found in the same cycle. Every issue below
was found, reproduced and in most cases already fixed in Angular. Received from the accessibility
team on 2026-09-15.

Purpose: stop each of these being rebuilt in React. This is a build-time reference, not a
post-build audit. the project conventions carry the enforceable rules; this file carries the evidence, the
root causes and the test code.

Each finding gives: what went wrong, the WCAG criterion, why it happened, the build requirement,
acceptance criteria and test cases. Treat every acceptance block as a required Definition of Done
item for the relevant component.

---

## 1. Accessible names on interactive controls

### 1.1 Icon-only buttons must have an accessible name

**What went wrong:** dialog close buttons (icon-only `×`) had no `aria-label`, no visible text and
no `title`. Screen reader users heard only "button". Confirmed on two independent modals sharing
the same close-button component, so it was a shared-component defect, not a one-off.

**WCAG:** 4.1.2 Name, Role, Value (A)

**Why it happened:** the component relied on a visual icon plus a CSS hover tooltip for sighted
mouse users, with nothing wired into the accessibility tree.

**Build requirement**

- Every icon-only interactive element (button, link, icon toggle) has an explicit `aria-label`,
  visually hidden text, or `aria-labelledby` pointing at adjacent text. A hover tooltip alone is
  never the accessible name.
- Build it into the shared icon-button component with `aria-label` **required at the TypeScript
  level**, so the build fails without it.

**Acceptance criteria**

- [ ] Every icon-only button has a non-empty accessible name.
- [ ] The shared icon button's props make the label mandatory.
- [ ] No usage in the codebase can omit it.

**Test cases**

- Automated (jest-axe): run `axe()` against every rendered dialog; assert zero `button-name`
  violations.
- Automated (RTL): `expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()`.
- Manual: Tab to the close button with NVDA or VoiceOver and confirm it announces "Close, button".

### 1.2 Form controls must expose an accessible name

**What went wrong:** a tag/chip-list input had no accessible name at all. Fixed by adding
`aria-label="Tags"` to the container.

**WCAG:** 3.3.2 Labels or Instructions (A), 4.1.2 Name, Role, Value (A)

**Build requirement**

- Every custom control (chip list, multi-select, custom date picker, rich-text editor) has a
  programmatically associated label: `<label htmlFor>`, `aria-label`, or `aria-labelledby`.
- A nearby visible heading is not "close enough". The association must be explicit.

**Acceptance criteria**

- [ ] Every custom control's accessible name is non-empty and describes its purpose, not its type.

**Test cases**

- Automated: axe `aria-input-field-name` and `label` rules against every form.
- Manual: Tab to each custom control; the screen reader announces a meaningful name before the
  value or state.

---

## 2. ARIA structure and semantic relationships

### 2.1 Do not break required parent/child ARIA roles

**What went wrong:** a `role="listbox"` container had its `role="option"` children nested one level
too deep inside a `<div role="presentation">` styling wrapper. That broke the required direct
parent/child relationship and raised a Critical `aria-required-children` violation. Fixed by
restructuring so options are direct children.

**WCAG:** 1.3.1 Info and Relationships (A)

**Why it happened:** a layout wrapper was added purely for CSS, without considering the ARIA
contract. `role="presentation"` on the wrapper does not reliably fix it — flattening support varies
across browsers and screen readers.

**Build requirement**

- Any ARIA composite widget (listbox, tablist, menu, grid, tree) must match the ARIA Authoring
  Practices Guide pattern exactly. Required-child roles are **direct** children, whatever CSS wants.
- If a wrapper is needed for layout, either apply the flex/grid styling to the role element itself,
  or use `display: contents` on the wrapper **and verify with axe that the check actually passes** —
  behaviour varies by browser and assistive technology.

**Acceptance criteria**

- [ ] For every composite widget, `element.children` (actual direct children, not
      `querySelectorAll`) of the role container are exactly the required child roles.
- [ ] Zero `aria-required-children` / `aria-required-parent` violations anywhere.

**Test cases**

- Automated: axe `aria-required-children` and `aria-required-parent` in CI on every page.
- Automated (unit): assert `container.querySelector('[role="listbox"]').children` are all
  `role="option"`, adjusted per widget type.
- Manual: inspect the DOM in DevTools; no wrapper `<div>` between container role and children.

### 2.2 Exactly one `<main>` per page, plus a skip link

**What went wrong:** a page carried two `role="main"` elements, and no "skip to main content" link
existed anywhere, so keyboard-only users had no fast way past the navigation.

**WCAG:** 2.4.1 Bypass Blocks (A)

**Build requirement**

- The app shell renders exactly one native `<main>` per route. Enforce it structurally: the layout
  owns the `<main>`; page components render inside it and never define their own.
- Add a visually hidden "Skip to main content" link as the first focusable element in the document.
  It becomes visible on focus and moves focus into `<main>` (or its first heading) when activated.

**Acceptance criteria**

- [ ] `document.querySelectorAll('main, [role="main"]').length === 1` on every route.
- [ ] The first Tab press on a fresh page load lands on a visible skip link.
- [ ] Activating it moves focus into the main content.

**Test cases**

- Automated (Playwright): on every route assert exactly one `main`; press Tab once from load and
  assert the focused element's text matches "Skip to main content".
- Manual: keyboard-only walkthrough of each page template.

---

## 3. Focus management

### 3.1 Hidden elements must not be keyboard-focusable

**What went wrong:** focus-trap boundary anchors were `aria-hidden="true"` but kept their natural
tab order, so a keyboard user could Tab onto an element that announces nothing and does nothing.
Fixed with `tabindex="-1"`, which removes them from the Tab sequence while the trap can still use
them.

**WCAG:** 4.1.2 (A); practical impact on 2.1.1 and 2.4.3

**Build requirement**

- Any `aria-hidden="true"` element must be non-focusable: `tabindex="-1"`, or naturally
  unfocusable (a plain `<div>` is fine; a `<button>` is not).
- With a focus-trap library (focus-trap-react, Radix's built-in trap), **verify** its sentinel
  elements are out of the tab order. Libraries differ.
- Add a lint or CI check that flags `aria-hidden="true"` without `tabindex="-1"`.

**Acceptance criteria**

- [ ] For every `[aria-hidden="true"]` in the rendered DOM, `element.tabIndex === -1`.
- [ ] Zero axe `aria-hidden-focus` violations.

**Test cases**

- Automated: `[...document.querySelectorAll('[aria-hidden="true"]')].every(el => el.tabIndex === -1)`
  against key pages, modals, dialogs and drawers.
- Automated: axe `aria-hidden-focus`.
- Manual: open every overlay and Tab through it fully; no invisible tab stop is ever reached.

### 3.2 Explicit focus-visible styling — never rely on browser defaults

**What went wrong:** a claim that no focus indicator existed anywhere produced conflicting results
across browsers before being resolved. The lesson stands regardless: focus visibility is
inconsistent when component CSS does anything nonstandard with `outline`, and "the browser will
handle it" is not safe.

**WCAG:** 2.4.7 Focus Visible (AA), 2.4.11 Focus Not Obscured (AA, WCAG 2.2)

**Build requirement**

- Every interactive element defines an intentional `:focus-visible` style in its own CSS. Never
  `outline: none` without a replacement ring, outline or border/background change meeting 3:1
  contrast (1.4.11).
- Do not depend on any browser's default ring. Define it so Chrome, Firefox, Safari and Edge match.
- Test focus visibility in more than one browser before a component is done.
- For 2.4.11, verify no sticky header, footer or overlay ever fully obscures the focused element
  while tabbing through a scroll region.

**Acceptance criteria**

- [ ] Every interactive element shows a visible focus indicator at 3:1 or better against adjacent
      colours, verified in at least two browsers.
- [ ] No component sets `outline: none` without a replacement in the same rule.

**Test cases**

- Automated (lint): stylelint rule flagging `outline: none` / `outline: 0` with no accompanying
  `:focus-visible` rule in the same file.
- Manual: Tab through every page template in Chrome and one other browser; a visible ring appears
  on every stop in both.
- Manual: with a sticky header present, confirm the focused element is never fully hidden behind it.

### 3.3 Tab order: visual or logical grouping, chosen deliberately

**What went wrong:** a filter panel's tab order visited all filter criteria before a separate group
of view controls, though the view controls sat partway through the first group visually. Raised as a
possible 1.3.2 violation and judged acceptable, because grouping by logical category is legitimate.
The requirement is that the order is not accidental.

**WCAG:** 1.3.2 Meaningful Sequence (A)

**Build requirement**

- For any panel or toolbar with multiple logical groups, decide up front whether tab order follows
  visual position or logical grouping, and make DOM order match that decision consistently.
- Tab order comes from DOM order, not from CSS `order` or grid placement. If elements are visually
  reflowed with CSS, re-check that tab order still makes sense.
- State the decision in a one-line comment in the component so a later change does not break it.

**Acceptance criteria**

- [ ] Tab order through a multi-group panel is either strictly visual or fully grouped by category,
      and which one is documented in the component.

**Test cases**

- Manual: Tab through every filter panel and toolbar; the order matches the documented intent.

---

## 4. Colour contrast

### 4.1 Check shared and global components first

**What went wrong:** the primary navigation bar's link labels failed the 4.5:1 minimum on
effectively every page, because the nav is shared. One theme change resolved the majority of all
contrast violations in the whole audit — the single highest-leverage fix found.

**WCAG:** 1.4.3 Contrast (Minimum) (AA)

**Build requirement**

- Verify contrast on shared and global components (nav, header, footer, global buttons) **before**
  building individual pages. One miss there multiplies across every page.
- Bake contrast-checked colour tokens into the design system so component authors pick from a
  pre-verified palette instead of choosing colours per component.
- Run an automated contrast check as part of the token build, not only at the end of development.

**Acceptance criteria**

- [ ] Every text/background pairing in the theme tokens is pre-verified at 4.5:1 (normal text) or
      3:1 (large text, 18pt+ / 14pt+ bold).
- [ ] Zero axe `color-contrast` violations on global nav, header and footer.

**Test cases**

- Automated: axe `color-contrast` on every page; any violation on a shared component is blocking.
- Automated: a script computing the contrast ratio of every defined token pair, failing the build
  when a default-state pairing is below threshold.

---

## 5. Responsive design, zoom and text spacing

### 5.1 Toolbars and headers must reflow, not overlap

**What went wrong:** at 320px viewport width, and separately at 200% browser zoom, toolbar controls
(icons, counters, chart legends) overlapped each other and adjacent table headers on multiple pages.
The data tables themselves reflowed acceptably — horizontal scroll on a data table is a permitted
WCAG technique. The defect was in toolbar and header rows using fixed or absolute positioning
instead of a wrapping layout.

**WCAG:** 1.4.4 Resize Text (AA), 1.4.10 Reflow (AA)

**Build requirement**

- Toolbar and header rows use a wrapping flex or responsive grid layout. Never fixed widths or
  absolute positioning that assumes a minimum viewport width.
- Test every toolbar-style component at 320px CSS width and 200% zoom as standard practice.
- Data tables may scroll horizontally at narrow widths. Non-tabular chrome must reflow instead.

**Acceptance criteria**

- [ ] No toolbar or header overlaps its own contents or adjacent elements at 320px or 200% zoom.

**Test cases**

- Automated (Playwright): viewport 320x568, screenshot every page template, and assert via
  bounding-box intersection that no two sibling toolbar elements overlap.
- Automated (Playwright): repeat at default viewport with zoom emulation at 200%.
- Manual: DevTools device toolbar at 320px, and browser zoom at 200%, on every page template.

### 5.2 Layouts must survive increased text spacing

**What went wrong:** applying the WCAG text-spacing values (line-height 1.5, letter-spacing 0.12em,
word-spacing 0.16em) made fixed-width label containers truncate — "Standard View" became
"Standard...".

**WCAG:** 1.4.12 Text Spacing (AA)

**Build requirement**

- Never combine a fixed pixel width with `overflow: hidden` / `text-overflow: ellipsis` on a label
  holding user-facing text of unpredictable length, unless the full text is reachable another way
  **and** the container has been tested with increased spacing.
- Prefer `min-width` plus flexible width over fixed width for label containers.
- Add the text-spacing override to the QA checklist for any component showing labels in constrained
  space.

**Acceptance criteria**

- [ ] No label or text container truncates when the WCAG text-spacing override is applied.

**Test cases**

- Automated (Playwright): inject
  `* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important }`
  and assert no label element has `scrollWidth > clientWidth`.
- Manual: apply the same override in DevTools on each page template.

---

## 6. Heading structure

### 6.1 Exactly one `<h1>` per page, no duplicate headings

**What went wrong:** zero heading elements existed on the majority of pages tested. One page that
had headings had two identical `<h2>` elements. No page anywhere used an `<h1>`.

**WCAG:** 2.4.6 Headings and Labels (AA); also undermines the heading-navigation alternative for
2.4.1

**Build requirement**

- Every route renders exactly one `<h1>` identifying the page's main content, for example
  "Student Profile: Amy Jordan". Make it a required pattern on the page-level layout component
  rather than something each page author must remember.
- Subheadings follow a non-skipping hierarchy, and heading text is unique within a page.
- Consider a test convention that fails a page's suite when it renders no `<h1>`.

**Acceptance criteria**

- [ ] Every route renders exactly one `<h1>`.
- [ ] Heading levels never skip going deeper within a content region.
- [ ] No two headings on a page have identical text.

**Test cases**

- Automated (E2E): for every route assert `document.querySelectorAll('h1').length === 1`.
- Automated: walk the headings in DOM order; each next level is the same, one deeper, or shallower.
- Manual: screen-reader heading navigation (NVDA "H", VoiceOver rotor) of each page template.

---

## 7. Large lists and performance-sensitive rendering

### 7.1 Virtualize any list that can exceed roughly 100 items

**What went wrong:** a student roster page rendered every enrolled student as live DOM regardless of
roster size. For a lecture with 1,450-6,001 students this produced tens of thousands of DOM nodes,
which made keyboard and screen-reader navigation impractical (a keyboard user had to Tab through
thousands of cards to get past the roster) and caused real performance failures, including the
browser tab becoming unresponsive.

Fixed with a virtual scroll viewport on the card layout, and a windowed table with custom row
recycling on the table layout (to preserve column alignment). Both approaches are valid; the
requirement is that **only visible items plus a small buffer exist in the DOM at any time**.

**WCAG:** 2.1.1 Keyboard (A), 2.4.3 Focus Order (A) — practical impact rather than one discrete rule

**Build requirement**

- Any list, grid or table that can realistically exceed roughly 100 items **must** be virtualized
  from day one. Do not build the non-virtualized version "for now" — retrofitting is expensive and
  easy to deprioritize.
- Libraries: `@tanstack/react-virtual`, `react-window`, or `react-virtualized`, depending on whether
  the layout is a simple list, a card grid, or a fixed-column table.
- With a component-library table, confirm row virtualization is supported rather than assuming it.
- Card and tile layouts recycle off-screen cards; verify by DOM node count, not by "it scrolls
  smoothly".

**Acceptance criteria**

- [ ] For N > ~100 items, the number of item DOM nodes at any scroll position is proportional to the
      viewport, not to N.
- [ ] After scrolling anywhere in the list, the item-node count stays small and roughly constant.

**Test cases**

- Automated (Playwright): seed 1,000+ items; assert the item selector count stays under a fixed
  threshold, for example 50, regardless of total.
- Automated: repeat after scrolling to the middle and the end, confirming recycling rather than
  initial-render limiting.
- Manual: with a large dataset, Tab through the list and confirm you reach content after the list
  in a reasonable number of presses.

---

## 8. Form validation and error messaging

These were not raised as WCAG tickets, but were found and fixed alongside the accessibility work.
They touch 3.3.1 and 3.3.3 in spirit and are core to a good rewrite regardless.

### 8.1 Validation errors must clear reactively as the user corrects them

**What went wrong:** several forms (a feedback dialog, three separate "Class ID" fields in different
Lectures flows) showed a validation error on submit and kept the message and red outline even after
the user typed a valid value. It only cleared on the next submit. Other parts of the app cleared
correctly on input, so the behaviour was inconsistent.

**Build requirement**

- Field-level validation state reacts to input changes, not only to submit. As soon as the input
  satisfies the rule, the error state and message clear immediately — no blur, no resubmit.
- Build it into the shared form-field or validation-hook layer so every form inherits it, rather
  than reimplementing per form.

**Acceptance criteria**

- [ ] For every validated field, typing a valid value clears the error without blur, resubmit or
      navigation.

**Test cases**

- Automated (RTL): submit empty, assert the message is present, type a valid value, assert it is
  removed without simulating a resubmit.
- Manual: repeat by hand on every form with field-level validation.

### 8.2 Multi-field validation: specific, conditional and complete

This one was implemented correctly in Angular and is the reference pattern. For a 4-field date/time
range (Start Date, Start Time, End Date, End Time):

- Each field shows its own specific message ("Select start date") if the user focuses it and leaves
  it empty — not a generic "This field is required".
- If all four are filled but the range is invalid, a single message appears below all four: "End
  date must be after the start date". It appears only once all fields are filled and the range is
  actually invalid, never prematurely.
- The same-day time check ("End time must be after the start time") follows the identical pattern.
- While the range-level error shows, all four related fields are highlighted, not just one.

**Build requirement**

Follow this exact pattern for any interdependent validation (date ranges, time ranges, min/max
pairs):

1. per-field messages for per-field problems;
2. one specific combined message for the cross-field problem, shown only once all relevant fields
   have values;
3. highlight every field involved, not one chosen arbitrarily;
4. message text states the actual rule ("X must be after Y"), never "Invalid" or "Invalid Range".

**Acceptance criteria**

- [ ] Every validated field shows a field-specific message on blur-when-empty.
- [ ] Cross-field messages appear only after all relevant fields are filled and name the real rule.
- [ ] All fields in a cross-field error are flagged together.

**Test cases**

- Automated (RTL): focus and blur each field while empty; assert the exact expected message.
- Automated (RTL): fill all fields with an invalid range; assert the combined message with exact
  wording, and that it does not appear while any field is still empty.
- Manual: replicate the date-range scenario end to end as a smoke test for any new interdependent
  form.

---

## 9. Testing methodology: findings that were not bugs

Included so the same false leads are not chased again.

- **"No focus indicator anywhere"** — an automated `getComputedStyle` check on outline, box-shadow
  and background reported nothing visible, but manual testing across browsers found a visible
  highlight. The visible style came from a property or mechanism the check did not account for.
  **Lesson:** cross-check any automated "no visible style" finding manually, in more than one
  browser, before treating it as confirmed.
- **"Illogical tab order"** — flagged for grouping by category rather than visual position; judged
  an acceptable design choice. See 3.3 for the actual rule.
- **"Carousel arrows under minimum target size"** — measured as 10x10px; a direct
  `getBoundingClientRect()` on the actual `<button>` (not the inner `<svg>`) showed 88x78px.
  **Lesson:** measure the real interactive element, not an inner icon or whatever the selector
  matched first.

**Build requirement:** when writing automated accessibility checks, pair every DOM or computed-style
assertion with a manual cross-browser spot-check, and be precise about which exact element a
measurement applies to.

---

## 10. Consolidated Definition of Done

Apply to every new component and page:

- [ ] Every icon-only interactive element has a required, non-empty accessible name.
- [ ] Every composite ARIA widget matches the APG pattern exactly, with no wrapper between required
      parent and child roles.
- [ ] Exactly one `<main>` per page; a working skip link exists app-wide.
- [ ] Every `aria-hidden="true"` element has `tabindex="-1"` or is naturally non-focusable.
- [ ] Every interactive element has an explicit, cross-browser-tested `:focus-visible` style.
- [ ] Tab order through any multi-group layout is intentional and documented.
- [ ] All colour pairings meet 4.5:1 (normal text) and 3:1 (large text, non-text UI), via
      pre-checked tokens.
- [ ] Every toolbar and header reflows without overlap at 320px and 200% zoom.
- [ ] Every text label survives the WCAG text-spacing override without truncating.
- [ ] Every page has exactly one `<h1>`; hierarchy never skips; no duplicate heading text.
- [ ] Any list, grid or table that can exceed ~100 items is virtualized from the first commit.
- [ ] Field validation clears reactively on valid input.
- [ ] Cross-field validation follows the per-field-then-combined pattern with specific wording.

---

## 11. Recommended tooling

- **axe-core** — `jest-axe` for component tests, `@axe-core/playwright` for E2E, wired into CI and
  failing the build on any violation rather than run by hand before a release.
- **eslint-plugin-jsx-a11y** — recommended or strict rule set, enabled from day one.
- **stylelint** — flag `outline: none` / `outline: 0` without a focus-visible replacement.
- **Design-token contrast script** — a small script using the WCAG contrast formula, run against the
  theme file in CI.
- **Playwright** — viewport, zoom, text-spacing and virtualization checks; these depend on real
  layout and cannot be caught by unit tests alone.
- **A large-dataset fixture** — 1,000+ rows or cards, checked into the test suite for virtualization
  regression.
