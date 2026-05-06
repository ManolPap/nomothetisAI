# Frontend Implementation Plan

## 1. Goal and Deliverable

Implement a unified frontend workflow for `field6`, `field9`, and `field-23` that provides:

- a clear multi-step Human-in-the-Loop UX using wizard-style flows,
- safe and consistent integration with backend endpoints,
- user confirmation and correction capabilities at every critical step,
- robust handling of loading, error, empty, and retry states,
- maintainable code through shared services, typed API contracts, and reusable UI patterns,
- predictable state invalidation when upstream user inputs change,
- production-ready validation, accessibility, and testing coverage.

---

## 2. Backend Contract Summary

### Field 6 — `/field6`

4-step HITL workflow:

- `POST /extract-metadata`  
  PDF upload using form field: `file`  
  Returns: `{ metadata: LawMetadata, nim_text: string }`

- `POST /web-search`  
  Body: `{ metadata: LawMetadata, nim_text: string }`  
  Returns: `{ sources: WebSource[], facts_text: string }`

- `POST /eurostat`  
  Body: `{ metadata: LawMetadata, facts_text: string }` ← **requires both fields**  
  Returns: `{ eurostat_data: Record<string, EurostatCountryEntry>, indicator_name: string }`

- `POST /synthesize`  
  Body: `{ metadata: LawMetadata, facts_text: string, eurostat_text: string, selected_sources: WebSource[] }`  
  Returns: `{ field6_text: string, word_count: number }`

### Field 9 — `/field9`

3-step HITL workflow:

- `POST /extract-sector`  
  PDF upload using form field: `file`  
  Returns: `{ sector: string, year: number, law_title: string }`

- `POST /suggest-indicators`  
  Body: `{ sector: string, year: number, law_title: string }`  
  Returns: `{ suggestions: IndicatorSuggestion[] }`

- `POST /fetch-data`  
  Body: `{ selected_indicators: string[], year: number }` ← `selected_indicators` contains **`dataset_id` strings** (e.g. `"lfsa_urgan"`), not display names  
  Returns: `{ indicators: IndicatorData[], reference_year: number, five_year_range: number[] }`

### Field 23 — `/api/field-23`

Split, compare, and legislative comments attribution workflow:

- `POST /split-law`  
  PDF upload using form field: `law_pdf`  
  Returns: `{ articles: ArticleOut[] }`

- `POST /compare-laws`  
  Body: `{ initial_law_articles: ArticleOut[], final_law_articles: ArticleOut[], normalize_before_diff: boolean }`  
  Returns: `{ diffs: ArticleDiffOut[] }`

- `POST /attribute-legislative-comments`  
  Body: `{ items: ArticleChangeCommentsItem[], model?: string }` ← `model` is optional; omit to use backend default (Gemini)  
  Returns: `{ items: ItemAttributionOut[] }`

---

## 3. Frontend Architecture

### 3.1 Proposed Folder Structure

```text
frontend/src/
  app/
    router.tsx
    providers/
    config/
      env.ts
  shared/
    api/
      client.ts
      errors.ts
      types.ts
    ui/
      StepHeader/
      LoadingPanel/
      ErrorBanner/
      EmptyState/
      ConfirmDialog/
      FileUploader/
    utils/
      buildUrl.ts
      validation.ts
      text.ts
    types/
  features/
    field6/
      api/
      types/
      state/
      components/
      pages/
      utils/
    field9/
      api/
      types/
      state/
      components/
      pages/
      utils/
    field23/
      api/
      types/
      state/
      components/
      pages/
      utils/
```

## Frontend Implementation Steps

## Step 1 — Environment and Bootstrap

- Define the API base URL through environment variables.

```env
VITE_API_BASE=http://127.0.0.1:8000
```

- Add local fallback configuration.
- Confirm backend base paths for all features:
  - Field 6: `/field6`
  - Field 9: `/field9`
  - Field 23: `/api/field-23`
- Configure a Vite dev proxy if needed for CORS.
- Create a central `buildUrl(path)` helper.
- Avoid hardcoded API paths inside UI components.
- Keep endpoint definitions inside feature API modules.

---

## Step 2 — Shared API Client and Error Model

- Implement a shared API client in `shared/api/client.ts`.
- Add helpers for:
  - `getJson`
  - `postJson`
  - `postFormData`
- Add timeout support using `AbortController`.
- Parse FastAPI error responses consistently.
- Support error response shapes where `detail` can be:
  - string,
  - array,
  - object,
  - missing or unknown.
