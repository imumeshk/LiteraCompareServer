# Litera Compare Server - Translation & UI Settings Architecture

This document provides a high-level technical overview of how translations are applied across the Taskpane, Viewer, and server responses, as well as an explanation of the Viewer's "Show Category Tabs" setting.

---

## 1. Translations for Server-Returned Messages

The server API typically communicates application state or failure reasons via standard HTTP status codes (e.g., `422 Unprocessable Entity`, `503 Service Unavailable`, `500 Internal Server Error`). The frontend applications (both Taskpane and Viewer) intercept these responses rather than displaying raw server text.

### How it works:
1. **HTTP Error Interception:** When a request is made to the Compare API (e.g., submitting documents for comparison), the frontend inspects the HTTP response code.
2. **Key Mapping:** The status code is mapped to a predefined UI translation key. For example, a `503` status is mapped to the `err_503` key.
3. **Translation Resolution:** The application looks up `err_503` in the active language dictionary (loaded from the custom JSON). If found, it displays the localized message (e.g., "The server is currently too busy to handle the request..."). If not found, it falls back to the default English message.

This ensures that even if the server is unreachable or returns a generic error, the UI remains fully localized.

---

## 2. Taskpane (Add-in) UI Translations

The Taskpane is an Office Add-in designed to operate independently of the Viewer. It manages file selection, authentication, and dispatching jobs to the server.

### Translation Architecture:
1. **Settings Fetch:** On load, the Taskpane fetches its configuration from `/api/addin-settings`. This payload includes a `custom_languages` array containing the language JSON objects defined in the Admin panel.
2. **Base vs. Custom Merge:** The Taskpane contains a built-in English dictionary. When a language is selected, the application dynamically merges the matching JSON object from `custom_languages` over the base English dictionary.
3. **Flat Key-Value Structure:** The Taskpane UI relies entirely on a flat key-value map. Keys like `btn_compare`, `lbl_original_file`, and `msg_uploading` are bound directly to the React components rendering the UI.

---

## 3. Viewer UI Translations

The Viewer environment is more complex as it comprises two distinct domains: the **Viewer Wrapper** (the outer portal handling authentication and file downloads) and the **DeltaView Component** (the `deltaview.js` script provided by the Compare Server that renders the redline).

### A. Viewer Wrapper Translation
- Powered by `window.LiteraI18n`.
- Similar to the Taskpane, it fetches `custom_languages` from `/api/viewer-settings` and merges it over a built-in English dictionary.
- Uses flat keys like `btn_choose_file`, `btn_new_comparison`, and `hdr_title`.

### B. DeltaView (`deltaview.js`) Translation
- DeltaView expects a deeply nested JavaScript object for its language configuration (e.g., `toolbar.pdf`, `loading.comparing`).
- **The Bridge:** `viewer.js` acts as a bridge. It reads the flat/nested structures provided by `window.LiteraDeltaViewLanguages` (populated by `LiteraI18n`) and performs a deep merge with DeltaView's internal English defaults.

### C. The DeltaView Deep Merge

The `getDeltaViewLanguage` function in `viewer.js` was updated to explicitly deep-merge the missing objects. The JSON template generator in `admin/src/pages/ViewerSettings.tsx` was also updated to include these missing keys. 
```javascript
const merged = {
  ...baseLang,
  ...customOverride,
  toolbar: { ...(baseLang.toolbar || {}), ...(customOverride.toolbar || {}) },
  changeList: { ...(baseLang.changeList || {}), ...(customOverride.changeList || {}) },
  changeListCategories: { ...(baseLang.changeListCategories || {}), ...(customOverride.changeListCategories || {}) },
  // ⬇ Newly added to ensure these objects aren't ignored ⬇
  loading: { ...(baseLang.loading || {}), ...(customOverride.loading || {}) },
  errors: { ...(baseLang.errors || {}), ...(customOverride.errors || {}) },
  SummaryAI: { ...(baseLang.SummaryAI || {}), ...(customOverride.SummaryAI || {}) }
};
```
Because of this fix, when an Admin provides a custom language JSON with a `loading` block, `viewer.js` now successfully merges it and injects it into `deltaview.init(options, dvLanguage)`, finally allowing "Comparing..." and delay messages to be localized.

