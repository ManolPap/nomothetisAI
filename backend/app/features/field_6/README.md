# Field 6 — Frontend Integration Guide

This document describes the **Field 6** HTTP endpoints for automating the "Συναφείς Πρακτικές" section of the Ανάλυση Συνεπειών Ρύθμισης (ΑΣΡ). The workflow is **Human-in-the-Loop (HITL)**: each step returns data for the user to review and edit before proceeding to the next.

---

## 1. Base URL and OpenAPI

| Piece | Value |
|-------|--------|
| Field 6 prefix | `/field6` |
| Full base path | `{ORIGIN}/field6` |

Local development:
```
http://127.0.0.1:8000/field6
```

- **Swagger UI:** `{ORIGIN}/docs`
- **OpenAPI JSON:** `{ORIGIN}/openapi.json`

**CORS:** If the frontend runs on a different origin (e.g. `localhost:3000` → API `localhost:8000`), configure a reverse proxy in dev (e.g. Vite `server.proxy`) or enable CORS at the FastAPI level.

---

## 2. HITL Workflow Overview

Field 6 is split into **4 sequential steps**. The output of each step is shown to the user for review before it is passed as input to the next step. The user may edit any field at any step.

```
Step 1: POST /field6/extract-metadata   ← upload PDF
           ↓ user reviews & edits metadata
Step 2: POST /field6/web-search         ← pass metadata
           ↓ user selects which facts to keep
Step 3: POST /field6/eurostat           ← pass metadata + facts
           ↓ user selects which Eurostat data to include
Step 4: POST /field6/synthesize         ← pass all selected data
           ↓ final Field 6 text returned
```

---

## 3. Shared Models

### `LawMetadata`

Used as input/output across all endpoints.

| Field | Type | Description |
|-------|------|-------------|
| `topic` | `string` | Main subject of the law (1 sentence) |
| `ministry` | `string` | Responsible ministry |
| `sector` | `string` | Legislative sector (e.g. "Εργατικό Δίκαιο") |
| `measures` | `string` | Key measures, separated by ` \| ` |
| `directive` | `string` | EU Directive being transposed, or `"-"` |

```json
{
  "topic": "Ενσωμάτωση Οδηγίας (ΕΕ) 2019/1152...",
  "ministry": "Υπουργείο Εργασίας και Κοινωνικής Ασφάλισης",
  "sector": "Εργατικό Δίκαιο",
  "measures": "Θέσπιση κανόνων... | Καθιέρωση... | Ενίσχυση...",
  "directive": "Οδηγία (ΕΕ) 2019/1152..."
}
```

### `WebSource`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Page title |
| `url` | `string` | Source URL |
| `content` | `string` | Excerpt (up to 600 chars) |

---

## 4. Endpoint: `POST /field6/extract-metadata`

**Purpose:** Upload a law PDF. Returns extracted metadata and EUR-Lex NIM text.

**Content-Type:** `multipart/form-data`

**File field name:** `file` (one PDF file)

### Example `fetch`

```ts
const form = new FormData();
form.append("file", pdfFile); // File from <input type="file">

const res = await fetch(`${API_BASE}/field6/extract-metadata`, {
  method: "POST",
  body: form,
});
if (!res.ok) throw new Error(await res.text());
const data: MetadataResponse = await res.json();
```

### Response: `MetadataResponse`

| Field | Type | Description |
|-------|------|-------------|
| `metadata` | `LawMetadata` | Extracted metadata — **editable by user** |
| `nim_text` | `string` | EUR-Lex NIM info (may be empty if no EU Directive found) |

```json
{
  "metadata": {
    "topic": "...",
    "ministry": "...",
    "sector": "...",
    "measures": "...",
    "directive": "..."
  },
  "nim_text": "Σύμφωνα με το EUR-Lex, η Οδηγία 2019/1152 έχει ενσωματωθεί..."
}
```

### Error codes

| HTTP | When |
|------|------|
| `400` | File is not a PDF |
| `422` | PDF could not be parsed |

### HITL note

Display `metadata` fields in an editable form. The user should be able to correct any field before proceeding to Step 2. Pass the (possibly edited) `metadata` and `nim_text` to `/web-search`.

---

## 5. Endpoint: `POST /field6/web-search`

**Purpose:** Takes law metadata, runs web searches (via Tavily) against trusted sources (EU, OECD, ILO, etc.), and extracts facts organized by Field 6 sub-sections (i, ii, iii).

**Content-Type:** `application/json`

### Request: `WebSearchRequest`

| Field | Type | Description |
|-------|------|-------------|
| `metadata` | `LawMetadata` | From Step 1 (possibly edited by user) |
| `nim_text` | `string` | From Step 1 (default `""`) |

```json
{
  "metadata": { "...": "..." },
  "nim_text": "..."
}
```

### Response: `WebSearchResponse`

| Field | Type | Description |
|-------|------|-------------|
| `sources` | `WebSource[]` | All sources found |
| `facts_text` | `string` | Extracted facts in structured format (ΚΑΤΗΓΟΡΙΑ_i, ΚΑΤΗΓΟΡΙΑ_ii, ΚΑΤΗΓΟΡΙΑ_iii) |

```json
{
  "sources": [
    {
      "title": "Transparent and predictable working conditions - European Commission",
      "url": "https://employment-social-affairs.ec.europa.eu/...",
      "content": "Directive 2019/1152..."
    }
  ],
  "facts_text": "ΚΑΤΗΓΟΡΙΑ_i (Χώρες ΕΕ/ΟΟΣΑ):\nFACT_i: [Σλοβακία, Τσεχία...] | [...] | [...] | [url]\n\nΚΑΤΗΓΟΡΙΑ_ii..."
}
```

