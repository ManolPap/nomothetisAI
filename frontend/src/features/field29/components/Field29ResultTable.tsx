import type { ReactNode } from 'react'
import type { Field29Row } from '../types'

interface Field29TableRow {
  evaluatedProvision: string
  existingProvision: string
}

function splitMarkdownRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function isSeparatorRow(row: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|?$/.test(row.trim())
}

function parseField29MarkdownTable(value: string): Field29TableRow[] {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const headerIndex = lines.findIndex(
    (line) =>
      line.startsWith('|') &&
      line.includes('Διατάξεις αξιολογούμενης ρύθμισης') &&
      line.includes('Υφιστάμενες διατάξεις'),
  )

  if (headerIndex < 0) {
    return []
  }

  const rows: Field29TableRow[] = []

  for (const line of lines.slice(headerIndex + 1)) {
    if (!line.startsWith('|')) {
      break
    }

    if (isSeparatorRow(line)) {
      continue
    }

    const cells = splitMarkdownRow(line)

    if (cells.length < 2) {
      continue
    }

    rows.push({
      evaluatedProvision: cells[0],
      existingProvision: cells.slice(1).join(' | '),
    })
  }

  return rows
}

function renderInlineEmphasis(text: string): ReactNode[] {
  return text.split(/(\*\*\*.*?\*\*\*)/g).map((part, index) => {
    if (part.startsWith('***') && part.endsWith('***')) {
      return (
        <strong key={index}>
          <em>{part.slice(3, -3)}</em>
        </strong>
      )
    }

    return part
  })
}

function renderCell(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((line, index) => (
      <div key={`${line}-${index}`} className={line.trim() ? undefined : 'field29-table__blank-line'}>
        {renderInlineEmphasis(line)}
      </div>
    ))
}

interface Props {
  value: string
  rows?: Field29Row[]
}

export function Field29ResultTable({ value, rows: structuredRows }: Props) {
  const rows = structuredRows?.length
    ? structuredRows.map((row) => ({
        evaluatedProvision: row.evaluated_provision,
        existingProvision: row.existing_provision,
      }))
    : parseField29MarkdownTable(value)

  if (rows.length === 0) {
    return <pre className="field29-result__text">{value}</pre>
  }

  return (
    <div className="field29-table-wrap">
      <table className="field29-table">
        <thead>
          <tr>
            <th>Διατάξεις αξιολογούμενης ρύθμισης</th>
            <th>Υφιστάμενες διατάξεις</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.evaluatedProvision}-${index}`}>
              <td>{renderCell(row.evaluatedProvision)}</td>
              <td>{renderCell(row.existingProvision)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
