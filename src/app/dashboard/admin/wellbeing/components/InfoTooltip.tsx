'use client'

import { HelpCircle } from 'lucide-react'

type InfoTooltipProps = {
  /** Text shown on hover/focus. Keep concise — full sentence is fine. */
  text: string
  /** Optional accessible label override (defaults to the tooltip text). */
  label?: string
}

/**
 * Lightweight, dependency-free tooltip:
 * - Hover or focus on the icon to reveal a short explainer.
 * - Native `title` attribute provides a no-JS / mobile fallback.
 */
export function InfoTooltip({ text, label }: InfoTooltipProps) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label ?? text}
        title={text}
        className="text-gray-600 transition-colors hover:text-gray-300 focus:text-gray-300 focus:outline-none"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-[#0a0a0a] p-2 text-[11px] leading-relaxed text-gray-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