- Implement an `ApiError` class with:
  - `status`
  - `message`
  - `detail`
  - `cause`
- Standardize handling for:
  - `400` — invalid input (e.g. non-PDF upload); show inline validation message
  - `422` — two distinct scenarios requiring different UX:
    - **FastAPI validation error**: malformed request payload; show field-level error if `detail` is an array
    - **PDF parse error**: the file is unreadable or corrupt; show a dedicated "could not read PDF" message — the backend returns `422` with a plain string `detail` in this case
  - `503` — dependency unavailable (e.g. missing API key); show service-unavailable message with retry
  - generic `5xx` — show generic error with retry
  - timeout errors — show timeout message with retry
  - network errors — show offline/unreachable message
- Distinguish `422` source by checking whether `detail` is a `string` (PDF parse) or an `array` (FastAPI field validation).
- Do not expose raw backend stack traces to users.

---

## Step 3 — Shared UI States and Components

- Create reusable UI components:
  - `LoadingPanel`
  - `InlineRetry`
  - `ErrorBanner`
  - `EmptyState`
  - `StepHeader` — minimum props: `{ title: string; stepNumber: number; totalSteps: number; description?: string }`
  - `StepContainer` — minimum props: `{ children: ReactNode; onBack?: () => void; onNext?: () => void; nextDisabled?: boolean; isLoading?: boolean }`
  - `ConfirmDialog` — minimum props: `{ open: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void }`
  - `FileUploader` — minimum props: `{ onFile: (file: File) => void; accept?: string; disabled?: boolean; label: string }`
- Disable submit controls while requests are in progress.
- Prevent duplicate submissions.
- Reset stale success and error states when moving between steps.
- Preserve user edits during Back/Next navigation.
- Show inline validation messages next to inputs.
- Add accessibility support:
  - use labels for all inputs,
  - use `aria-busy` for loading states,
  - use `role="alert"` for errors,
  - ensure keyboard navigation works across wizard steps,
  - do not rely only on color to communicate status.

---

## Step 4 — Field 6: Domain Types and API Layer

- Create TypeScript domain types:
  - `LawMetadata`
  - `WebSource`
  - `MetadataResponse`
  - `WebSearchResponse`
  - `EurostatCountryEntry` — shape: `{ name: string; values: Record<string, number>; indicator: string; dataset_id: string; url: string }`
  - `EurostatResponse` — shape: `{ eurostat_data: Record<string, EurostatCountryEntry>; indicator_name: string }`
  - `SynthesizeResponse`
- Implement API functions:
  - `extractMetadata(file: File)`
  - `webSearch(payload: { metadata: LawMetadata; nim_text: string })`
  - `fetchEurostat(payload: { metadata: LawMetadata; facts_text: string })` ← **requires both `metadata` and `facts_text`**
  - `synthesizeField6(payload: { metadata: LawMetadata; facts_text: string; eurostat_text: string; selected_sources: WebSource[] })`
- Ensure PDF upload uses FormData key:

```text
file
```

- Add guards for:
  - missing metadata,
  - empty `nim_text`,
  - malformed `facts_text`,
  - empty `eurostat_data`,
  - missing sources,
  - partial synthesis responses.
- Keep transformation logic separate:
  - `facts_text` parser,
  - Eurostat response normalizer,
  - selected Eurostat entries to `eurostat_text` — use this exact format:

```text
Eurostat — {indicator_name} για χώρες που εφάρμοσαν συναφείς πρακτικές:
{country_name}: {value}% ({year}), ...
(Πηγή: Eurostat, {dataset_id}, {url})
```

---

## Step 5 — Field 6: Wizard UI

### Step 5.1 — Upload and Metadata Review

- Add PDF uploader.
- Validate file as PDF.
- Call:

```text
POST /field6/extract-metadata
```

- Show editable metadata form.
- Display `nim_text`.
- Disable Next until metadata extraction succeeds.
- Allow user edits before continuing.
- If a new PDF is uploaded, invalidate:
  - extracted metadata,
  - web facts,
  - Eurostat results,
  - synthesis output.

### Step 5.2 — Web Facts Selection

- Call:

```text
POST /field6/web-search
```

- Use reviewed metadata and `nim_text` as input.
- Parse `facts_text` into selectable facts, for example:
  - `FACT_i`
  - `FACT_ii`
  - `FACT_iii`
- Show facts as checkbox options.
- Show sources in a selectable table or card list.
- Store:
  - selected facts,
  - selected sources.
