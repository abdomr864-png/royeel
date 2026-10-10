import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isLocale, localeFromAcceptLanguage, LOCALE_COOKIE } from '@/lib/i18n/config'
import { isSupabaseConfigured, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/env'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return adminSession(request)
  }

  const first = pathname.split('/')[1]
  if (isLocale(first)) return NextResponse.next()

  // No language in the URL: use the saved choice, else the browser language.
  // Query strings (utm_*, fbclid, ttclid from ads) are kept.
  const saved = request.cookies.get(LOCALE_COOKIE)?.value
  const locale = isLocale(saved) ? saved : localeFromAcceptLanguage(request.headers.get('accept-language'))
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

// Refreshes the admin's Supabase session and sends signed-out visitors to the
// login page. Pages still check admin rights themselves.
async function adminSession(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isLogin = path === '/admin/login' || path.startsWith('/admin/auth/')
  if (!isSupabaseConfigured) return NextResponse.next()

  let response = NextResponse.next({ request })
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)

  if (!signedIn && !isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
