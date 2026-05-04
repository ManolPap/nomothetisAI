# Field 23 — Frontend integration guide

This document describes the **Field 23** HTTP endpoints (split a law PDF into articles, compare two versions, link legislative comments to changes via an LLM) so a frontend developer can call them correctly from the app.

---

## 1. Base URL and OpenAPI

The Field 23 router is mounted under:

| Piece | Value |
|-------|--------|
| API prefix | `/api` |
| Field 23 prefix | `/field-23` |

**Full base path for all Field 23 endpoints:** `{ORIGIN}/api/field-23`

Local development example (backend on `http://127.0.0.1:8000`):

```text
http://127.0.0.1:8000/api/field-23
```

FastAPI exposes machine-readable schemas via **OpenAPI**:

- **Swagger UI:** `{ORIGIN}/docs`
- **OpenAPI JSON:** `{ORIGIN}/openapi.json`

Use those to inspect exact request/response models and try calls (PDF upload is often easier from Postman/Insomnia or the frontend than Swagger).

**CORS:** If the frontend runs on another origin (e.g. `localhost:3000` → API `localhost:8000`), the backend must allow CORS or you should use a **reverse proxy** in dev (e.g. Vite `server.proxy`) so the browser sees same-origin traffic. That is configured at the FastAPI / reverse-proxy level, not inside the `field_23` router.

---

## 2. Product flow (what the user does)

1. **Upload law PDF(s)** → split into articles (`split-law`).
2. **Compare** two article lists (e.g. initial vs final) → list of **diffs** with segments (`compare-laws`).
3. **Show the diff** in the UI (old / new text, highlight changes from `segments`).
4. **Detail slider** on the frontend: filter which diffs you show (e.g. by `token_change_fraction` or `change_type`) — that logic lives in the UI.
5. **For one article pair** (as in the diff): call **`attribute-legislative-comments`** with `initial_article` / `final_article` → LLM judgements for comments loaded on the backend (JSON) that match `article_number`.

---

## 3. Shared shape: `ArticleOut`

All articles in JSON bodies share the same shape:

| Field | Type | Note |
|-------|------|------|
| `article_number` | `string` | Must **match** `target_article_number` in the comments file for comments to load in the attribution step |
| `header` | `string` | May be empty |
| `title` | `string` | |
| `body` | `string` | Full article body |

```json
{
  "article_number": "3",
  "header": "",
  "title": "Subject matter",
  "body": "Full text..."
}
```

---

## 4. Endpoint: `POST /api/field-23/split-law`

**Purpose:** From one law PDF, return a list of articles (`ArticleOut[]`).

**Content-Type:** `multipart/form-data`

**File field name:** `law_pdf` (one PDF file).

### Example `fetch` (browser)

```ts
const form = new FormData();
form.append("law_pdf", pdfFile); // File from <input type="file">

const res = await fetch(`${API_BASE}/api/field-23/split-law`, {
  method: "POST",
  body: form,
});
if (!res.ok) throw new Error(await res.text());
const data: SplitLawResponse = await res.json();
// data.articles — ArticleOut[]
```

### Response: `SplitLawResponse`

```json
{
  "articles": [
    {
      "article_number": "1",
      "header": "...",
      "title": "...",
      "body": "..."
    }
  ]
}
```

**Note:** Perform two such calls (or one if you already have the second list from elsewhere) to obtain `initial_law_articles` and `final_law_articles` before `compare-laws`.

---

## 5. Endpoint: `POST /api/field-23/compare-laws`

**Purpose:** Compare two article lists; returns **diffs** (matched articles, additions, removals, segments for a diff UI).

**Content-Type:** `application/json`

### Body: `CompareLawsRequest`

| Field | Type | Required |
|-------|------|----------|
| `initial_law_articles` | `ArticleOut[]` | Yes |
| `final_law_articles` | `ArticleOut[]` | Yes |
| `normalize_before_diff` | `boolean` | No (default `false`) |