---

## 4. Custom Language JSON Template

The Admin Panel provides a **"Load English Template"** feature. This feature generates the canonical JSON schema expected by the frontend applications.

### Template Characteristics:
- **Separation of Concerns:** The template generated in the **Add-in Settings** differs entirely from the one generated in the **Viewer Settings**. You cannot use the Add-in JSON in the Viewer, nor vice versa.
- **Structure:** 
  - Taskpane templates are flat (e.g., `"btn_compare": "Compare"`).
  - Viewer templates are a mix of flat keys (for the wrapper) and nested objects (`changeList`, `loading`, `SummaryAI`) designed explicitly to be consumed by `deltaview.js`.
- **Application:** When an administrator saves a custom language JSON, it is stringified and saved to the database. On client load, the string is parsed back into an object and merged into memory, allowing granular overrides (you only need to include the keys you wish to change; omitted keys fall back to English).

---

## 5. Viewer Display Options: "Show Category Tabs"

In the Viewer settings, administrators can toggle "Show Category Tabs". This setting dictates whether the "Category" breakdown (e.g., "Word Variations", "Matching") is visible in the right-hand change list.

### How it works technically:
Unlike some settings (like toolbar buttons) that can be toggled via native DeltaView initialization flags, DeltaView does not provide a native configuration parameter to hide the category tabs entirely. 

To achieve this, `viewer.js` employs an aggressive DOM manipulation strategy:
1. **MutationObserver:** `viewer.js` attaches a `MutationObserver` to the root `#deltaview-container`.
2. **CSS Targeting:** It listens for DOM changes and identifies elements matching the category CSS classes (e.g., `[class*='CategoryHeader_categoriesList']`, `[class*='CategoryHeader_activeCategory']`).
3. **Forced Hiding:** If the `show_categories` setting is false, the script continuously applies `display: none !important` as an inline style to these specific elements.
4. **Fallback Interval:** Because React-based applications (like DeltaView) can rapidly redraw and overwrite inline styles, `viewer.js` also runs a `setInterval` every 500ms (`setInterval(applyCategoryVisibility, 500)`) to re-assert the hidden state, ensuring the category tabs remain invisible regardless of user interaction or re-renders.

---

## 6. Viewer Save Dialog & Download Interception

In the Viewer environment, DeltaView provides its own native download buttons (e.g., Save as PDF, DOCX) which typically trigger direct downloads or open new tabs without giving the portal application a chance to intervene.

To support customized file naming and an interactive save dialog, `viewer.js` overrides this default behavior:

### How it works technically:
1. **DOM MutationObserver:** `viewer.js` listens for the injection of DeltaView's native toolbar buttons (like `#btnPDF`, `#btnDOCX`).
2. **Event Interception:** It attaches capturing event listeners (`click`, `mousedown`, `pointerdown`) to these buttons and calls `e.stopImmediatePropagation()` to prevent DeltaView's internal handlers from executing.
3. **API Proxying:** Instead of relying on DeltaView's frontend to build the download URL, the portal makes background API calls to `/prepareDownload` via a local proxy route.
4. **HTML Save Dialog:** Before triggering the actual download, `viewer.js` displays a custom HTML modal. Depending on the Admin settings:
   - Users can edit the final filename (if `allow_user_edit_filename` is enabled).
   - Users can click "Choose Folder..." (if `enable_save_as_dialog` is enabled), which leverages the browser's native `window.showSaveFilePicker()` API (available in Chromium browsers over HTTPS) to save the file to a specific local directory.
5. **Rogue Download Interception:** As a fallback, `viewer.js` also overrides `window.open` and `HTMLIFrameElement.prototype.src` to catch any downloads triggered internally by DeltaView that bypass the button clicks, ensuring the custom naming and save logic is always enforced.
