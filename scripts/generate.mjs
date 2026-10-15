// Gera os SVGs do README com o visual do site (p0sseid0n.dev): mesmas cores, fontes e ícones.
// O texto vira path, então o SVG não depende de fonte instalada nem de carregar nada externo.
// Uso: npm ci && npm run generate (dentro de scripts/)

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import opentype from 'opentype.js'

const require = createRequire(import.meta.url)
const OUT = new URL('../assets/', import.meta.url)
mkdirSync(OUT, { recursive: true })

/* ---------------------------------- Tema ---------------------------------- */

// Mesmos tokens de src/main.css do site
const THEMES = {
  dark: {
    accent: '#40bde7',
    onAccent: '#0f1318',
    background: '#14181f',
    card: '#1e242b',
    cardBorder: '#2a3741',
    borderStrong: '#4a5565',
    fg: '#ffffff',
    fgSoft: '#d1d5dc',
    fgMuted: '#99a1af',
    fgSubtle: '#8a94a3',
    gridOpacity: 0.2,
  },
  light: {
    accent: '#0a6e9e',
    onAccent: '#ffffff',
    background: '#f7f9fc',
    card: '#ffffff',
    cardBorder: '#dde4eb',
    borderStrong: '#b9c4cf',
    fg: '#0f1720',
    fgSoft: '#3b4855',
    fgMuted: '#4b5866',
    fgSubtle: '#5a6672',
    gridOpacity: 0.6,
  },
}

const W = 880

/* --------------------------------- Fontes --------------------------------- */