### HITL note

Display each `FACT_i`, `FACT_ii`, `FACT_iii` line as a selectable item with a checkbox. The user picks which facts to keep. Pass only the selected `sources` (as `selected_sources`) and the full `facts_text` to the next steps. Also pass `facts_text` to `/eurostat`.

---

## 6. Endpoint: `POST /field6/eurostat`

**Purpose:** Detects countries mentioned in the facts and fetches Eurostat indicator data for those countries.

**Content-Type:** `application/json`

### Request: `EurostatRequest`

| Field | Type | Description |
|-------|------|-------------|
| `metadata` | `LawMetadata` | From Step 1 |
| `facts_text` | `string` | From Step 2 |

```json
{
  "metadata": { "...": "..." },
  "facts_text": "ΚΑΤΗΓΟΡΙΑ_i:\nFACT_i: [Γερμανία, Γαλλία...]..."
}
```

### Response: `EurostatResponse`

| Field | Type | Description |
|-------|------|-------------|
| `eurostat_data` | `dict` | Country code → `{name, values, indicator, dataset_id, url}` |
| `indicator_name` | `string` | Name of the Eurostat indicator used (may be empty) |

```json
{
  "eurostat_data": {
    "DE": {
      "name": "Germany",
      "values": { "2022": 33.3, "2023": 34.6 },
      "indicator": "Μερική απασχόληση %",
      "dataset_id": "lfsa_eppga",
      "url": "https://ec.europa.eu/eurostat/databrowser/view/lfsa_eppga"
    },
    "FR": { "..." : "..." }
  },
  "indicator_name": "Μερική απασχόληση %"
}
```

**Note:** `eurostat_data` may be an empty `{}` if no countries were detected in `facts_text` or no matching Eurostat dataset was found.

### HITL note

Display each country's data with a checkbox. The user decides which countries to include. Convert the selected entries to a plain text string (`eurostat_text`) before passing to `/synthesize`. Format suggestion:

```
Eurostat — {indicator_name}: {Country}: {value}% ({year}), ... (Πηγή: Eurostat, {dataset_id}, {url})
```

---

## 7. Endpoint: `POST /field6/synthesize`

**Purpose:** Takes all selected data and synthesizes the final Field 6 text (≤250 words, in Greek, structured as i / ii / iii).

**Content-Type:** `application/json`

### Request: `SynthesizeRequest`

| Field | Type | Description |
|-------|------|-------------|
| `metadata` | `LawMetadata` | From Step 1 |
| `facts_text` | `string` | From Step 2 (full or filtered by user) |
| `eurostat_text` | `string` | Formatted Eurostat data (from Step 3, converted to string by frontend) |
| `selected_sources` | `WebSource[]` | Sources the user chose to keep in Step 2 |

```json
{
  "metadata": { "...": "..." },
  "facts_text": "ΚΑΤΗΓΟΡΙΑ_i:\n...",
  "eurostat_text": "Eurostat — Μερική απασχόληση %: Germany: 33.3% (2022)...",
  "selected_sources": [
    {
      "title": "...",
      "url": "...",
      "content": "..."
    }
  ]
}
```

**Important:** Only pass the facts and Eurostat data the user has selected. The LLM synthesizes exactly what it receives — it will not add or invent information.

### Response: `SynthesizeResponse`

| Field | Type | Description |
|-------|------|-------------|
| `field6_text` | `string` | Final Field 6 text in Greek, structured as i) / ii) / iii) |
| `word_count` | `int` | Word count of the generated text |

```json
{
  "field6_text": "i) Η ενσωμάτωση της Οδηγίας (EU) 2019/1152 αποτελεί πρακτική σε 14 κράτη μέλη...\n\nii) Το Ευρωπαϊκό Κοινοβούλιο...\n\niii) Ο ΔΟΕ διαπίστωσε...",
  "word_count": 119
}
```

### HITL note

Display `field6_text` in an editable text area so the user can make final adjustments before saving. Show `word_count` as a live counter (target: ≤250 words).

---

## 8. Error Handling

| HTTP | When |
|------|------|
| `400` | File uploaded to `/extract-metadata` is not a PDF |
| `422` | PDF could not be parsed / invalid JSON body |
| Other `5xx` | Internal server error — inspect FastAPI `detail` or server logs |

---

## 9. Frontend Checklist

- [ ] Step 1: `FormData` with field name **`file`** (PDF only).
- [ ] Step 1 → Step 2: display `metadata` in editable fields; pass user-edited values.
- [ ] Step 2: display facts as checkboxes per line (FACT_i, FACT_ii, FACT_iii).
- [ ] Step 2 → Step 3: pass full `facts_text` (used for country detection).
- [ ] Step 3: display Eurostat data per country with checkboxes; convert selection to `eurostat_text` string.
- [ ] Step 4: pass only user-selected `facts_text`, `eurostat_text`, and `selected_sources`.
- [ ] Step 4: display `field6_text` in editable textarea with word count.
- [ ] Loading states for Steps 1 and 2 (LLM + web search can take 5–15 seconds).
- [ ] CORS or dev proxy configured.

---

## 10. Folder Layout

```
backend/app/features/field_6/
├── router.py          — HTTP route declarations
├── schemas.py         — Pydantic models (JSON contract with frontend)
├── config.py          — LLM clients, Eurostat catalog, trusted domains
├── prompt.py          — LLM prompt templates
└── services/
    ├── llm_service.py  — LLM calls (metadata extraction, queries, facts, synthesis)
    ├── pdf_reader.py   — PDF text extraction
    └── web_search.py   — EUR-Lex NIM, Tavily search, Eurostat API
```