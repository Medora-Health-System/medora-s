import * as fs from 'fs'
import * as path from 'path'

const filePath = path.resolve(
  process.env.HOME!,
  'medora-data/raw/cms-clfs/2026/PUF_CLFS_CY2026_Q2V1.csv'
)

const raw = fs.readFileSync(filePath, 'utf-8')
const lines = raw.split(/\r?\n/).filter(Boolean)

const headerIndex = lines.findIndex((line) =>
  line.toUpperCase().startsWith('YEAR,HCPCS,MOD,EFF_DATE')
)

if (headerIndex === -1) {
  throw new Error('Could not find CLFS header row')
}

const headers = lines[headerIndex].split(',').map((h) => h.trim())
const rows = lines.slice(headerIndex + 1)

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && next === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  values.push(current)
  return values.map((v) => v.trim())
}

const mapped = rows
  .map((line) => {
    const values = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))

    return {
      year: row.YEAR,
      code: row.HCPCS,
      modifier: row.MOD,
      effectiveDate: row.EFF_DATE,
      description: row.DESCRIPTION || row.SHORTDESC || '',
      rate: row.RATE || row.PAYMENT_RATE || row.NLA || '',
    }
  })
  .filter((r) => /^\d{4}$/.test(r.year) && /^[A-Z0-9]{5}$/.test(r.code))

const outPath = path.resolve(process.env.HOME!, 'medora-data/processed/clfs.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(mapped, null, 2))

console.log(`Parsed ${mapped.length} CLFS billing rows`)
console.log(mapped.slice(0, 5))