- Show empty state if no facts are returned.
- Add a resilient fallback when parsing fails:
  - show raw `facts_text` in a readable block,
  - allow manual line-based selection,
  - allow full-text pass-through to synthesis if the user confirms.
- Preserve user selections when navigating back.

### Step 5.3 — Eurostat Selection

- Call:

```text
POST /field6/eurostat
```

- Send both `metadata` and `facts_text` in the request body — the backend uses `metadata` to select the Eurostat dataset and `facts_text` to identify which countries to query.
- Display Eurostat results grouped by country code key (e.g. `"DE"`, `"FR"`), using the `name` field as the display label.
- For each country show: `name`, yearly `values` (year → number), `indicator`, and a link to `url`.
- Allow user to include or exclude countries or individual year entries.
- Generate `eurostat_text` from selected entries (see format in Step 4).
- If Eurostat selection changes after synthesis has been generated, invalidate the synthesis output and require re-run.
- Show empty state if `eurostat_data` is empty or returns no countries.
- Preserve user selections when navigating back.

### Step 5.4 — Synthesis

- Call:

```text
POST /field6/synthesize
```

- Submit only selected:
  - facts,
  - sources,
  - Eurostat entries.
- Show editable `field6_text`.
- Add live word counter.
- Target output length: `<= 250 words`.
- Warn if output exceeds 250 words.
- Allow final manual review and editing.

---

## Step 6 — Field 9: Domain Types and API Layer

- Create TypeScript domain types:
  - `IndicatorSuggestion` — shape: `{ dataset_id: string; indicator_name: string; description: string; sector: string; relevance_reason: string }`
  - `YearlyValue` — shape: `{ year: number; value: number | null }`
  - `IndicatorData` — shape: `{ dataset_id: string; indicator_name: string; description: string; values: YearlyValue[]; unit: string; eurostat_url: string }`
  - `ExtractSectorResponse`
  - `SuggestIndicatorsResponse`
  - `FetchDataResponse`
- Implement API functions:
  - `extractSector(file: File)`
  - `suggestIndicators(payload: { sector: string; year: number; law_title: string })`
  - `fetchIndicatorData(payload: { selected_indicators: string[]; year: number })` ← `selected_indicators` is a list of **`dataset_id` strings** taken directly from `IndicatorSuggestion.dataset_id`; do not send `indicator_name`
- Ensure PDF upload uses FormData key:

```text
file
```

- Add defensive checks for:
  - missing `sector`,
  - invalid `year`,
  - missing `law_title`,
  - empty suggestions,
  - selected indicators not found in returned suggestions,
  - `value: null` entries in `YearlyValue` (display as `—` or `N/A`),
  - partial indicator data.

---

## Step 7 — Field 9: Wizard UI

### Step 7.1 — Extract and Edit Sector Metadata

- Add PDF uploader.
- Validate file as PDF.
- Call:

```text
POST /field9/extract-sector
```

- Show editable fields:
  - `sector`
  - `year`
  - `law_title`
- Validate `year` as a reasonable numeric year.
- Disable Next until extraction succeeds and required fields are valid.
- If a new PDF is uploaded, invalidate:
  - extracted sector data,
  - indicator suggestions,
  - fetched indicator data.
- If `sector`, `year`, or `law_title` changes after suggestions were generated, invalidate:
  - indicator suggestions,
  - fetched indicator data.

### Step 7.2 — Indicator Suggestions

- Call:

```text
POST /field9/suggest-indicators
```

- Show suggestions as a checkbox list.
- Require at least one selected indicator before continuing.
- Show per-suggestion metadata:
  - `indicator_name` — display label,
  - `dataset_id` — shown as a secondary identifier,
  - `description` — what the indicator measures,
  - `relevance_reason` — why the backend considers it relevant to this specific law.
- Preserve selections when navigating back.
- Show empty state if no suggestions are returned.

### Step 7.3 — Indicator Data Table

- Call:

```text
POST /field9/fetch-data
```

- Build the request payload from the selected suggestions: collect `dataset_id` from each selected `IndicatorSuggestion` and send as `selected_indicators: string[]`.
- Render a dynamic data table with:
  - indicator name,
  - dataset ID,
  - five-year range (from `five_year_range` array in the response),
  - reference year (from `reference_year`),
  - yearly values (render `null` values as `—`),
  - Eurostat URL,
  - user-managed 3-year target input.
- Open external links safely with:

```text
target="_blank"
rel="noopener noreferrer"
```

