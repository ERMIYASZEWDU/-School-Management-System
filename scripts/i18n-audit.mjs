#!/usr/bin/env node
/**
 * i18n audit for Smart SMS
 * ------------------------
 * Reports three kinds of coverage gaps:
 *
 *   1. KEY PARITY  — keys present in one locale file but missing in the other,
 *                    plus empty values.
 *   2. KEY USAGE   — t('...') keys used in src/ that exist in neither locale
 *                    file (missing translations -> fallback shown).
 *   3. HARDCODED   — likely hardcoded UI strings in JSX: literal text nodes
 *                    (>= 3 chars) inside elements, string attributes like
 *                    label/title/placeholder, and hardcoded dashboard labels.
 *
 * Usage:  npm run i18n:audit     (or: node scripts/i18n-audit.mjs [--json])
 * Exit code is 1 if any gap is found, so it can gate CI.
 */
import fs from 'fs'
import path from 'path'
import url from 'url'

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const LOCALES = {
  en: JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/locales/en.json'), 'utf8')),
  am: JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/locales/am.json'), 'utf8'))
}

const args = process.argv.slice(2)
const asJson = args.includes('--json')

// ─── flatten locale maps ────────────────────────────────────────────────────
function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out.set(key, typeof v === 'string' ? v.trim() : '')
  }
  return out
}
const flat = { en: flatten(LOCALES.en), am: flatten(LOCALES.am) }

// ─── 1. key parity ──────────────────────────────────────────────────────────
const parityIssues = []
const allKeys = new Set([...flat.en.keys(), ...flat.am.keys()])
for (const key of [...allKeys].sort()) {
  const inEn = flat.en.has(key)
  const inAm = flat.am.has(key)
  if (inEn && inAm) {
    if (!flat.en.get(key)) parityIssues.push({ key, problem: 'empty value in en.json' })
    if (!flat.am.get(key)) parityIssues.push({ key, problem: 'empty value in am.json' })
  } else {
    parityIssues.push({ key, problem: inEn ? 'missing in am.json' : 'missing in en.json' })
  }
}

// ─── collect t('key'...) usages from src ────────────────────────────────────
function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, files)
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(p)
  }
  return files
}
const srcFiles = walk(SRC)

const usedKeys = new Map() // key -> [files]
const keyPattern = /\bt\(\s*(['"])((?:(?!\1)[^\\])*)\1/g
for (const file of srcFiles) {
  const text = fs.readFileSync(file, 'utf8')
  for (const m of text.matchAll(keyPattern)) {
    const key = m[2]
    if (!usedKeys.has(key)) usedKeys.set(key, [])
    usedKeys.get(key).push(path.relative(SRC, file))
  }
}

// ─── 2. key usage: t('x') where x exists in NEITHER locale ─────────────────
const missingKeys = []
for (const [key, files] of [...usedKeys].sort()) {
  const isDynamic = key.includes('${') || key.includes('*')
  if (!isDynamic && !flat.en.has(key) && !flat.am.has(key)) {
    missingKeys.push({ key, files: [...new Set(files)] })
  }
}

// ─── 3. hardcoded UI strings in JSX ────────────────────────────────────────
const HARDCODED_SKIP = path.join(SRC, 'i18n')
const ENGLISHISH = /^[A-Z][A-Za-z0-9 ,.'’%&/()+\-!?]+$/
const jsxTextPattern = />([^<>{}]{3,80})</g
const attrPattern = /\b(label|placeholder|title|alt|aria-label)=(['"])([A-Z][^'"]{2,60})\2/g

const hardcoded = [] // { file, line, text }
function relFile(f) { return path.relative(ROOT, f).replace(/\\/g, '/') }

for (const file of srcFiles) {
  if (file.startsWith(HARDCODED_SKIP)) continue
  const rel = relFile(file)
  // Components that are already translated don't need flagging of chrome text,
  // but we still scan everything so nothing hides.
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n')

  // Plain JSX text nodes. Skip lines already using t(, {, template data, css.
  for (const m of text.matchAll(jsxTextPattern)) {
    const raw = m[1].trim()
    if (!raw || !ENGLISHISH.test(raw)) continue
    const lineNo = text.slice(0, m.index).split('\n').length
    const line = lines[lineNo - 1] || ''
    if (/t\(|className|style=|https?:|import |console\.|=>|\{/.test(line)) continue
    hardcoded.push({ file: rel, line: lineNo, text: raw })
  }

  // Common string attributes
  for (const m of text.matchAll(attrPattern)) {
    const lineNo = text.slice(0, m.index).split('\n').length
    const line = lines[lineNo - 1] || ''
    if (/t\(|\{/.test(line)) continue
    hardcoded.push({ file: rel, line: lineNo, text: `${m[1]}="${m[3]}"` })
  }
}

// de-dup hardcoded hits on the same file+text
const seen = new Set()
const hardcodedUnique = hardcoded.filter(h => {
  const k = `${h.file}:${h.text}`
  if (seen.has(k)) return false
  seen.add(k)
  return true
})

// group hardcoded by file for a compact report
const byFile = new Map()
for (const h of hardcodedUnique) {
  if (!byFile.has(h.file)) byFile.set(h.file, [])
  byFile.get(h.file).push(h)
}

// ─── report ─────────────────────────────────────────────────────────────────
if (asJson) {
  console.log(JSON.stringify({
    parityIssues,
    missingKeys,
    hardcoded: hardcodedUnique,
    summary: {
      parityIssues: parityIssues.length,
      missingKeys: missingKeys.length,
      hardcodedStrings: hardcodedUnique.length,
      filesWithHardcoded: byFile.size,
      translatedFiles: [...usedKeys.values()].filter(v => v.length).length
    }
  }, null, 2))
} else {
  const s = { p: parityIssues.length, m: missingKeys.length, h: hardcodedUnique.length }
  console.log('════════════════════════════════════════════════════════')
  console.log(' Smart SMS — i18n coverage audit')
  console.log('════════════════════════════════════════════════════════')
  console.log(` 1) Key parity issues (en vs am):        ${s.p}`)
  console.log(` 2) t() keys missing from BOTH locales:  ${s.m}`)
  console.log(` 3) Likely hardcoded UI strings (JSX):   ${s.h} in ${byFile.size} files`)
  console.log('')

  if (parityIssues.length) {
    console.log('── 1. Key parity ──────────────────────────────────')
    for (const issue of parityIssues.slice(0, 40)) console.log(`   ${issue.key} — ${issue.problem}`)
    if (parityIssues.length > 40) console.log(`   … and ${parityIssues.length - 40} more`)
    console.log('')
  }
  if (missingKeys.length) {
    console.log('── 2. t() keys with no translation at all ────────')
    for (const k of missingKeys.slice(0, 40)) console.log(`   ${k.key}   (used in ${k.files.join(', ')})`)
    if (missingKeys.length > 40) console.log(`   … and ${missingKeys.length - 40} more`)
    console.log('')
  }
  if (byFile.size) {
    console.log('── 3. Hardcoded UI strings, by file ──────────────')
    const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)
    for (const [file, hits] of sorted) {
      console.log(`   ${file} (${hits.length})`)
      for (const h of hits.slice(0, 6)) console.log(`      L${h.line}: "${h.text}"`)
      if (hits.length > 6) console.log(`      … and ${hits.length - 6} more`)
    }
  }
  console.log('────────────────────────────────────────────────────────')
  console.log(` TOTAL GAPS: ${s.p + s.m + s.h}`)
}

const total = parityIssues.length + missingKeys.length + hardcodedUnique.length
process.exit(total > 0 ? 1 : 0)
