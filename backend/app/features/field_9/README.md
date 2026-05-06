# Field 9 — Frontend Integration Guide

This document describes the **Field 9** HTTP endpoints for automating the "Ειδικότεροι Στόχοι" section of the Ανάλυση Συνεπειών Ρύθμισης (ΑΣΡ). The workflow is **Human-in-the-Loop (HITL)**: each step returns data for the user to review before proceeding to the next.

---

## 1. Base URL and OpenAPI

| Piece | Value |
|-------|--------|
| Field 9 prefix | `/field9` |
| Full base path | `{ORIGIN}/field9` |

Local development:
```
http://127.0.0.1:8000/field9
```

- **Swagger UI:** `{ORIGIN}/docs`
- **OpenAPI JSON:** `{ORIGIN}/openapi.json`

**CORS:** If the frontend runs on a different origin (e.g. `localhost:3000` → API `localhost:8000`), configure a reverse proxy in dev (e.g. Vite `server.proxy`) or enable CORS at the FastAPI level.

---

## 2. HITL Workflow Overview

Field 9 is split into **3 sequential steps**. The output of each step is shown to the user for review before it is passed as input to the next step.

```
Step 1: POST /field9/extract-sector     ← upload PDF
           ↓ user reviews sector, year, title (editable)
Step 2: POST /field9/suggest-indicators ← pass sector + year + title
           ↓ user selects which indicators to use (checkboxes)
Step 3: POST /field9/fetch-data         ← pass selected indicator IDs + year
           ↓ Eurostat data returned (5-year history + reference year)
              user fills in the 3-year target manually
```

**Important:** Field 9 does NOT produce a text output — it produces a **table** of indicators with historical data. The user fills in the "Επιδιωκόμενος Στόχος (3ετία)" column manually in the UI.

---

## 3. Shared Models

### `IndicatorSuggestion`

| Field | Type | Description |
|-------|------|-------------|
| `dataset_id` | `string` | Eurostat dataset ID (e.g. `une_rt_a`) |
| `indicator_name` | `string` | Human-readable indicator name in Greek |
| `description` | `string` | Short description of what it measures |
| `sector` | `string` | Legislative sector this indicator belongs to |

### `YearlyValue`

| Field | Type | Description |
|-------|------|-------------|
| `year` | `int` | Calendar year |
| `value` | `float \| null` | Indicator value for that year (null if unavailable) |

### `IndicatorData`

| Field | Type | Description |
|-------|------|-------------|
| `dataset_id` | `string` | Eurostat dataset ID |
| `indicator_name` | `string` | Human-readable name in Greek |
| `description` | `string` | Short description |
| `values` | `YearlyValue[]` | Historical values (sorted by year ascending) |
| `unit` | `string` | Unit of measurement (e.g. `PC`, `PC_ACT`, `PC_GDP`) |
| `eurostat_url` | `string` | Link to Eurostat databrowser for this dataset |

---

## 4. Endpoint: `POST /field9/extract-sector`

**Purpose:** Upload a law PDF. Returns the legislative sector, the law's year, and its title.

**Content-Type:** `multipart/form-data`

**File field name:** `file` (one PDF file)

### Example `fetch`

```ts
const form = new FormData();
form.append("file", pdfFile); // File from <input type="file">

const res = await fetch(`${API_BASE}/field9/extract-sector`, {
  method: "POST",
  body: form,
});
if (!res.ok) throw new Error(await res.text());
const data: ExtractSectorResponse = await res.json();
```

### Response: `ExtractSectorResponse`

| Field | Type | Description |
|-------|------|-------------|
| `sector` | `string` | One of: `εργασία`, `κοινωνική ασφάλιση`, `κοινωνική πρόνοια`, `υγεία`, `εκπαίδευση`, `οικονομία`, `περιβάλλον`, `δικαιοσύνη`, `ισότητα`, `δημόσια διοίκηση` |
| `year` | `int` | Year the law was passed (e.g. `2023`) |
| `law_title` | `string` | Short title of the law (1 sentence) |

```json
{
  "sector": "εργασία",
  "year": 2023,
  "law_title": "Ενσωμάτωση της Οδηγίας (ΕΕ) 2019/1152 για διαφανείς και προβλέψιμους όρους εργασίας..."
}
```

### Error codes

| HTTP | When |
|------|------|
| `422` | Could not extract sector or year from the PDF |

### HITL note

Display `sector`, `year`, and `law_title` as editable fields. The user should be able to correct them before proceeding. Pass the (possibly edited) values to `/suggest-indicators`.

---

## 5. Endpoint: `POST /field9/suggest-indicators`

**Purpose:** Takes the law's sector and title, and suggests the most relevant Eurostat indicators from a pre-validated catalog.

**Content-Type:** `application/json`

### Request: `SuggestIndicatorsRequest`

| Field | Type | Description |
|-------|------|-------------|
| `sector` | `string` | From Step 1 (possibly edited by user) |
| `year` | `int` | From Step 1 |
| `law_title` | `string` | From Step 1 (possibly edited by user) |

```json
{
  "sector": "εργασία",
  "year": 2023,
  "law_title": "Ενσωμάτωση της Οδηγίας (ΕΕ) 2019/1152..."
}
```

### Response: `SuggestIndicatorsResponse`

| Field | Type | Description |
|-------|------|-------------|
| `suggestions` | `IndicatorSuggestion[]` | 3–5 suggested indicators |

```json
{
  "suggestions": [
    {
      "dataset_id": "lfsa_eppga",
      "indicator_name": "Μερική απασχόληση %",
      "description": "εργαζόμενοι μερικής απασχόλησης ως ποσοστό",
      "sector": "εργασία"
    },
    {
      "dataset_id": "lfsa_etgar",
      "indicator_name": "Προσωρινή απασχόληση %",
      "description": "εργαζόμενοι με σύμβαση ορισμένου χρόνου",
      "sector": "εργασία"
    }
  ]
}
```