- Show empty state if no data is returned.
- Preserve user-entered target values locally.

---

## Step 8 — Field 23: Domain Types and API Layer

- Create TypeScript domain types:
  - `ArticleOut` — shape: `{ article_number: string; header: string; title: string; body: string }`
  - `DiffSegmentOut` — shape: `{ operation: 'equal' | 'delete' | 'insert'; text: string }`
  - `ArticleDiffOut` — shape: `{ old_article: ArticleOut | null; new_article: ArticleOut | null; change_type: ChangeType; similarity_score: number; token_change_fraction: number; segments: DiffSegmentOut[] }`
  - `ChangeType` — use this union: `'added' | 'removed' | 'modified' | 'unchanged'`
  - `SplitLawResponse`
  - `CompareLawsRequest`
  - `CompareLawsResponse`
  - `AttributeLegislativeCommentsRequest`
  - `AttributeLegislativeCommentsResponse`
  - `CommentContributionOut` — shape: `{ comment_id: string; contribution_likelihood: 'none' | 'low' | 'medium' | 'high'; rationale_el: string }`
- Implement API functions:
  - `splitLaw(file: File)`
  - `compareLaws(payload)`
  - `attributeComments(payload)` ← optionally accept a `model?: string` override field; omit from UI unless an advanced model selector is required
- Ensure PDF upload uses FormData key:

```text
law_pdf
```

- Add attribution payload constraints:
  - `items.length` must be between `1` and `30`,
  - at least one of `initial_article` or `final_article` must be non-null,
  - `item_index` must be stable and unique within the request.
- Add defensive checks for:
  - failed split results,
  - empty article lists,
  - invalid article IDs,
  - empty diff segments,
  - missing attribution results,
  - partial attribution responses.

---

## Step 9 — Field 23: Compare and Attribution UI

### Step 9.1 — Law Input

- Add upload fields for:
  - initial law PDF,
  - final law PDF.
- Validate both files as PDFs.
- Clearly label initial and final law.
- Optionally support preloaded article lists if the product requires it.
- If either PDF changes, invalidate:
  - split results,
  - comparison results,
  - attribution results.

### Step 9.2 — Split Laws

- Call the split endpoint for each PDF:

```text
POST /api/field-23/split-law
```

- Store extracted `articles` for each law.
- Show article counts for each law.
- Allow users to inspect extracted articles before comparison.
- Show empty state if no articles are found.

### Step 9.3 — Compare Laws

- Call:

```text
POST /api/field-23/compare-laws
```

- Add toggle for:

```text
normalize_before_diff
```

- Store returned `diffs`.
- If `normalize_before_diff` changes, invalidate:
  - comparison results,
  - attribution results.
- Show summary counts by `change_type` using these known values: `added`, `removed`, `modified`, `unchanged`.
- Add filters for:
  - `change_type` — render as a multi-select using the four known values above,
  - `token_change_fraction`,
  - article number,
  - article title if available.

### Step 9.4 — Diff Viewer

- Render ordered diff `segments`.
- Support inline or side-by-side rendering.
- Visually distinguish segment types using `DiffSegmentOut.operation`:
  - `equal` — unchanged text (neutral/muted),
  - `delete` — removed text (highlight red or strikethrough),
  - `insert` — added text (highlight green or underline).
- Keep article-level context visible.
- Do not rely only on color to distinguish changes.
- Collapse or virtualize very large diffs.
- Define explicit rendering thresholds:
  - virtualize diff list when `diffs.length > 100`,
  - collapse segment rendering by default when a diff has `> 300` segments,
  - lazy-render segment chunks for very long article bodies.

### Step 9.5 — Legislative Comments Attribution

- For a selected diff row, call:

```text
POST /api/field-23/attribute-legislative-comments
```

- Use `item_index` as a stable correlation ID.
- Display attribution results per contribution using `contribution_likelihood` values: `none`, `low`, `medium`, `high`.
- Display `rationale_el` (Greek rationale text) per contribution.
- Use a modal, drawer, or side panel.
- Do not block the entire page while attribution is running.
- Handle partial attribution results.
- Allow retry on failed attribution requests.

**Long-running request handling:**
- Attribution calls can take up to ~15s; show a spinner with an informational message (e.g. "Ανάλυση σχολίων...") for the duration.
- Use an `AbortController` with a generous timeout (≥ 30s) — do not apply the standard short timeout to this endpoint.
- If the user closes the panel or navigates away, abort the in-flight request.
- Do not auto-retry on timeout; require explicit user retry action.
- Track and log attribution request duration for the staging KPI (`> 12s` alert threshold).

