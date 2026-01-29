'use client'

import { usePathname } from 'next/navigation'
import SessionTimer from './SessionTimer'

export default function AppHeader() {
  const pathname = usePathname()

  // Don't show on login page, tour page, or admin dashboard pages
  if (pathname === '/' || pathname === '/tour' || pathname?.startsWith('/dashboard/admin')) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-40 p-4">
      <div className="mx-auto max-w-md">
        <SessionTimer />
      </div>
    </div>
  )
}
