# Add-in Technical Documentation (Merged)

**Scope:** This document describes the add-in codebase only (UI, file selection, compare flow, save/export, email packaging, settings, and naming rules). It does not cover backend API implementation details beyond how the add-in calls them.

**Primary files:**
- `src\taskpane\taskpane.js`
- `src\taskpane\taskpane.html`
- `src\taskpane\taskpane.css`
- `src\taskpane\settings.html`
- `src\taskpane\settings.css`
- `src\taskpane\settings.js`
- `scripts\lint-naming.ps1`

---

## 1) Architecture Overview

The add-in is a single-page task pane UI that allows users to:
1. Select an Original and a Modified document.
2. Send both to a compare API.
3. View the comparison result in a browser window.
4. Save redlines in different formats.
5. Generate an Outlook `.eml` with selected attachments.

The implementation is entirely client-side JavaScript (Office.js), plus HTML/CSS for UI. No frameworks are used.

---

## 2) UI Structure (`src\taskpane\taskpane.html`)

### Core sections
- **Original document** selection
- **Modified document** selection
- **Swap files** button (between the two sections)
- **Compare** button
- **Cancel** button (appears during compare when enabled)
- **Result actions** (View, Save, Email, Reset)

### Inputs and controls (IDs)
- `#file-input-original` and `#file-input-modified`
  - Hidden file inputs with accepted types: `.doc`, `.docx`, `.rtf`, `.txt`, `.pdf`
- `#btn-compare`
  - Disabled until both files are selected
- `#result-actions`
  - Hidden until comparison completes
- **Save split-button**
  - `#btn-save-primary` + `#btn-save-toggle`
  - Dropdown: `#dd-menu`
- **Email split-button**
  - `#btn-email-primary` + `#btn-email-toggle`
  - Dropdown: `#email-menu`
- `#btn-view`, `#btn-reset`, `#status-wrap`, `#btn-swap-files`, `#btn-cancel-compare`
- Settings mount: `#settings-mount`

### Save dropdown options
```
PDF
Track Changes
docx
Redline Pages
```

### Email checkbox options
```
Original file
Modified file
Redline (PDF)
Redline (Docx)
Track Changes
Redline Pages
```

---

## 3) Settings UI (`src\taskpane\settings.html`)

### Settings panel and controls (IDs)
- Overlay: `#settings-overlay`
- Title: `#settings-title`
- Close: `#btn-close-settings`
- Save settings: `#btn-save-settings`
- Reset settings: `#btn-reset-settings`
- Reset confirm: `#settings-confirm`
- Confirm/Cancel: `#btn-confirm-reset`, `#btn-cancel-reset`

### Key fields
- `#enable-hints`
- `#default-save-folder` + `#btn-choose-save-folder` + `#btn-clear-save-folder`
- `#show-in-download-list`
- `#show-path-after-action`
- `#remember-last-folder`
- `#enable-cancel-compare`
- `#prefix-pdf`, `#prefix-docx`, `#prefix-track`, `#prefix-pages`
- `#name-template`
- `#email-subject-template`

---

## 4) Runtime State (`src\taskpane\taskpane.js`)

### Core state variables
- `originalFile`, `modifiedFile`
  - `Blob` or `File` objects
- `originalSource`, `modifiedSource`
  - `'current'` or `'local'`
- `comparisonUrl`
  - URL returned by compare API (`Location` header)
- `isComparing`
  - Disables Compare while a request is in-flight
- `compareAbortController`
  - Used to cancel compare when enabled

### UI helpers
- `setResult(text, isError, isWarning)`
  - Displays status/error messages
- `updateCompareButton()`
  - Enables Compare only when both files are present
- `updateSectionUI(section)`
  - Renders current state for each file section
- `clearFile(section)`
  - Resets selection, hides result actions, clears state

---

## 5) File Selection Flow

### A) Current Word Document
1. User clicks **Current Document** in a section.
2. `Office.context.document.getFileAsync(Office.FileType.Compressed)` fetches the document as slices.
3. `officeFileToBlob(file)` reassembles slices into a single Blob.
4. Filename is derived from `Office.context.document.url`.
5. If no extension is found, `.docx` is appended.

### B) Local File
1. User clicks **Local device**.
2. If File Picker API is supported (`showOpenFilePicker`):
   - The picker opens with document filters.
   - If **Remember last folder** is enabled, the picker starts in the last used folder for that section.
   - The last folder handle is stored in IndexedDB per section (`lastOriginalFileHandle`, `lastModifiedFileHandle`).