### Step 9.6 — Special `503` Handling

- If attribution returns `503`, show a dependency-unavailable message.
- Mention missing `GOOGLE_API_KEY` only if the backend error detail confirms that cause.
- Otherwise show a generic service-unavailable retry message.

---

## Step 10 — Feature-Level State Management

- Define a step state machine per feature:

```ts
type StepStatus = 'idle' | 'loading' | 'ready' | 'error';
```

- Store wizard data per step.
- Preserve user edits during Back/Next navigation.
- Keep server state and local wizard state conceptually separate.
- Use strict downstream invalidation rules.
- Use a strict ownership split:
  - reducer state machines own local wizard state and transitions,
  - React Query (TanStack Query) owns server state, caching, retries, and request status,
  - reducer state should not duplicate full server payloads unless local editing is required.

### Invalidation Rules

| Upstream Change | Invalidate |
|---|---|
| New Field 6 PDF | metadata, web facts, Eurostat results, synthesis |
| Edited Field 6 metadata | web facts, Eurostat results, synthesis |
| Changed Field 6 fact/source selection | synthesis |
| Changed Field 6 Eurostat country/entry selection | synthesis |
| New Field 9 PDF | extracted sector, suggestions, fetched data |
| Edited Field 9 sector/year/title | suggestions, fetched data |
| Changed selected Field 9 indicators | fetched data |
| New Field 23 PDF | split results, diffs, attribution |
| Changed `normalize_before_diff` | diffs, attribution |
| Changed selected diff item | attribution result |

- Optionally persist non-sensitive draft state in `sessionStorage`.
- Do not persist uploaded files unless explicitly required.
- Provide a clear `Clear draft` action if persistence is added.
- Prefer feature-local state first.
- Use reducer-based state machines for complex wizard transitions.
- Use React Query or TanStack Query for server state, retries, and caching if already used in the project.

---

## Step 11 — Validation and UX Rules

- Define a shared validation layer as a single source of truth:
  - request payload schemas per endpoint,
  - form schemas per wizard step,
  - shared file-validation helper for uploads.
- Reuse shared schemas in both UI validation and API payload guards.
- Accept only PDF files.
- Validate both MIME type and file extension where possible.
- Disable submit buttons until required inputs are valid.
- Show inline validation messages next to the relevant fields.
- Prevent duplicate submissions while a request is in progress.
- Confirm destructive upstream changes before clearing downstream generated data.
- Provide empty states for every no-data scenario.
- Preserve user edits during Back/Next navigation.
- Reset stale success and error messages when moving between steps.
- Ensure keyboard navigation works across all wizard steps.
- Ensure errors are screen-reader friendly.
- Do not rely only on color to communicate diff changes.

### Field 6 Empty States

- No metadata extracted.
- No `nim_text` returned.
- No web facts returned.
- No sources returned.
- No `eurostat_data` returned.
- No synthesis text returned.

### Field 9 Empty States

- No sector extracted.
- No indicator suggestions returned.
- No selected indicators.
- No indicator data fetched.
- No Eurostat URL available.

### Field 23 Empty States

- No articles extracted from initial law.
- No articles extracted from final law.
- No diff results returned.
- No diff segments available.
- No attribution contributions returned.

---

## Step 12 — Testing Strategy

### Unit Tests

- Test API payload builders.
- Test URL builders.
- Test FastAPI error parsing.
- Test timeout handling.
- Test `facts_text` parser.
- Test Eurostat text composer.
- Test Field 9 selected indicator payload builder.
- Test Field 23 compare payload builder.
- Test diff segment rendering helpers.
- Test state invalidation reducers.

### Component Tests

- Test step transitions.
- Test upload validation.
- Test checkbox selection logic.
- Test disabled submit states.
- Test editable metadata forms.
- Test Back/Next behavior.
- Test dynamic table rendering.
- Test empty states.
- Test error states.
- Test retry behavior.
- Test confirmation dialogs for upstream changes.

### Integration Tests with Mock API

Cover happy paths for:

- Field 6 full workflow.
- Field 9 full workflow.
- Field 23 split, compare, and attribution workflow.

Cover edge cases for:

- `400` responses.
- `422` responses.
- `503` responses.
- generic `5xx` responses.
- timeout errors.
- network errors.
- empty arrays.
- malformed optional fields.
- partial backend responses.
- slow backend responses.
- duplicate submit attempts.

### Manual QA

Test with:

