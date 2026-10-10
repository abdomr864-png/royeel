import 'server-only'

// CSV that Excel opens correctly: UTF-8 with BOM (Arabic and accents),
// semicolons (French Excel), and formula-like cells neutralised.
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? '' : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [header, ...rows].map((r) => r.map(cell).join(';'))
  return '﻿' + lines.join('\r\n')
}

export function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