3. Otherwise, the hidden file input is opened.
4. Selected file is stored as a `File` object.

### Notes
- The add-in allows `.doc`, `.docx`, `.rtf`, `.txt`, `.pdf`.
- If both selected files share the same name, a warning is shown but compare is still allowed.

---

## 6) Compare Flow

### API endpoint
```
POST http://localhost/WorkshareCompareApi/api/uicompare
```

### Request
- `multipart/form-data`
- `file1`: original document
- `file2`: modified document

### Response handling
- On **201**: reads the `Location` header and stores it in `comparisonUrl`.
- Result actions are shown.
- On error: status text is displayed and actions are hidden.
- If Cancel is enabled, a **Cancel** button appears during compare and aborts the request.

---

## 6.1) Swap Files

- **Swap** button exchanges Original and Modified selections.
- Clears `comparisonUrl` and hides result actions after swap.

---

## 7) Save / Export Flow

### Entry points
- Primary save button → `triggerDownload('pdf')`
- Dropdown items → `triggerDownload(format)`

### Download flow
1. Build a suggested filename with `generateFileName()`.
2. Resolve a download URL via `getComparisonDownloadUrl(format)`.
3. Fetch as `Blob`.
4. Save behavior depends on settings:
   - **Show in download list** enabled → save via `executeBlobDownload`.
   - **Show in download list** disabled + default folder selected → save via File System Access API.
   - **Show in download list** disabled + no default folder → save via `executeBlobDownload`.
5. If **Show saved path** is enabled, the status line includes the resolved path label.

### Save progress messages
- “Preparing {FORMAT} download…”
- “Saving {suggestedName}…”
- Success (when showing path): “Saved to {Folder}\{File}”
- Success (when not showing path): “Save complete.” / “Download complete.”
- Error path: “Error saving file: {message}”

---

## 8) Format-Specific Download Routing

All download URLs are derived from `comparisonUrl`, which is the `Location` header returned by the compare API.

### Base extraction
- `comparisonId` is the last path segment of `comparisonUrl`.
- `baseUrl` is the origin of `comparisonUrl`.

### Format handling
- **`track_changes`**
  1. `POST {baseUrl}/WorkshareCompareApi/api/Comparison/{comparisonId}/tccreate`
  2. If **201**, the `Location` header is used as the final download URL.

- **All other formats (`pdf`, `docx`, `changedPagesPdf`)**
  1. `GET {baseUrl}/WorkshareCompareApi/api/Comparison/{comparisonId}/prepareDownload?format={format}`
  2. If OK, the final download URL is:
     - PDF:
       - `{baseUrl}/WorkshareCompareApi/api/Comparison/{comparisonId}/download`
     - Non-PDF:
       - `{baseUrl}/WorkshareCompareApi/api/Comparison/{comparisonId}/download?format={format}`

---

## 9) Redline Name and File Naming Rules

### Base name selection
- Uses `getBaseName(fileName)` to strip file extensions.
- If filename is missing: defaults to `"Document"`.

### Constructed naming format
```
{Prefix}{OriginalBaseName} and {ModifiedBaseName}{Extension}
```

### Prefix and extension rules
- `pdf` → `Redline - ` + `.pdf`
- `docx` → `Redline - ` + `.docx`
- `track_changes` → `Track Changes - ` + `.docx`
- `changedPagesPdf` → `Redline Pages - ` + `.pdf`
- default → `Comparison - ` + `.pdf`

### Template tokens
- **Per-format prefix inputs** can include `{original}` / `{modified}`.
  - If present, those fields are used directly and **override** `nameTemplate`.
- `nameTemplate` supports: `{prefix}`, `{original}`, `{modified}`.

### Length handling
- Max filename length is limited to 255 characters minus extension length.
- If the base name exceeds the limit, it is truncated.

---

## 10) Email Functionality (.eml Generation)

### Trigger
- Clicking **Email** runs the email workflow only if `comparisonUrl` exists.

### User selections
- Checkboxes under the email dropdown control which attachments are included.
- Supported options:
  - `original` (source file)
  - `modified` (source file)
  - `pdf`, `docx`, `track_changes`, `changedPagesPdf` (generated outputs)

### Attachment building
1. Start with an empty list.
2. If `original` selected, attach `originalFile` with its name or `Original.docx`.
3. If `modified` selected, attach `modifiedFile` with its name or `Modified.docx`.
4. For comparison outputs:
   - For each selected format, call `getComparisonDownloadUrl(format)`.
   - Fetch the file blob.
   - Use `generateFileName()` to create attachment names.