function loadFont(pkg, file) {
  const path = require.resolve(`@fontsource/${pkg}/files/${file}`)
  const buf = readFileSync(path)
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

const FONTS = {
  display400: loadFont('space-grotesk', 'space-grotesk-latin-400-normal.woff'),
  display500: loadFont('space-grotesk', 'space-grotesk-latin-500-normal.woff'),
  display600: loadFont('space-grotesk', 'space-grotesk-latin-600-normal.woff'),
  display700: loadFont('space-grotesk', 'space-grotesk-latin-700-normal.woff'),
  mono400: loadFont('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'),
  mono500: loadFont('jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff'),
  mono700: loadFont('jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff'),
}

// Posição de cada glifo, com kerning e espaçamento entre letras (em em)
function layout(str, { font, size, tracking = 0 }) {
  const f = FONTS[font]
  const scale = size / f.unitsPerEm
  const glyphs = f.stringToGlyphs(str)
  const items = []
  let x = 0
  glyphs.forEach((glyph, i) => {
    items.push({ glyph, x })
    x += glyph.advanceWidth * scale + tracking * size
    if (i < glyphs.length - 1) x += (f.getKerningValue(glyph, glyphs[i + 1]) || 0) * scale
  })
  // A última letra não leva o espaçamento extra
  return { items, width: x - tracking * size }
}

// O toPathData do opentype.js às vezes gera NaN em curvas, então o path é montado aqui
function pathData(path) {
  const n = (v) => +v.toFixed(2)
  return path.commands
    .map((c) => {
      if (c.type === 'M' || c.type === 'L') return `${c.type}${n(c.x)} ${n(c.y)}`
      if (c.type === 'Q') return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`
      if (c.type === 'C') return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`
      return 'Z'
    })
    .join('')
}

const measure = (str, opts) => layout(str, opts).width

// Texto como <path>. anchor: start | middle | end. perChar devolve um path por caractere.
function text(str, { x = 0, y, font, size, fill, tracking = 0, anchor = 'start', perChar = false, attrs = '' }) {
  const { items, width } = layout(str, { font, size, tracking })
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x
  const paths = items.map(({ glyph, x: gx }) => pathData(glyph.getPath(x0 + gx, y, size)))
  if (perChar) return { paths, width, x: x0 }
  return { svg: `<path fill="${fill}" ${attrs} d="${paths.join('')}"/>`, width, x: x0 }
}

/* --------------------------------- Ícones --------------------------------- */

const simpleIcons = require('@iconify-json/simple-icons/icons.json')
const materialIcons = require('@iconify-json/material-symbols/icons.json')

// Ícone do Iconify posicionado e escalado (os dois sets usam viewBox 24x24)
function icon(set, name, { x, y, size, fill, attrs = '' }) {
  const data = (set === 'si' ? simpleIcons : materialIcons).icons[name]
  if (!data) throw new Error(`Ícone não encontrado: ${set}:${name}`)
  const body = data.body.replaceAll('currentColor', fill)
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" ${attrs}>${body}</g>`
}

/* --------------------------------- Helpers -------------------------------- */

function svgDoc({ width, height, title, body, style = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">
<title>${escapeXml(title)}</title>
${style ? `<style>${style}\n@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }</style>` : ''}
${body}
</svg>
`
}

function escapeXml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
}

function save(name, theme, svg) {
  writeFileSync(new URL(`${name}-${theme}.svg`, OUT), svg)
}

const pct = (t, total) => `${((t / total) * 100).toFixed(4)}%`

/* ---------------------------------- Hero ---------------------------------- */

const ROLES = ['Fullstack', 'Javascript', 'Typescript', 'Vue.js', 'React.js', 'Node.js', 'Python', 'Front-end', 'Back-end']
const TYPE = 0.13
const ERASE = 0.07
const HOLD = 4.5

function hero(t, theme) {
  const H = 360
  const cx = W / 2
  const parts = []
  const css = []

  parts.push(`<defs>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse" x="${cx % 40}" y="0">
    <path d="M40 0H0V40" fill="none" stroke="${t.cardBorder}" stroke-width="1"/>
  </pattern>
  <radialGradient id="fade" cx="50%" cy="50%" r="60%">
    <stop offset="40%" stop-color="#fff"/>
    <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <mask id="gridMask"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
  <clipPath id="panel"><rect width="${W}" height="${H}" rx="16"/></clipPath>
</defs>
<g clip-path="url(#panel)">
  <rect width="${W}" height="${H}" fill="${t.background}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)" mask="url(#gridMask)" opacity="${t.gridOpacity}"/>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="15.5" fill="none" stroke="${t.cardBorder}"/>`)

  // "── Olá, eu sou ──"
  const hello = text('Olá, eu sou', { x: cx, y: 96, font: 'mono500', size: 18, fill: t.accent, anchor: 'middle' })
  parts.push(hello.svg)
  const lineY = 90
  parts.push(
    `<g stroke="${t.accent}" stroke-opacity="0.5"><path d="M${hello.x - 48} ${lineY}h32"/><path d="M${hello.x + hello.width + 16} ${lineY}h32"/></g>`,
  )

  // Nome com o cursor piscando
  const nameOpts = { font: 'display700', size: 116, tracking: -0.045 }
  const nameW = measure('P0sseid0n', nameOpts)
  const caretW = measure('_', { ...nameOpts, tracking: 0 })
  const nameX = cx - (nameW + caretW) / 2
  const nameY = 212
  parts.push(text('P0sseid0n', { ...nameOpts, x: nameX, y: nameY, fill: t.fg }).svg)
  parts.push(text('_', { ...nameOpts, tracking: 0, x: nameX + nameW, y: nameY, fill: t.accent, attrs: 'class="caret"' }).svg)
  css.push(`.caret { animation: caret 0.5s ease-in-out infinite alternate; }
@keyframes caret { from { opacity: 1; } to { opacity: 0; } }`)

  // Etiqueta "aka Matheus"
  const aka = text('aka ', { font: 'mono400', size: 12, y: 0, fill: t.fgSoft })
  const akaName = text('Matheus', { font: 'mono700', size: 12, y: 0, fill: t.fg })
  const tagW = 12 + 14 + 8 + aka.width + akaName.width + 12
  const tagX = nameX + nameW + caretW - 18
  const tagY = 116
  parts.push(`<g transform="translate(${tagX} ${tagY}) rotate(12)" opacity="0.9">
  <rect x="0.5" y="0.5" width="${tagW}" height="29" rx="8" fill="${t.card}" stroke="${t.cardBorder}"/>
  ${icon('ms', 'sync', { x: 12, y: 8, size: 14, fill: t.accent })}
  ${text('aka ', { font: 'mono400', size: 12, x: 34, y: 19.5, fill: t.fgSoft }).svg}
  ${text('Matheus', { font: 'mono700', size: 12, x: 34 + aka.width, y: 19.5, fill: t.fg }).svg}
</g>`)

  // "Dev <cargo>" com o efeito de digitar e apagar do site
  const devOpts = { font: 'display500', size: 38, tracking: -0.025 }
  const roleOpts = { font: 'display600', size: 38, tracking: -0.025 }
  const devW = measure('Dev ', devOpts)
  const devX = cx - (devW + measure('Fullstack', roleOpts)) / 2
  const roleY = 284
  parts.push(text('Dev', { ...devOpts, x: devX, y: roleY, fill: t.fgMuted }).svg)

  // Linha do tempo: Fullstack começa digitado, espera, apaga, digita o próximo...
  // e no fim digita Fullstack de novo para o loop emendar
  const timeline = []
  let time = 0
  ROLES.forEach((role, i) => {
    const n = role.length
    const entry = { role, typed: [], erased: [] }
    if (i === 0) entry.typed = Array(n).fill(0)
    else {
      for (let k = 0; k < n; k++) entry.typed.push(time + k * TYPE)
      time += n * TYPE
    }
    time += HOLD
    for (let k = 0; k < n; k++) entry.erased.push(time + (n - 1 - k) * ERASE)
    time += n * ERASE
    timeline.push(entry)
  })
  const first = timeline[0]
  first.retyped = []
  for (let k = 0; k < first.role.length; k++) first.retyped.push(time + k * TYPE)
  time += first.role.length * TYPE
  const total = time

  const roleParts = []
  timeline.forEach((entry, r) => {
    const { paths } = text(entry.role, { ...roleOpts, x: devX + devW, y: roleY, perChar: true })
    paths.forEach((d, k) => {
      const cls = `r${r}c${k}`
      const on = entry.typed[k]
      const off = entry.erased[k]
      const eps = 0.0001
      let frames
      if (r === 0) {
        const back = first.retyped[k]
        frames = `0% { opacity: 1; } ${pct(off, total)} { opacity: 1; } ${pct(off + eps, total)} { opacity: 0; } ${pct(back, total)} { opacity: 0; } ${pct(back + eps, total)} { opacity: 1; } 100% { opacity: 1; }`
      } else {
        frames = `0% { opacity: 0; } ${pct(on, total)} { opacity: 0; } ${pct(on + eps, total)} { opacity: 1; } ${pct(off, total)} { opacity: 1; } ${pct(off + eps, total)} { opacity: 0; } 100% { opacity: 0; }`
      }
      css.push(`.${cls} { opacity: ${r === 0 ? 1 : 0}; animation: ${cls} ${total.toFixed(2)}s step-end infinite; }
@keyframes ${cls} { ${frames} }`)
      roleParts.push(`<path class="${cls}" d="${d}"/>`)
    })
  })
  parts.push(`<g fill="${t.accent}">${roleParts.join('')}</g>`)

  return svgDoc({
    width: W,
    height: H,
    title: 'Olá, eu sou P0sseid0n (aka Matheus). Dev Fullstack.',
    body: parts.join('\n'),
    style: css.join('\n'),
  })
}

/* ---------------------------- Título de seção ----------------------------- */

function sectionTitle(t, path, title) {
  const H = 76
  const tilde = text('~/', { font: 'mono400', size: 12, x: 0, y: 14, fill: t.fgSubtle })
  const p = text(path, { font: 'mono400', size: 12, x: tilde.width, y: 14, fill: t.accent })
  const h = text(title, { font: 'display700', size: 34, tracking: -0.025, x: 0, y: 56, fill: t.fg })
  const lineX = h.width + 24
  return svgDoc({
    width: W,
    height: H,
    title: `${title} (~/${path})`,
    body: `${tilde.svg}${p.svg}${h.svg}<path d="M${lineX} 50.5H${W}" stroke="${t.cardBorder}"/>`,
  })
}

/* ---------------------------------- Sobre --------------------------------- */

function diffYearsMonths(start) {
  const s = new Date(start)
  const now = new Date()
  let years = now.getFullYear() - s.getFullYear()
  let months = now.getMonth() - s.getMonth()
  if (months < 0) {
    years--
    months += 12
  }
  if (now.getDate() < s.getDate()) {
    months--
    if (months < 0) {
      years--
      months = 11
    }
  }
  return { years, months }
}

export function aboutParagraphs() {
  const age = diffYearsMonths('2004-10-01').years
  const exp = diffYearsMonths('2022-04-25')
  // **negrito** como no site
  return [
    `Me chamo Matheus Possidonio, tenho ${age} anos, sou do Rio de Janeiro, Brasil. Sou desenvolvedor **full stack**, atualmente trabalhando com **front-end**, com forte domínio de **TypeScript**, ${exp.years} anos e ${exp.months} meses de experiência profissional.`,
    'Minha especialidade é o ecossistema **JavaScript**, mas minha curiosidade não tem fronteiras. Gosto de problemas que exigem lógica de **back-end**, sensibilidade de design no **front-end** e também aplico conhecimentos em **Python**.',
  ]
}

const HASHTAGS = ['FrontEnd', 'BackEnd', 'FullStack', 'TypeScript', 'Python']

// Quebra de linha com trechos em negrito
function wrapRich(paragraph, { size, maxWidth }) {
  const tokens = []
  paragraph.split(/(\*\*[^*]+\*\*)/).forEach((chunk) => {
    if (!chunk) return
    const bold = chunk.startsWith('**')
    const raw = bold ? chunk.slice(2, -2) : chunk
    raw.split(/(\s+)/).forEach((word) => word && tokens.push({ word, bold }))
  })
  const fontOf = (bold) => (bold ? 'display600' : 'display400')
  const lines = [[]]
  let x = 0
  for (const tok of tokens) {
    const w = measure(tok.word, { font: fontOf(tok.bold), size })
    const isSpace = /^\s+$/.test(tok.word)
    if (!isSpace && x + w > maxWidth && lines.at(-1).length) {
      lines.push([])
      x = 0
    }
    if (isSpace && x === 0) continue
    lines.at(-1).push({ ...tok, x, font: fontOf(tok.bold) })
    x += w
  }
  return lines
}

function about(t, theme) {
  const pad = 44
  const size = 17
  const lh = size * 1.65
  const maxWidth = 580
  const parts = []
  let y = pad + size
  const paragraphs = aboutParagraphs()
  paragraphs.forEach((para, i) => {
    if (i) y += 16
    for (const line of wrapRich(para, { size, maxWidth })) {
      for (const tok of line) {
        if (/^\s+$/.test(tok.word)) continue
        parts.push(
          text(tok.word, { font: tok.font, size, x: pad + tok.x, y, fill: tok.bold ? t.fgSoft : t.fgMuted }).svg,
        )
      }
      y += lh
    }
  })

  // Hashtags
  y += 32 - lh + 6
  let x = pad
  for (const tag of HASHTAGS) {
    const label = text(`#${tag}`, { font: 'mono400', size: 12, x: x + 10, y: y + 17, fill: t.accent })
    const w = label.width + 20
    parts.push(
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="25" rx="4" fill="${t.accent}" fill-opacity="0.1" stroke="${t.accent}" stroke-opacity="0.2"/>`,
      label.svg,
    )
    x += w + 8
  }
  const H = Math.round(y + 26 + pad)

  const body = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.card}" stroke="${t.cardBorder}"/>
<g class="pulse">${icon('ms', 'fingerprint', { x: W - 48 - 200, y: (H - 200) / 2, size: 200, fill: t.fg })}</g>
${parts.join('\n')}`

  return svgDoc({
    width: W,
    height: H,
    title: paragraphs.map((p) => p.replaceAll('**', '')).join(' '),
    body,
    style: `.pulse { opacity: 0.06; animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.04; } 50% { opacity: 0.08; } }`,
  })
}

/* ------------------------------- Tecnologias ------------------------------ */

const TECHS = [
  ['HTML', 'html5'],
  ['CSS / SCSS', 'css3'],
  ['Vue.js', 'vuedotjs'],
  ['Nuxt.js', 'nuxt'],
  ['React', 'react'],
  ['Next.js', 'nextdotjs'],
  ['Tailwind', 'tailwindcss'],
  ['Node.js', 'nodedotjs'],
  ['Bun', 'bun'],
  ['Express', 'express'],
  ['MongoDB', 'mongodb'],
  ['MySQL', 'mysql'],
  ['PostgreSQL', 'postgresql'],
  ['Prisma', 'prisma'],
  ['AdonisJS', 'adonisjs'],
  ['NestJS', 'nestjs'],
  ['React Native', 'react'],
  ['JavaScript', 'javascript'],
  ['TypeScript', 'typescript'],
  ['Python', 'python'],
  ['Golang', 'go'],
  ['Lua', 'lua'],
  ['Git', 'git'],
  ['Docker', 'docker'],
  ['Figma', 'figma'],
  ['Jest', 'jest'],
  ['Vitest', 'vitest'],
  ['Cypress', 'cypress'],
  ['Linux', 'linux'],
  ['Github', 'github'],
  ['VS Code', 'visualstudiocode'],
  ['Webpack', 'webpack'],
  ['Vite', 'vite'],
  ['ESLint', 'eslint'],
  ['Prettier', 'prettier'],
]

// Embaralha sempre igual, para o SVG só mudar quando a lista mudar
function seededShuffle(list, seed = 7) {
  const out = [...list]
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function techGrid(t, theme) {
  const H = 520
  const cols = 6
  const gap = 16
  const colW = (W - gap * (cols - 1)) / cols
  const cardH = 112
  const step = cardH + gap
  const list = seededShuffle(TECHS)
  const loopH = list.length * step

  // Desenha cada card uma vez em <defs> e reaproveita com <use>
  const defs = list
    .map(([name, slug], i) => {
      const label = text(name, { font: 'display500', size: 12, x: colW / 2, y: 86, fill: t.fgSoft, anchor: 'middle' })
      return `<g id="t${i}">
  <rect x="0.5" y="0.5" width="${colW - 1}" height="${cardH - 1}" rx="12" fill="${t.card}" stroke="${t.cardBorder}"/>
  ${icon('si', slug, { x: colW / 2 - 18, y: 26, size: 36, fill: t.fgMuted })}
  ${label.svg}
</g>`
    })
    .join('\n')

  const css = []
  const columns = []
  for (let c = 0; c < cols; c++) {
    const offset = Math.floor((c * list.length) / cols)
    const order = [...list.keys()].map((i) => (i + offset) % list.length)
    const uses = [...order, ...order].map((idx, row) => `<use href="#t${idx}" y="${row * step}"/>`).join('')
    const dir = c % 2 === 0 ? 'up' : 'down'
    const dur = 140 + (c + 1) * 10
    css.push(`.col${c} { animation: ${dir} ${dur}s linear infinite; }`)
    columns.push(`<g transform="translate(${(c * (colW + gap)).toFixed(2)} 0)"><g class="col${c}">${uses}</g></g>`)
  }
  css.push(`@keyframes up { from { transform: translateY(0); } to { transform: translateY(-${loopH}px); } }
@keyframes down { from { transform: translateY(-${loopH}px); } to { transform: translateY(0); } }
.col1, .col3, .col5 { transform: translateY(-${loopH / 2}px); }`)

  return svgDoc({
    width: W,
    height: H,
    title: `Tecnologias: ${TECHS.map(([n]) => n).join(', ')}`,
    body: `<defs>
${defs}
<linearGradient id="fadeY" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#fff" stop-opacity="0"/>
  <stop offset="0.1" stop-color="#fff"/>
  <stop offset="0.9" stop-color="#fff"/>
  <stop offset="1" stop-color="#fff" stop-opacity="0"/>
</linearGradient>
<mask id="fadeMask"><rect width="${W}" height="${H}" fill="url(#fadeY)"/></mask>
</defs>
<g mask="url(#fadeMask)">
${columns.join('\n')}
</g>`,
    style: css.join('\n'),
  })
}

/* --------------------------------- Contato -------------------------------- */

function contactHeader(t, theme) {
  const H = 150
  const cx = W / 2
  const tilde = measure('~/', { font: 'mono400', size: 12 })
  const pathW = tilde + measure('contato', { font: 'mono400', size: 12 })
  const parts = [
    text('~/', { font: 'mono400', size: 12, x: cx - pathW / 2, y: 14, fill: t.fgSubtle }).svg,
    text('contato', { font: 'mono400', size: 12, x: cx - pathW / 2 + tilde, y: 14, fill: t.accent }).svg,
    text('Quer conversar sobre um projeto ou uma vaga?', {
      font: 'display700',
      size: 34,
      tracking: -0.025,
      x: cx,
      y: 66,
      fill: t.fg,
      anchor: 'middle',
    }).svg,
    text('Estou aberto a novas oportunidades e projetos.', { font: 'display400', size: 16, x: cx, y: 108, fill: t.fgMuted, anchor: 'middle' }).svg,
    text('O jeito mais rápido de falar comigo é por e-mail.', { font: 'display400', size: 16, x: cx, y: 132, fill: t.fgMuted, anchor: 'middle' }).svg,
  ]
  return svgDoc({
    width: W,
    height: H,
    title: 'Quer conversar sobre um projeto ou uma vaga? Estou aberto a novas oportunidades e projetos.',
    body: parts.join('\n'),
  })
}

/* --------------------------------- Botões --------------------------------- */

function button(t, { label, iconName, iconSet = 'ms', variant }) {
  const H = 48
  const size = 16
  const iconSize = 18
  const labelW = measure(label, { font: 'display600', size })
  const innerW = (iconName ? iconSize + 8 : 0) + labelW
  const Wb = Math.round(innerW + 56)
  const filled = variant === 'filled'
  const color = filled ? t.onAccent : t.fgSoft
  const x0 = (Wb - innerW) / 2
  const parts = [
    filled
      ? `<rect width="${Wb}" height="${H}" rx="8" fill="${t.accent}"/>`
      : `<rect x="0.5" y="0.5" width="${Wb - 1}" height="${H - 1}" rx="7.5" fill="none" stroke="${t.borderStrong}"/>`,
  ]
  if (iconName) parts.push(icon(iconSet, iconName, { x: x0, y: (H - iconSize) / 2, size: iconSize, fill: color }))
  parts.push(text(label, { font: 'display600', size, x: x0 + (iconName ? iconSize + 8 : 0), y: 29.5, fill: color }).svg)
  return svgDoc({ width: Wb, height: H, title: label, body: parts.join('') })
}

function iconButton(t, { label, iconSet, iconName }) {
  const S = 44
  return svgDoc({
    width: S,
    height: S,
    title: label,
    body: `<rect x="0.5" y="0.5" width="${S - 1}" height="${S - 1}" rx="8" fill="${t.card}" stroke="${t.cardBorder}"/>${icon(iconSet, iconName, { x: 10, y: 10, size: 24, fill: t.fgMuted })}`,
  })
}

/* ---------------------------------- Gera ---------------------------------- */

for (const [theme, t] of Object.entries(THEMES)) {
  save('hero', theme, hero(t, theme))
  save('title-sobre', theme, sectionTitle(t, 'sobre', 'Sobre mim'))
  save('title-tecnologias', theme, sectionTitle(t, 'tecnologias', 'Tecnologias'))
  save('title-github', theme, sectionTitle(t, 'github', 'No GitHub'))
  save('about', theme, about(t, theme))
  save('techs', theme, techGrid(t, theme))
  save('contact', theme, contactHeader(t, theme))
  save('btn-site', theme, button(t, { label: 'Visitar site', iconName: 'arrow-outward', variant: 'filled' }))
  save('btn-cv', theme, button(t, { label: 'Baixar CV', iconName: 'download', variant: 'outline' }))
  save('btn-email', theme, button(t, { label: 'Enviar e-mail', iconName: 'mail', variant: 'filled' }))
  save('icon-linkedin', theme, iconButton(t, { label: 'LinkedIn', iconSet: 'si', iconName: 'linkedin' }))
  save('icon-x', theme, iconButton(t, { label: 'X (Twitter)', iconSet: 'si', iconName: 'x' }))
  save('icon-discord', theme, iconButton(t, { label: 'Discord', iconSet: 'si', iconName: 'discord' }))
}

console.log('SVGs gerados em assets/')
