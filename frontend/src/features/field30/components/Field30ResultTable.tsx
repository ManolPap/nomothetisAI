import type { Field30Row } from '../types'

interface Props {
  rows?: Field30Row[]
  fallbackText: string
}

function renderCell(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((line, index) => (
      <div key={`${line}-${index}`} className={line.trim() ? undefined : 'field29-table__blank-line'}>
        {line}
      </div>
    ))
}

export function Field30ResultTable({ rows, fallbackText }: Props) {
  if (!rows?.length) {
    return <pre className="field29-result__text">{fallbackText}</pre>
  }

  return (
    <div className="field29-table-wrap">
      <table className="field29-table">
        <thead>
          <tr>
            <th>Διατάξεις αξιολογούμενης ρύθμισης που προβλέπουν κατάργηση</th>
            <th>Καταργούμενες διατάξεις</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.article}-${row.item_label}-${index}`}>
              <td>{renderCell(row.evaluated_provision)}</td>
              <td>
                {renderCell(
                  row.warning
                    ? `Προειδοποίηση: ${row.warning}\n\n${row.repealed_provision}`
                    : row.repealed_provision,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