If `normalize_before_diff: true`, text is normalized before the token diff (punctuation, lowercase, accents, whitespace) — useful to mirror legacy “normalize compare” behaviour.

### Example body

```json
{
  "initial_law_articles": [
    { "article_number": "1", "header": "", "title": "Purpose", "body": "..." }
  ],
  "final_law_articles": [
    { "article_number": "1", "header": "", "title": "Purpose", "body": "..." }
  ],
  "normalize_before_diff": false
}
```

### Response: `CompareLawsResponse`

| Field | Type |
|-------|------|
| `diffs` | `ArticleDiffOut[]` |

#### `ArticleDiffOut`

| Field | Type | Description |
|-------|------|-------------|
| `old_article` | `ArticleOut \| null` | Article from the initial list (`null` for a pure addition) |
| `new_article` | `ArticleOut \| null` | Article from the final list (`null` if removed) |
| `change_type` | `string` | See table below |
| `similarity_score` | `number` | 0–1, matching similarity |
| `token_change_fraction` | `number` | 0–1, how much the text changed at token level |
| `segments` | `DiffSegmentOut[]` | For diff highlighting in the UI |

#### `change_type` values (aligned with the backend)

| Value | Meaning (for the UI) |
|-------|----------------------|
| `unchanged` | Same substance (number may match) |
| `renumbered` | Renumbered without substantive text change |
| `renumbered_modified` | Renumbered and text changed |
| `modified` | Text modified |
| `removed` | Removed (only `old_article` present) |
| `added` | Added (only `new_article` present) |

#### `DiffSegmentOut`

| Field | Type | UI usage |
|-------|------|----------|
| `operation` | `string` | Typically: `equal`, `insert`, `delete` |
| `text` | `string` | Text chunk for that operation |

For **side-by-side** or **inline** diff, build the view from the `segments` order (classic diff semantics: `equal` shared, `delete` removed side, `insert` added side).

### Example `fetch`

```ts
const res = await fetch(`${API_BASE}/api/field-23/compare-laws`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    initial_law_articles,
    final_law_articles,
    normalize_before_diff: false,
  }),
});
const data: CompareLawsResponse = await res.json();
```

**Performance:** The handler runs as a **sync** route on a worker thread; for large laws keep a loading state and avoid firing many heavy compares at once without reason.

---

## 6. Endpoint: `POST /api/field-23/attribute-legislative-comments`

**Purpose:** For each initial/final article pair, the backend:

1. Loads comments from **`data/legislative_comments.json`** where `target_article_number` matches `article_number` on `initial_article` or `final_article`.
2. Calls **Google Gemini** (via LangChain) and returns **one judgement per comment** (contribution likelihood + rationale in Greek).

**Content-Type:** `application/json`

**Server requirement:** Environment variable **`GOOGLE_API_KEY`**. If missing, HTTP **503** with a Greek `detail` message.

### Body: `AttributeLegislativeCommentsRequest`

| Field | Type | Constraints |
|-------|------|----------------|
| `items` | `ArticleChangeCommentsItem[]` | 1–30 items |
| `model` | `string \| null` | Optional Gemini model name; default: `FIELD_23_COMMENT_ATTRIBUTION_MODEL` env or `gemini-2.0-flash` |

#### `ArticleChangeCommentsItem`

| Field | Type | Note |
|-------|------|------|
| `item_index` | `number` (≥ 0) | **Your own correlation id** for the diff row / modal (the backend echoes it unchanged) |
| `initial_article` | `ArticleOut \| null` | At least one of `initial_article`, `final_article` is required |
| `final_article` | `ArticleOut \| null` | |

**Important:** Comments are **not** sent from the frontend. The `article_number` values on the articles you send must **match** `target_article_number` on backend JSON rows (after `trim`). If nothing matches, that `item` returns `contributions: []` with no LLM call.

### Example: one modified article

Use the same `ArticleOut` objects as in the corresponding `ArticleDiffOut.old_article` / `new_article`:

