/**
 * The owl — Precogly's single, product-wide "AI lives here" mark.
 *
 * Every AI affordance in the app uses this one glyph so users learn the
 * association once and recognise it everywhere (suggest threats today; import
 * from sketch, summarise, etc. later). lucide-react ships no owl, so it is a
 * hand-drawn SVG that follows lucide's conventions — 24x24 box, `currentColor`
 * stroke, round caps/joins — and therefore inherits text colour and sizes via
 * the same `className` utilities (`h-4 w-4`, …) as every other icon.
 *
 * An owl head tuned for legibility: two ear tufts, two big close-set eyes that
 * dominate a small head, and a central beak — the cues that read as "owl" even
 * at 16px, where a full-body silhouette collapsed into a blob.
 */

import type { SVGProps } from 'react'

export function OwlMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Small head with two ear tufts */}
      <path d="M12 19C7.6 19 4.6 15.8 4.6 12 4.6 9.8 5.5 8 7.1 7.1L6.6 4.3 9.3 6.4C10.1 6.2 11 6.1 12 6.1 13 6.1 13.9 6.2 14.7 6.4L17.4 4.3 16.9 7.1C18.5 8 19.4 9.8 19.4 12 19.4 15.8 16.4 19 12 19Z" />
      {/* Two big close-set eyes */}
      <circle cx="8.8" cy="10.9" r="2.8" />
      <circle cx="15.2" cy="10.9" r="2.8" />
      <circle cx="8.8" cy="10.9" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="15.2" cy="10.9" r="0.85" fill="currentColor" stroke="none" />
      {/* Central beak */}
      <path d="M10.5 14.2 12 16.4 13.5 14.2Z" fill="currentColor" stroke="none" />
    </svg>
  )
}
