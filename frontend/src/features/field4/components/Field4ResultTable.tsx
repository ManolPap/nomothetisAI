interface ParsedField4Answer {
  yesChecked: boolean
  noChecked: boolean
  articles: string[]
}

function parseField4Answer(raw: string): ParsedField4Answer {
  const yesChecked = /ΝΑΙ\s*☒/.test(raw)
  const noChecked = /ΟΧΙ\s*☒/.test(raw)
  const articles: string[] = []
  const re = /\[([^\]]+)\]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    const entry = match[1].trim().replace(/\s+/g, ' ')
    if (entry) articles.push(entry)
  }
  return { yesChecked, noChecked, articles }
}

export function Field4ResultTable({ answer }: { answer: string }) {
  const parsed = parseField4Answer(answer)
  return (
    <div className="field4-preview-table-wrap">
      <table className="field4-preview-table">
        <tbody>
          <tr>
            <td className="field4-preview-table__index">4.</td>
            <td className="field4-preview-table__question">
              <p className="field4-preview-table__question-text">
                Το εν λόγω ζήτημα έχει αντιμετωπιστεί με νομοθετική ρύθμιση στο παρελθόν;
              </p>
              <div className="field4-preview-table__choices">
                <span className="field4-preview-table__choice">
                  ΝΑΙ <span className="field4-preview-table__box">{parsed.yesChecked ? '☒' : '☐'}</span>
                </span>
                <span className="field4-preview-table__choice">
                  ΟΧΙ <span className="field4-preview-table__box">{parsed.noChecked ? '☒' : '☐'}</span>
                </span>
              </div>
              <p className="field4-preview-table__question-text">
                Εάν ΝΑΙ, ποιο είναι το ισχύον νομικό πλαίσιο που ρυθμίζει το ζήτημα;
              </p>
            </td>
          </tr>
          <tr>
            <td className="field4-preview-table__spacer" aria-hidden="true"></td>
            <td className="field4-preview-table__framework">
              <p className="field4-preview-table__framework-title">Ισχύον νομικό πλαίσιο:</p>
              {parsed.articles.length === 0 ? (
                <p className="field4-preview-table__framework-empty">
                  Δεν εντοπίστηκε υφιστάμενο νομικό πλαίσιο.
                </p>
              ) : (
                <ul className="field4-preview-table__framework-list">
                  {parsed.articles.map((article, index) => (
                    <li key={`${index}-${article}`}>{article}</li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