- Greek legal text.
- large PDFs.
- scanned or low-quality PDFs if supported by the backend.
- slow backend responses.
- retry behavior.
- browser refresh during wizard progress.
- Back/Next navigation.
- keyboard-only navigation.
- staging API configuration.
- missing backend dependency for Field 23 attribution.
- long diff results.
- empty Eurostat responses.
- empty indicator suggestions.

---

## Step 13 — Observability and Production Readiness

- Add development-only structured logs for:
  - endpoint name,
  - request duration,
  - response status,
  - timeout events,
  - retry attempts.
- Add lightweight analytics events if permitted:
  - wizard started,
  - step completed,
  - API failure by status code,
  - workflow completed,
  - retry clicked.
- Do not log sensitive data:
  - uploaded file content,
  - full legal text,
  - extracted law text,
  - generated synthesis text,
  - legislative comments attribution content,
  - personally identifiable information.
- Verify environment variables in:
  - development,
  - staging,
  - production.
- Verify production configuration:
  - `VITE_API_BASE`,
  - CORS,
  - request timeout,
  - retry policy,
  - error boundaries (see granularity below),
  - source maps policy,
  - logging level.
- Define error boundary granularity:
  - one top-level boundary per feature page (Field 6, Field 9, Field 23),
  - one additional boundary around the Field 23 diff viewer (large renders can crash),
  - one boundary around the attribution panel (isolated async failure),
  - fallback UI must show a "reload this section" action, not a blank screen,
  - boundary errors should be captured to an error tracking service (e.g. Sentry) in production.
- Add release gates:
  - no blocking console errors,
  - no unhandled promise rejections,
  - all core flows work end-to-end in staging,
  - all required endpoints are reachable,
  - upload field names are verified,
  - large-response rendering remains usable,
  - accessibility checks pass,
  - manual QA checklist is completed.
- Add measurable staging KPIs:
  - p95 step transition from user click to visible state change < `150ms`,
  - p95 time-to-first-render for Field 23 diff list < `1200ms` (at 100 diffs),
  - p95 attribution request duration tracked and alerted when > `12s`,
  - endpoint error rate during validation runs < `2%`.

---

## Step 14 — Final Definition of Done

- [ ] Separate routes or pages exist for Field 6, Field 9, and Field 23.
- [ ] Shared API client is implemented and used by all features.
- [ ] Shared error model is implemented.
- [ ] Shared loading, error, retry, empty, and confirmation components exist.
- [ ] Reducer and React Query responsibilities are clearly separated.
- [ ] Each endpoint is called with the correct `Content-Type`.
- [ ] Upload endpoints use the correct form field names:
  - Field 6: `file`
  - Field 9: `file`
  - Field 23: `law_pdf`
- [ ] Field 6 full wizard flow is implemented.
- [ ] Field 9 full wizard flow is implemented.
- [ ] Field 23 split, compare, and attribution flow is implemented.
- [ ] All HITL editable points are implemented.
- [ ] User edits are preserved when navigating Back/Next.
- [ ] Upstream changes correctly invalidate downstream generated data.
- [ ] Robust handling exists for:
  - `400`,
  - `422`,
  - `503`,
  - generic `5xx`,
  - timeout,
  - network errors.
- [ ] Loading states are shown for every API request.
- [ ] Retry states are available where appropriate.
- [ ] Empty states are covered for every no-data scenario.
- [ ] Duplicate submissions are prevented.
- [ ] File validation accepts only PDFs.
- [ ] External links use safe attributes:
  - `target="_blank"`
  - `rel="noopener noreferrer"`
- [ ] Accessibility basics are covered.
- [ ] Core unit tests pass.
- [ ] Core component tests pass.
- [ ] Mock API integration tests pass.
- [ ] Manual QA has been completed with Greek text and large PDFs.
- [ ] No blocking console errors appear in staging.
- [ ] Dev, staging, and production environment variables are verified.
- [ ] CORS is verified.
- [ ] The UX remains stable under slow responses.
- [ ] The UX remains stable with partial or empty backend data.
- [ ] No sensitive legal text or uploaded content is logged.
- [ ] Staging KPI thresholds are measured and met.
- [ ] Error boundaries are in place at the correct granularity (feature, diff viewer, attribution panel).
- [ ] Attribution requests use a dedicated long-running timeout (≥ 30s) and abort on panel close.
- [ ] `422` from PDF parse is visually distinct from `422` field validation errors.
- [ ] `eurostat_text` format matches the backend expectation before synthesis is called.