### EML structure
- MIME `multipart/mixed` with boundary `--boundary_text`.
- Includes a simple text body.
- Each attachment:
  - `Content-Type: application/octet-stream`
  - `Content-Transfer-Encoding: base64`
  - `Content-Disposition: attachment`
  - Base64 data is chunked to 76-character lines.

### Draft behavior
- `X-Unsent: 1` is included, which causes Outlook to open the email as a draft.

### Delivery
- The .eml file is saved using the same save rules as downloads (default folder vs Downloads list).
- The status line optionally shows the saved path (controlled by `showPathAfterAction`).

---

## 11) Settings (Keys + Defaults)

Settings are persisted via `settingsStore` (`src\taskpane\settings.js`) and applied in the Settings UI.

### Defaults
- `showSaveOptions`: `['pdf', 'docx', 'track_changes', 'changedPagesPdf']`
- `showEmailOptions`: `['original', 'modified', 'pdf', 'docx', 'track_changes', 'changedPagesPdf']`
- `defaultEmailChecked`: `['pdf']`
- `enableHints`: `true`
- `showInDownloadList`: `false`
- `showPathAfterAction`: `true`
- `rememberLastFolder`: `false`
- `enableCancelCompare`: `true`
- `defaultSaveFolderLabel`: `''`
- `namePrefixes`:
  - `pdf`: `Redline - `
  - `docx`: `Redline - `
  - `track_changes`: `Track Changes - `
  - `changedPagesPdf`: `Redline Pages - `
  - `default`: `Comparison - `
- `nameTemplate`: `{prefix}{original} and {modified}`
- `emailSubjectTemplate`: `Document Comparison ({original} vs {modified})`

### Notes
- The **default save folder** handle is stored separately in IndexedDB (not in settings) and is cleared when `showInDownloadList` is enabled.
- **Email subject template** supports `{original}`, `{modified}`, `{date}` where date is `YYYY-MM-DD`.
- **Save/Email menu visibility** is controlled by `showSaveOptions` and `showEmailOptions`.
- **Default checked email options** are controlled by `defaultEmailChecked`.

---

## 12) Storage

### Settings storage
- Key: `compare_addin_settings`
- Location: `OfficeRuntime.storage` if available, else `localStorage`

### Default folder handle storage
- IndexedDB database: `compare_addin_handles`
- Object store: `handles`
- Key: `defaultSaveFolder`

### Last file picker handles
- Keys: `lastOriginalFileHandle`, `lastModifiedFileHandle`
- Used only when **Remember last folder** is enabled and File Picker API is available.

---

## 13) Error Handling and Messaging

### Compare errors
- Non-201 status or missing `Location` header is surfaced as an error.

### Save errors
- Failure in prepare or download is surfaced as `Error saving file: ...`.

### Email errors
- Any failure in download or Base64 conversion returns `Error generating email: ...`.

---

## 14) Limitations / Assumptions

- The add-in assumes the compare API returns a valid `Location` header with a comparison URL.
- `comparisonUrl` is required for View, Save, and Email operations.
- The add-in does not validate file contents (only extensions).
- Email is implemented as a local `.eml` draft; it does not send mail directly.

---

## 15) Naming Conventions and Linting

### Conventions
- Variables/functions: `camelCase`
- Classes: `PascalCase`
- HTML/CSS classes and IDs: `kebab-case`

### Lint script
- `scripts\lint-naming.ps1`
  - Checks JS identifiers and HTML/CSS class/id naming.
  - Exits non-zero when violations are found.

Run:
```powershell
pwsh scripts/lint-naming.ps1
```

---

## 16) Quick Traceability

- **Compare**: `#btn-compare` → `fetch(apiEndpoint)` → `comparisonUrl`
- **Cancel**: `#btn-cancel-compare` → `compareAbortController.abort()`
- **View**: `#btn-view` → `Office.context.ui.openBrowserWindow(comparisonUrl)`
- **Save**: `#btn-save-primary` / menu → `triggerDownload(format)`
- **Email**: `#btn-email-primary` → build `.eml` → download
- **Swap**: `#btn-swap-files` → `swapSelectedFiles()`

---

## 17) Suggested Next Additions (Optional)

- Centralize API routes in a config block.
- Display selected save/email format labels in UI status.
- Allow the user to override the output filename before download.
- Add a lightweight download progress indicator for large files.
