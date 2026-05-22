import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DEFAULT_SETTINGS, parseSettingsRows } from '@/lib/settings'

const PUBLIC_FILE = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|webmanifest)$/

function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/maintenance' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    PUBLIC_FILE.test(pathname)
  )
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/dashboard/admin') || pathname.startsWith('/api/admin/')
}

function isAdminMaintenancePath(pathname: string): boolean {
  return isAdminPath(pathname) || pathname === '/api/settings'
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired — IMPORTANT: must call getUser() not getSession()
  const { data: { user } } = await supabase.auth.getUser()

  if (!isPublicPath(request.nextUrl.pathname)) {
    const { data: rows, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['maintenance_enabled', 'maintenance_message'])

    const maintenance = settingsError
      ? DEFAULT_SETTINGS.maintenance
      : parseSettingsRows(rows ?? []).maintenance

    if (maintenance.enabled) {
      let isAdmin = false

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        isAdmin = profile?.is_admin === true
      }

      if (!isAdmin || !isAdminMaintenancePath(request.nextUrl.pathname)) {
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Maintenance mode enabled', message: maintenance.message },
            { status: 503 },
          )
        }

        const url = request.nextUrl.clone()
        url.pathname = '/maintenance'
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
  }

  // Redirect unauthenticated users trying to access dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page
  if (user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
