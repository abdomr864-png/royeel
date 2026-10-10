'use client'

import { useState, useTransition } from 'react'
import { saveVariants } from '@/lib/admin/actions'
import type { ProductColor, ProductSize } from '@/lib/types'
import { btn, input } from './ui'

type Color = { key: string; id?: string; name_fr: string; name_ar: string; hex: string }
type Size = { key: string; label: string; is_active: boolean }
type Cell = { id?: string; stock: number }

// "" is the column of a product without colours.
const NO_COLOR = ''
const cellKey = (color: string, size: string) => `${color}::${size}`
let counter = 0
const newKey = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`

type Message = { ok: boolean; text: string }
// The editor remounts with fresh ids after a save; this carries the result over.
const flash = new Map<string, Message>()

function initialState(colors: ProductColor[], rows: ProductSize[]) {
  const colorList: Color[] = [...colors]
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ key: c.id, id: c.id, name_fr: c.name_fr, name_ar: c.name_ar, hex: c.hex }))
  const sorted = [...rows].sort((a, b) => a.position - b.position)
  const sizes: Size[] = []
  const cells: Record<string, Cell> = {}
  for (const row of sorted) {
    const color = row.color_id ?? NO_COLOR
    // Rows that do not match the product's colours are left out (and removed on save).
    if (colorList.length ? !colorList.some((c) => c.key === color) : color !== NO_COLOR) continue
    let size = sizes.find((s) => s.label === row.label)
    if (!size) {
      size = { key: `size-${row.label}`, label: row.label, is_active: row.is_active }
      sizes.push(size)
    }
    cells[cellKey(color, size.key)] = { id: row.id, stock: row.stock }
  }
  return { colors: colorList, sizes, cells }
}

export function VariantsEditor({ productId, colors, sizes }: { productId: string; colors: ProductColor[]; sizes: ProductSize[] }) {
  const [initial] = useState(() => initialState(colors, sizes))
  const [state, setState] = useState(initial)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<Message | null>(() => {
    const saved = flash.get(productId) ?? null
    flash.delete(productId)
    return saved
  })
  const dirty = JSON.stringify(state) !== JSON.stringify(initial)

  const columns = state.colors.length ? state.colors.map((c) => c.key) : [NO_COLOR]
  const stockOf = (color: string, size: string) => state.cells[cellKey(color, size)]?.stock ?? 0
  const total = state.sizes.reduce((n, s) => n + columns.reduce((m, c) => m + stockOf(c, s.key), 0), 0)

  function addColor() {
    setState((st) => {
      const color: Color = { key: newKey('color'), name_fr: '', name_ar: '', hex: '#4D131C' }
      const cells = { ...st.cells }
      for (const s of st.sizes) {
        // The first colour takes over the stock entered without colour.
        const moved = st.colors.length ? undefined : cells[cellKey(NO_COLOR, s.key)]
        delete cells[cellKey(NO_COLOR, s.key)]
        cells[cellKey(color.key, s.key)] = moved ?? { stock: 0 }
      }
      return { ...st, colors: [...st.colors, color], cells }
    })
  }

  function removeColor(color: Color) {
    if (color.id && !confirm(`Supprimer la couleur « ${color.name_fr || 'sans nom'} » et son stock ?`)) return
    setState((st) => {
      const colors = st.colors.filter((c) => c.key !== color.key)
      const cells = { ...st.cells }
      for (const s of st.sizes) {
        const removed = cells[cellKey(color.key, s.key)]
        delete cells[cellKey(color.key, s.key)]
        // Without any colour left, the product keeps one stock column.
        if (!colors.length) cells[cellKey(NO_COLOR, s.key)] = { stock: removed?.stock ?? 0 }
      }
      return { ...st, colors, cells }
    })
  }

  const updateColor = (key: string, patch: Partial<Color>) =>
    setState((st) => ({ ...st, colors: st.colors.map((c) => (c.key === key ? { ...c, ...patch } : c)) }))

  function addSizes(labels: string[]) {
    setState((st) => {
      const sizes = labels.map((label) => ({ key: newKey('size'), label, is_active: true }))
      const cells = { ...st.cells }
      for (const s of sizes) for (const c of columns) cells[cellKey(c, s.key)] = { stock: 0 }
      return { ...st, sizes: [...st.sizes, ...sizes], cells }
    })
  }

  function removeSize(size: Size) {
    const hasRows = columns.some((c) => state.cells[cellKey(c, size.key)]?.id)
    if (hasRows && !confirm(`Supprimer la taille ${size.label} ?`)) return
    setState((st) => {
      const cells = { ...st.cells }
      for (const c of columns) delete cells[cellKey(c, size.key)]
      return { ...st, sizes: st.sizes.filter((s) => s.key !== size.key), cells }
    })
  }

  const updateSize = (key: string, patch: Partial<Size>) =>
    setState((st) => ({ ...st, sizes: st.sizes.map((s) => (s.key === key ? { ...s, ...patch } : s)) }))

  const moveSize = (i: number, d: -1 | 1) =>
    setState((st) => {
      const j = i + d
      if (j < 0 || j >= st.sizes.length) return st
      const sizes = [...st.sizes]
      ;[sizes[i], sizes[j]] = [sizes[j], sizes[i]]
      return { ...st, sizes }
    })

  const setStock = (color: string, size: string, stock: number) =>
    setState((st) => {
      const key = cellKey(color, size)
      return { ...st, cells: { ...st.cells, [key]: { ...st.cells[key], stock } } }
    })

  function save() {
    setMsg(null)
    const sizeIndex = new Map(state.sizes.map((s, i) => [s.key, i]))
    const cells = state.sizes.flatMap((s) =>
      columns.map((c) => {
        const cell = state.cells[cellKey(c, s.key)] ?? { stock: 0 }
        return { color: c, size: sizeIndex.get(s.key)!, id: cell.id, stock: cell.stock }
      }),
    )
    start(async () => {
      const res = await saveVariants(productId, {
        colors: state.colors.map(({ key, id, name_fr, name_ar, hex }) => ({ key, id, name_fr, name_ar, hex })),
        sizes: state.sizes.map(({ label, is_active }) => ({ label, is_active })),
        cells,
      })
      const result = res.ok ? { ok: true, text: res.message ?? 'Enregistré.' } : { ok: false, text: res.error }
      if (res.ok) flash.set(productId, result)
      setMsg(result)
    })
  }

  return (
    <div className="grid gap-6">
      <section>
        <h3 className="text-sm font-medium text-ink">Couleurs</h3>
        <p className="mt-0.5 text-xs text-mute">Une seule couleur ou aucune : la cliente choisit seulement la taille.</p>
        <ul className="mt-3 grid gap-2">
          {state.colors.map((c) => (
            <li key={c.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:grid-cols-[auto_1fr_1fr_auto]">
              <input
                type="color"
                value={c.hex}
                onChange={(e) => updateColor(c.key, { hex: e.target.value.toUpperCase() })}
                aria-label="Teinte"
                className="h-11 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
              />
              <input value={c.name_fr} onChange={(e) => updateColor(c.key, { name_fr: e.target.value })} placeholder="Nom (ex. Noir)" maxLength={60} aria-label="Nom de la couleur (FR)" className={`${input} mt-0`} />
              <input
                value={c.name_ar}
                onChange={(e) => updateColor(c.key, { name_ar: e.target.value })}
                placeholder="الاسم (مثلاً أسود)"
                maxLength={60}
                dir="rtl"
                aria-label="Nom de la couleur (AR)"
                className={`${input} col-span-2 mt-0 row-start-2 sm:col-span-1 sm:row-start-auto`}
              />
              <button type="button" onClick={() => removeColor(c)} aria-label="Supprimer la couleur" className="grid size-9 place-items-center text-mute hover:text-red-700">
                ×
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addColor} className={`${btn.ghost} mt-2`}>
          + Ajouter une couleur
        </button>
      </section>

      <section>
        <h3 className="text-sm font-medium text-ink">Tailles et stock</h3>
        <p className="mt-0.5 text-xs text-mute">Nombre de pièces disponibles pour chaque taille{state.colors.length ? ' et chaque couleur' : ''}. À 0, la taille s’affiche « Épuisé ».</p>
        {state.sizes.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-max border-separate border-spacing-y-1.5 text-sm">
              <thead>
                <tr className="text-xs text-mute">
                  <th className="pe-2 text-start font-normal">Taille</th>
                  {state.colors.length ? (
                    state.colors.map((c) => (
                      <th key={c.key} className="px-1 text-start font-normal">
                        <span className="flex items-center gap-1.5">
                          <span className="size-3 shrink-0 rounded-full border border-ink/15" style={{ background: c.hex }} />
                          <span className="max-w-24 truncate">{c.name_fr || 'Sans nom'}</span>
                        </span>
                      </th>
                    ))
                  ) : (
                    <th className="px-1 text-start font-normal">Stock</th>
                  )}
                  <th className="px-1 font-normal">Visible</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.sizes.map((s, i) => (
                  <tr key={s.key}>
                    <td className="pe-2">
                      <input value={s.label} onChange={(e) => updateSize(s.key, { label: e.target.value })} placeholder="ex. M" maxLength={20} aria-label="Taille" className={`${input} mt-0 w-24`} />
                    </td>
                    {columns.map((c) => {
                      const stock = stockOf(c, s.key)
                      return (
                        <td key={c || 'stock'} className="px-1">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={stock}
                            onChange={(e) => setStock(c, s.key, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            aria-label={`Stock ${s.label}${c ? ` ${state.colors.find((x) => x.key === c)?.name_fr ?? ''}` : ''}`}
                            className={`${input} mt-0 w-20 tabular-nums ${stock === 0 ? 'text-red-700' : ''}`}
                          />
                        </td>
                      )
                    })}
                    <td className="px-1 text-center">
                      <input type="checkbox" checked={s.is_active} onChange={(e) => updateSize(s.key, { is_active: e.target.checked })} aria-label={`Taille ${s.label} visible`} className="size-4 accent-burgundy" />
                    </td>
                    <td>
                      <span className="flex items-center">
                        <button type="button" disabled={i === 0} onClick={() => moveSize(i, -1)} aria-label="Monter" className="grid size-8 place-items-center text-mute hover:text-ink disabled:opacity-25">
                          ↑
                        </button>
                        <button type="button" disabled={i === state.sizes.length - 1} onClick={() => moveSize(i, 1)} aria-label="Descendre" className="grid size-8 place-items-center text-mute hover:text-ink disabled:opacity-25">
                          ↓
                        </button>
                        <button type="button" onClick={() => removeSize(s)} aria-label="Supprimer la taille" className="grid size-8 place-items-center text-mute hover:text-red-700">
                          ×
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => addSizes([''])} className={btn.ghost}>
            + Ajouter une taille
          </button>
          {state.sizes.length === 0 ? (
            <button type="button" onClick={() => addSizes(['S', 'M', 'L', 'XL'])} className={btn.ghost}>
              + S, M, L, XL
            </button>
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-line/60 pt-4">
        <button type="button" disabled={pending || !dirty || state.sizes.length === 0} onClick={save} className={btn.primary}>
          {pending ? 'Enregistrement…' : 'Enregistrer couleurs, tailles et stock'}
        </button>
        <span className="text-sm text-mute">
          {total} pièce{total > 1 ? 's' : ''} en stock
        </span>
        {msg ? <span className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</span> : null}
        {dirty && !pending ? <span className="text-xs text-amber-700">Modifications non enregistrées</span> : null}
      </div>
      <p className="-mt-3 text-xs text-mute">Le stock baisse tout seul à chaque commande et remonte si vous annulez une commande.</p>
    </div>
  )
}