### HITL note

Display each suggestion as a checkbox item showing `indicator_name` and `description`. The user selects which indicators to include. Pass the `dataset_id` values of the selected indicators to `/fetch-data`.

---

## 6. Endpoint: `POST /field9/fetch-data`

**Purpose:** Fetches Eurostat data for Greece (`geo=EL`) for the selected indicators, covering the 5 years before the law's reference year plus the reference year itself.

**Content-Type:** `application/json`

### Request: `FetchDataRequest`

| Field | Type | Description |
|-------|------|-------------|
| `selected_indicators` | `string[]` | List of `dataset_id` values chosen by the user in Step 2 |
| `year` | `int` | Reference year from Step 1 (law's year) |

```json
{
  "selected_indicators": ["lfsa_eppga", "une_rt_a"],
  "year": 2023
}
```

### Response: `FetchDataResponse`

| Field | Type | Description |
|-------|------|-------------|
| `indicators` | `IndicatorData[]` | Data for each successfully fetched indicator |
| `reference_year` | `int` | The law's year (e.g. `2023`) |
| `five_year_range` | `int[]` | The 5 years before the reference year (e.g. `[2018, 2019, 2020, 2021, 2022]`) |

```json
{
  "indicators": [
    {
      "dataset_id": "lfsa_eppga",
      "indicator_name": "Μερική απασχόληση %",
      "description": "εργαζόμενοι μερικής απασχόλησης ως ποσοστό",
      "values": [
        { "year": 2018, "value": 34.4 },
        { "year": 2019, "value": 42.1 },
        { "year": 2020, "value": 35.8 },
        { "year": 2021, "value": 25.4 },
        { "year": 2022, "value": 32.2 },
        { "year": 2023, "value": 27.9 }
      ],
      "unit": "PC",
      "eurostat_url": "https://ec.europa.eu/eurostat/databrowser/view/lfsa_eppga"
    }
  ],
  "reference_year": 2023,
  "five_year_range": [2018, 2019, 2020, 2021, 2022]
}
```

**Note:** If a `dataset_id` has no data for Greece in the requested years, it is silently omitted from `indicators`. Always check `indicators.length` — it may be less than `selected_indicators.length`.

### How to build the Field 9 table

The response maps directly to the ΑΣΡ table structure:

| Column | Source |
|--------|--------|
| Δείκτης | `indicator_name` |
| Εξέλιξη τελευταία 5ετία | `values` where `year` is in `five_year_range` |
| Πρόσφατα στοιχεία | `values` where `year === reference_year` |
| Επιδιωκόμενος στόχος (3ετία) | **User input** — not provided by the API |

### HITL note

Render the data as a table. The "Επιδιωκόμενος Στόχος (3ετία)" column must be an editable input field — the user fills it in manually based on policy goals. Provide a link to `eurostat_url` for each indicator so the user can verify the data.

---

## 7. Error Handling

| HTTP | When |
|------|------|
| `422` | PDF could not be parsed / sector or year not found / invalid JSON body |
| Other `5xx` | Internal server error — inspect FastAPI `detail` or server logs |

---

## 8. Available Sectors and Indicators

The backend catalog contains verified Eurostat datasets for Greece (`geo=EL`):

| Sector | Example indicators |
|--------|-------------------|
| `εργασία` | Ποσοστό απασχόλησης, Ανεργία, Μερική απασχόληση, Υποαπασχόληση |
| `κοινωνική ασφάλιση` | Συνταξιοδοτικές παροχές % ΑΕΠ |
| `κοινωνική πρόνοια` | Κίνδυνος φτώχειας % |
| `υγεία` | Δαπάνες υγείας % ΑΕΠ, Θνησιμότητα, Ιατροί ανά 100.000 |
| `εκπαίδευση` | Πρόωρη εγκατάλειψη, Εγγραφές, Απόφοιτοι |
| `οικονομία` | ΑΕΠ, Φορολογικά έσοδα, Δημόσιο χρέος, Πληθωρισμός, Επενδύσεις |
| `περιβάλλον` | Εκπομπές CO2, Ανανεώσιμες πηγές, Ενεργειακή ένταση |
| `δικαιοσύνη` | Εγκλήματα ανά 100.000 |
| `ισότητα` | Χάσμα απασχόλησης μεταξύ φύλων |

---

## 9. Frontend Checklist

- [ ] Step 1: `FormData` with field name **`file`** (PDF only).
- [ ] Step 1: display `sector`, `year`, `law_title` as editable fields.
- [ ] Step 2: display suggestions as checkboxes with `indicator_name` + `description`.
- [ ] Step 3: pass `dataset_id` array of selected indicators + `year`.
- [ ] Step 3: render table with 5-year history + reference year columns.
- [ ] Step 3: "Επιδιωκόμενος Στόχος" column must be a user-editable input.
- [ ] Handle missing indicators: `indicators.length` may be less than requested.
- [ ] Show `eurostat_url` link per indicator for data verification.
- [ ] Loading state for Step 1 (LLM call, ~3–5 seconds).
- [ ] CORS or dev proxy configured.

---

## 10. Folder Layout

```
backend/app/features/field_9/
├── router.py           — HTTP route declarations
├── schemas.py          — Pydantic models (JSON contract with frontend)
├── config.py           — LLM client, verified Eurostat catalog
├── prompt.py           — LLM prompt templates
└── services/
    ├── eurostat.py     — LLM indicator suggestion + Eurostat API fetching
    ├── llm_service.py  — LLM response extraction helper
    └── pdf_reader.py   — PDF text extraction
```