```json
{
  "items": [
    {
      "item_index": 42,
      "initial_article": {
        "article_number": "3",
        "header": "",
        "title": "...",
        "body": "..."
      },
      "final_article": {
        "article_number": "3",
        "header": "",
        "title": "...",
        "body": "..."
      }
    }
  ],
  "model": null
}
```

### Example: removal-only / addition-only

- **Removal:** full `initial_article`, `final_article: null`
- **Addition:** `initial_article: null`, full `final_article`

### Response: `AttributeLegislativeCommentsResponse`

```json
{
  "items": [
    {
      "item_index": 42,
      "contributions": [
        {
          "comment_id": "demo-002",
          "contribution_likelihood": "medium",
          "rationale_el": "..."
        }
      ]
    }
  ]
}
```

#### `contribution_likelihood`

| Value | Suggested UI treatment |
|-------|-------------------------|
| `none` | Hide as “relevant” or de-emphasize |
| `low` | Secondary |
| `medium` | Visible |
| `high` | Emphasize |

`rationale_el` is **Greek** prose (1–3 sentences) from the model.

### Example `fetch`

```ts
const res = await fetch(`${API_BASE}/api/field-23/attribute-legislative-comments`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    items: [
      {
        item_index: diffListIndex,
        initial_article: diff.old_article,
        final_article: diff.new_article,
      },
    ],
  }),
});
if (res.status === 503) {
  // GOOGLE_API_KEY missing on server
}
const data: AttributeLegislativeCommentsResponse = await res.json();
```

**Performance:** The route is **async**; latency depends on Gemini and text size. For many `items` (up to 30) the server uses bounded parallelism — still heavy: show loading, avoid spamming calls.

**Optional env:** `FIELD_23_COMMENT_ATTRIBUTION_MODEL` — override the default model without a frontend change (if the server admin sets it).

---

## 7. Comment data (coordination with backend / legal team)

File path:

`backend/app/features/field_23/data/legislative_comments.json`

List shape:

```json
[
  {
    "id": "unique-string-id",
    "target_article_number": "3",
    "text": "Full comment text..."
  }
]
```

- **`id`** is returned as `comment_id` in the attribution response.
- **`target_article_number`** must match the **`article_number`** on the `ArticleOut` objects you send to `attribute-legislative-comments` (so the comment is loaded).

After adding or editing JSON rows, the server usually needs a **restart** (loading is cached with `lru_cache` in the loader).

---

## 8. Error handling (short)

| HTTP | When |
|------|------|
| **422** | Invalid JSON body (Pydantic validation), e.g. both articles `null` on an `item` |
| **503** | `attribute-legislative-comments` without `GOOGLE_API_KEY` |
| Other **4xx/5xx** | Inspect FastAPI error JSON `detail` or server logs |

For **`split-law`**, wrong file type or parse failures may yield 4xx/5xx depending on implementation — test with a valid PDF.

---

## 9. Pre-merge UI checklist

- [ ] Stable `API_BASE` per environment (dev/staging/prod).
- [ ] `split-law`: `FormData` with field name **`law_pdf`**.
- [ ] `compare-laws`: same `ArticleOut` shape as returned by split (or equivalent).
- [ ] Diff UI from `segments` + optional `change_type` / `token_change_fraction` if you use a detail slider.
- [ ] `attribute-legislative-comments`: `item_index` for correlation; `article_number` aligned with the comments JSON.
- [ ] Loading state and handling for **503** / LLM timeouts.
- [ ] CORS or dev proxy configured.

---

## 10. Folder layout (reference)

Backend pieces for Field 23:

- `router.py` — HTTP route declarations.
- `schemas.py` — Pydantic models = JSON contract with the frontend.
- `services/comparison/` — comparison pipeline.
- `services/comments/` — JSON load, prompts, LLM call.
- `data/legislative_comments.json` — stored comments for attribution.

For backend implementation questions, start at `router.py` and follow imports.
