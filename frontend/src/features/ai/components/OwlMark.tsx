/**
 * The owl — Precogly's single, product-wide "AI lives here" mark.
 *
 * Every AI affordance in the app uses this one glyph so users learn the
 * association once and recognise it everywhere (suggest threats today; import
 * from sketch, summarise, etc. later). lucide-react ships no owl, so it is a
 * hand-drawn SVG that follows lucide's conventions — 24x24 box, `currentColor`
 * stroke, round caps/joins — and therefore inherits text colour and sizes via
 * the same `className` utilities (`h-4 w-4`, …) as every other icon.
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
      {/* Ear tufts */}
      <path d="M8 3.5 9.5 6" />
      <path d="M16 3.5 14.5 6" />
      {/* Head and body — a single rounded owl silhouette */}
      <path d="M12 4.5c-4 0-6.5 2.7-6.5 6.4 0 4.3 2.9 8.6 6.5 8.6s6.5-4.3 6.5-8.6c0-3.7-2.5-6.4-6.5-6.4Z" />
      {/* The two big eyes */}
      <circle cx="9.5" cy="10.5" r="1.6" />
      <circle cx="14.5" cy="10.5" r="1.6" />
      {/* Beak */}
      <path d="M12 12.5 11 14h2z" />
      {/* Belly seam between the wings */}
      <path d="M12 14.5V19" />
    </svg>
  )
}
