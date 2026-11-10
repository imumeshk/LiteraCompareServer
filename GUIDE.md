# Litera Compare Server — Complete Guide

> **Version:** 1.2.0 | **Platform:** Windows | **Runtime:** Node.js 20 / Docker

---

## Table of Contents

1. [Project Structure](#1-project-structure)
   - 1.1 [Overview](#11-overview)
   - 1.2 [Architecture & Directory Structure](#12-architecture--directory-structure)
2. [Deployment](#2-deployment)
   - 2.1 [Prerequisites](#21-prerequisites)
   - 2.2 [Environment Variables](#22-environment-variables)
   - 2.3 [Docker Deploy (Recommended)](#23-docker-deploy-recommended)
   - 2.4 [Server Deploy (Direct Node.js)](#24-server-deploy-direct-nodejs)
   - 2.5 [Portable Run (Isolated Runtime)](#25-portable-run-isolated-runtime)
   - 2.6 [Deployment Operations](#26-deployment-operations)
3. [Installer (First-Time Setup)](#3-installer-first-time-setup)
4. [Configuration](#4-configuration)
   - 4.1 [General Settings](#41-general-settings)
   - 4.2 [Microsoft Entra SSO](#42-microsoft-entra-sso)
   - 4.3 [Manifest File Generation](#43-manifest-file-generation)
5. [Viewer Settings](#5-viewer-settings)
   - 5.1 [Viewer Feature Toggles](#51-viewer-feature-toggles)
   - 5.2 [Delta Viewer Toolbar](#52-delta-viewer-toolbar)
   - 5.3 [Portal Behaviour](#53-portal-behaviour)
   - 5.4 [Download Naming & Save Dialog](#54-download-naming--save-dialog)
6. [Add-in Settings](#6-add-in-settings)
   - 6.1 [Save Options](#61-save-options)
   - 6.2 [Email Options](#62-email-options)
   - 6.3 [Name Template & Prefixes](#63-name-template--prefixes)
   - 6.4 [Compare Behaviour](#64-compare-behaviour)
   - 6.5 [Hide Buttons & Settings Panel](#65-hide-buttons--settings-panel)
7. [Activity Dashboard](#7-activity-dashboard)
8. [Translation System](#8-translation-system)
   - 8.1 [How It Works](#81-how-it-works)
   - 8.2 [Language Detection Priority](#82-language-detection-priority)
   - 8.3 [Custom Language Format](#83-custom-language-format)
   - 8.4 [Adding Custom Languages](#84-adding-custom-languages)
9. [API Reference](#9-api-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Project Structure

### 1.1 Overview

Litera Compare Server is a self-hosted enterprise document comparison platform consisting of:

| Component | Description |
|---|---|
| **Admin Panel** | React-based web UI to configure all server settings |
| **Comparison API** | Proxies comparison requests to a Litera Compare API endpoint |
| **Web Viewer Portal** | Browser-based document upload & Delta Viewer for results |
| **Word Add-in** | Office Add-in (taskpane) for comparing documents from within Microsoft Word |

All components run from a single Node.js process on port `3000` (or as configured in `.env`) and share a SQLite database.

### 1.2 Architecture & Directory Structure

```
litera-compare-server/
├── addin/                  # Word Add-in (MSAL SSO, taskpane UI, settings)
│   └── src/taskpane/
│       ├── taskpane.html   # Add-in HTML layout
│       ├── taskpane.js     # Add-in logic (compare, save, email, SSO)
│       ├── settings.js     # Fetches & merges admin + user settings
│       └── i18n.js         # Translation engine (shared with viewer)
├── admin/                  # React Admin Panel (Vite build)
│   └── src/pages/
│       ├── Configuration.tsx       # Server URL, SSO, manifest URL
│       ├── AddinSettings.tsx       # Word Add-in configuration
│       ├── ViewerSettings.tsx      # Web Viewer Portal configuration
│       ├── EntraSSO.tsx            # Microsoft Entra ID SSO setup
│       ├── ActivityDashboard.tsx   # Comparison activity log
│       ├── AddinUsers.tsx          # Admin user management
│       └── InstallerWizard.tsx     # First-time setup wizard
├── assets/                 # Icons (icon-32.png, icon-80.png)
├── server/src/             # Node.js/Express backend (TypeScript)
│   ├── routes/             # API route handlers
│   ├── models/             # Database read/write models
│   └── db/client.ts        # SQLite init, migrations, seed defaults
├── viewer/                 # Web Viewer Portal (static files)
│   ├── home.html           # Comparison upload page
│   ├── home.js             # Upload page logic (SSO, compare, branding)
│   ├── home.css            # Viewer portal styles
│   ├── viewer.html         # DeltaView results wrapper
│   ├── viewer.js           # DeltaView chrome (toolbar, SSO badge, new comparison)
│   └── i18n.js             # Shared translation engine
├── Docker Deploy/          # Auto-populated copy used by Docker build
├── .env                    # Active environment configuration
├── .env.example            # Environment variable template
├── deploy.ps1              # Main deployment script (all modes)
├── package.json            # Root project manifest
└── manifest.xml            # Generated Office Add-in manifest (download from admin)
```

---

## 2. Deployment

### 2.1 Prerequisites

#### Docker Deploy
| Requirement | Version |
|---|---|
| Docker Desktop | Latest stable |
| Windows PowerShell | 5.1+ or PowerShell 7 |

#### Server Deploy
| Requirement | Version |
|---|---|
| Node.js | 20 LTS |
| npm | 10+ |
| Windows PowerShell | 5.1+ or PowerShell 7 |

#### Portable Run
| Requirement | Version |
|---|---|
| Windows PowerShell | 5.1+ or PowerShell 7 |
| Internet access | Required only for the first automatic Portable Node.js download |

#### IIS Reverse Proxy
| Requirement | Purpose |
|---|---|
| Administrator PowerShell | IIS sites, bindings, permissions, firewall rules, tasks, and services |
| IIS, URL Rewrite, and ARR | Reverse proxy hosting |
| Local Machine certificate with private key | HTTPS binding from `Cert:\LocalMachine\My` |

> [!IMPORTANT]
> Ensure PowerShell execution policy allows running scripts. If blocked, run:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

### 2.2 Environment Variables

Configured in `.env` in the project root. `APP_NAME`, `PORT`, `APP_URL`, and optional `HTTP_PORT` are managed by the Network & SSL Configuration Wizard. Portable rebuilds synchronize `.env` into `portable/app/`.

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `server/data/app.db` | Path to the SQLite database file |
| `SESSION_SECRET` | *(see .env.example)* | Secret key for signing admin session cookies. **Change in production.** |
| `PORT` | `3000` | HTTP port the server listens on (or as configured) |
| `APP_URL` | `{APP_URL}` | Public-facing base URL (used in SSO redirects, manifest URLs) |
| `USE_NATIVE_SSL` | `false` | `true` for native Node.js SSL; `false` for IIS Reverse Proxy |
| `SSL_CERT_PATH` | `""` | Absolute path to the SSL certificate file on the host machine |
| `SSL_KEY_PATH` | `""` | Absolute path to the SSL private key file on the host machine |

> [!CAUTION]
> Always set a strong, unique `SESSION_SECRET` in production. The default value is insecure.

### 2.3 Docker Deploy (Recommended)

The Docker deployment builds a production image from the project root and runs the server in an isolated container with a persistent Docker volume for application data.

**Steps:**

1. Ensure Docker Desktop is running.
2. Open PowerShell in the project root.
3. Run the deployment script and choose option **1**:

```powershell
.\deploy.ps1
# Select: 1. Docker Deploy
```

**What happens:**
- The script verifies that Docker Desktop is available and running.
- It generates `docker/docker-compose.yml` using the active configuration.
- For an existing image/container, choose **Update (rebuild)**, **Deploy without rebuilding**, or **Stop existing container**.
- The update path can optionally change settings, then rebuilds and deploys the image.

**URLs after deployment:**

| URL | Purpose |
|---|---|
| `{APP_URL}/installer` | First-time setup wizard (if not yet configured) |
| `{APP_URL}/` | Admin panel |
| `{APP_URL}/viewer` | Web Viewer Portal |
| `{APP_URL}/api/health` | API health check |

### 2.4 Server Deploy (Direct Node.js)

Runs the server directly on the host using Node.js (no Docker required).

```powershell
.\deploy.ps1
# Select: 2. Server Deploy
```

**What happens:**
- The deployment runs from the project root.
- A new installation runs `npm install` and `npm run build`, producing root `node_modules/` and `dist/` folders.
- An existing installation offers Control Menu, Rebuild and Update, or an uninstall of only the root `dist/` and `node_modules/` folders.
- Rebuilds create a configuration backup and restart the process only when it was running before the rebuild.

**Server Control Menu options:**

| Option | Action |
|---|---|
| 1 | Start / Stop server |
| 2 | Restart server |
| 3 | View server logs |
| 4 | Clear server logs |
| 5 | Register a Windows startup task |
| 6 | Register an NSSM Windows service |

### 2.5 Portable Run (Isolated Runtime)

Uses a bundled Node.js runtime so no system-wide Node.js installation is required. It maintains an isolated application build while deployment and source synchronization remain managed by the project-root script.

```powershell
.\deploy.ps1
# Select: 3. Portable Run
```

**What happens:**
- Portable Node.js v20.11.1 is downloaded to `portable/node/` when required.
- Application files are synchronized into `portable/app/`.
- `npm install` and `npm run build` run inside `portable/app/`, producing independent `portable/app/node_modules/` and `portable/app/dist/` folders.
- The portable control menu starts the process from `portable/app/` and stores its PID and logs under `portable/`.

> [!TIP]
> Portable Run uses a bundled runtime, but rebuild and configuration synchronization are managed from the project root by `deploy.ps1`.
>
> To reset only the portable installation, choose its **Uninstall portable app** option. This removes `portable/app/` and leaves the Server Deploy installation untouched.

---

### 2.6 Deployment Operations

The deployment script provides these operational actions from its main menu:

| Action | Result |
|---|---|
| Status Check | Shows Docker, Server, Portable, and IIS state, build metadata, certificate-expiry warnings, and registered task/service names with their current state. |
| Deployment Dry Run | Displays configuration, build/runtime availability, and IIS prerequisites without changing application, IIS, firewall, or service state. |
| Backup Current Configuration | Writes a timestamped backup under `backups/` containing `.env`, `web.config`, build metadata, and available IIS site details. |
| Repair IIS Reverse Proxy | Reapplies ARR proxy enablement, rewrite configuration, application permissions, site startup, and the HTTPS firewall rule; it also checks for the configured binding. |
| Create Diagnostics Bundle | Creates a ZIP under `diagnostics/` with logs, build data, available IIS site details, and a redacted environment file. |

Deployments and operational actions are recorded in `logs/deploy.log`.

#### Existing Installations and Rebuilds

When Docker Deploy, Server Deploy, or Portable Run detects an existing installation, it displays the saved configuration and opens an action menu without prompting to update settings. Settings can be changed only from the rebuild/update path.

Server Deploy owns the root `dist/` and `node_modules/` folders. Its uninstall option removes only those root folders.

Portable Run is isolated under `portable/app/` and owns `portable/app/dist/` and `portable/app/node_modules/`. Its uninstall option removes only `portable/app`; it does not affect Server Deploy. Portable rebuilds synchronize application source and `.env` from the project root while preserving `portable/app/server/data/`.

Every rebuild creates a configuration backup. If the relevant server was already running, it is restarted only after a successful rebuild.

#### Startup Tasks and Windows Services

The Server and Portable control menus can register either a Windows startup task or an NSSM service. Registered names are saved in `registration.json` in the relevant log folder and shown by Status Check.

- A startup task runs `deploy.ps1 -AutoStart` as `SYSTEM` at boot.
- Portable auto-start uses `portable/app/` when that isolated installation exists.
- NSSM service setup detects the operating-system architecture and uses `win64` or `win32` accordingly.
- When NSSM is missing, choose automatic download of the matching executable or open the official NSSM download page for manual setup.
- Automatic setup retains only `tools/nssm/win64/nssm.exe` or `tools/nssm/win32/nssm.exe`; its temporary archive and extracted files are removed.

#### IIS Reverse Proxy

IIS Reverse Proxy configuration requires Administrator privileges, IIS, URL Rewrite, ARR, and a certificate in `Cert:\LocalMachine\My` that has a private key. The script validates the FQDN, ports, and certificate before creating the site, SNI HTTPS binding, and URL Rewrite rule to the internal Node.js port.

If a site with the chosen name exists, the script lets you update it, enter a different name, or cancel; it does not silently replace the site.

After PowerShell creates an IIS site, IIS Manager can show it in the Sites list before it appears in the Connections tree. Right-click **Sites** and choose **Refresh**, or press `F5`. The script also offers to open IIS Manager after setup.

---

## 3. Installer (First-Time Setup)

On first visit (before the database is seeded), navigating to `{APP_URL}` redirects to `/installer`.

**Step-by-step setup in the wizard:**

1. **General Application Settings** — Set the Application Name, Application Base URL, and configure your Admin Login (username and password).
2. **Compare Server** — Enter the base URL of your Litera Compare Server API endpoint (e.g. `https://compare.litera.com/api/v1`).
3. **Installation Mode** — Select which components to activate:
   - **Full**: Enables both Word Add-in and Web Viewer Portal.
   - **Add-in only**: Disables the Web Viewer Portal.
   - **Viewer only**: Disables the Word Add-in manifest generation.
4. **Component URLs** — Verifies and sets the exact callback URLs for the Add-in and Web Viewer based on your Base URL.
5. **SSO Configuration** — Optionally configure Microsoft Entra SSO right during installation by providing your **Tenant ID** and **Client ID**. If provided, SSO will be enabled out-of-the-box. You can also skip this and configure it later from the Admin Panel.
6. **Confirmation** — Review your settings. Clicking confirm will seed the database and finalize deployment.

> [!NOTE]
> The installer is only accessible when no admin account exists. Once setup is complete, it is automatically disabled.

---

## 4. Configuration

Access: **Admin Panel → Configuration**

### 4.1 General Settings

**Compare / Enqueue Endpoints**
The URL(s) of the Litera Compare API that processes document comparisons.
- **Compare Server URL:** The standard synchronous endpoint (default: `https://compare.litera.com/api/v1`).
- **Enqueue Endpoint URL:** The asynchronous/queue-based endpoint.
- **Active Toggle:** You can seamlessly switch traffic between the Compare and Enqueue endpoints by toggling the active state in the admin panel.
- Used by both the Web Viewer Portal and the Word Add-in.

**CORS Policy (Cross-Origin Resource Sharing)**
Controls which external domains are permitted to embed the Web Viewer Portal (via `<iframe>`) or call the proxy API.
- **Permissive (Bypass):** Allows any external site to embed the app. Not recommended for production.
- **Strict:** Blocks all external embedding and cross-origin API calls. Only the app itself can access its resources.
- **Custom:** Only explicitly allowed comma-separated domains (e.g., `https://myintranet.com, https://app.partner.com`) can embed the portal.

**Install Mode**
Determines which components are active and which admin sections are visible.

| Mode | Admin Panel | Word Add-in | Web Viewer Portal |
|---|---|---|---|
| **Full** | All sections | Enabled | Enabled |
| **Add-in only** | Add-in sections | Enabled | Hidden |
| **Viewer only** | Viewer sections | Hidden | Enabled |

**Backup & Restore**
Backups are downloaded as `.json` files and can be restored by uploading them via the corresponding restore button.

| Backup Type | Contents |
|---|---|
| **Master** | Full database backup (all settings) |
| **Config** | Server configuration only |
| **Add-in** | Add-in settings only |
| **Viewer** | Viewer settings only |

**Brand Header**
Customise the header displayed on both the **Web Viewer Portal** and the **Word Add-in taskpane**.

| Field | Default | Description |
|---|---|---|
| **Brand Logo Text (Max 2 chars)** | `L` | 1-2 character text displayed inside the circular logo icon |
| **Brand Title** | `Compare Server` | Main heading in the header |
| **Brand Subtitle** | `Enterprise Document Comparison` | Subheading beneath the brand name |

### 4.2 Microsoft Entra SSO

Litera Compare Server supports Microsoft Entra ID (formerly Azure AD) Single Sign-On for both the Web Viewer Portal and the Word Add-in.

**Setup**
1. Register an application in [Azure Portal → App Registrations](https://portal.azure.com).
2. Note the **Tenant ID** and **Client ID**.
3. Add redirect URIs in Azure for both clients:
   - Add-in: `https://<your-base-url>/addin/auth-callback.html`
   - Viewer: `https://<your-base-url>/viewer/auth-callback.html`
4. In the admin panel, click **Edit Configuration** and fill in:

| Field | Description |
|---|---|
| **Tenant ID** | Azure AD Tenant ID (GUID or `common`) |
| **Client ID** | Application (client) ID from Azure |
| **Add-in Redirect URI** | Must match Azure registration exactly |
| **Web Redirect URI** | Must match Azure registration exactly |
| **Allowed Domains** | Comma-separated list of permitted email domains |
| **Scopes** | OAuth scopes (default: `User.Read openid profile email`) |
| **Require Login to Compare** | If enabled, users must be signed in to submit comparisons |

5. Click **Test Connection** to verify.
6. Click **Save Configuration**.

> [!IMPORTANT]
> The SSO section only appears when SSO is enabled or a Tenant ID has been configured. When SSO is first set up after installation, click **Edit Configuration** — an amber notice will appear if SSO has not yet been configured.

### 4.3 Manifest File Generation

The Word Add-in requires an XML manifest file to be sideloaded into Microsoft 365.

**Download the Manifest**
1. Copy the **Manifest URL** shown on the Configuration page, **or**
2. Click the download link to get `manifest.xml` directly.

**Customise Manifest Settings**
Click **Manifest Settings** to open the configuration modal:

| Field | Default | Description |
|---|---|---|
| **Display Name** | `Litera Compare` | Name shown in Word's ribbon |
| **Description** | *(default)* | Tooltip in Office Add-in catalogue |
| **Provider Name** | `Litera` | Publisher name |
| **Version** | `1.2.0.0` | Four-part version string |
| **Default Locale** | `en-US` | Locale for the manifest |
| **Office Tab** | `TabHome` | Which Office ribbon tab hosts the add-in button |
| **Icon URL** | `/assets/icon-32.png` | 32×32 px ribbon icon |
| **High-Res Icon URL** | `/assets/icon-80.png` | 80×80 px high-DPI icon |
| **Support URL** | `https://www.litera.com/support` | Help link shown in Office |
| **Manifest ID** | *(auto-generated GUID)* | Unique manifest ID. Do not change after deployment. |

**Sideloading the Manifest**
- **Centrally via Microsoft 365 Admin Center:** Upload `manifest.xml` to your organisation's SharePoint app catalogue, then deploy via Microsoft 365 Admin Center → Settings → Integrated Apps.
- **Manual sideload (development/testing):** In Word, go to **Insert → Add-ins → My Add-ins → Upload My Add-in**. Select the downloaded `manifest.xml`.

> [!IMPORTANT]
> `APP_URL` in `.env` must be a publicly accessible **HTTPS** URL for production manifests, as Microsoft 365 requires HTTPS for sideloaded add-ins.

---

## 5. Viewer Settings

Access: **Admin Panel → Viewer Settings**

Configures the Web Viewer Portal (`/viewer`) and the DeltaView comparison results viewer.

### 5.1 Viewer Feature Toggles

| Setting | Default | Description |
|---|---|---|
| **Show Password Fields** | On | Password inputs for password-protected documents |
| **Show Reset Button** | On | Reset button to clear both file selections at once |
| **Enable Cancel Button** | Off | Cancel button during active upload/comparison |
| **Show Rendering Parameters** | Off | Advanced rendering options input on the home page |

### 5.2 Delta Viewer Toolbar

| Setting | Default | Description |
|---|---|---|
| **Show Toolbar** | On | Shows the entire action toolbar |
| **Show Redline** | On | Redline (change-highlighted) view |
| **Show PDF Download** | On | Save as PDF button |
| **Show DOCX Download** | On | Save as DOCX button |
| **Show Track Changes** | On | Track Changes export button |
| **Show Changed Pages** | On | Changed Pages PDF button |
| **Show Print** | On | Print button |
| **Show Navigation Arrows** | On | Previous/Next change buttons |
| **Accept Changes** | On | Accept Selected Changes functionality |
| **Show Change List** | On | Change list sidebar panel |
| **Show Statistics** | On | Comparison statistics panel |
| **Show Categories** | Off | Change category filter panel |

### 5.3 Portal Behaviour

| Setting | Default | Description |
|---|---|---|
| **Enable New Comparison Button** | On | Shows a "New Comparison" button in the DeltaView toolbar |
| **Open New Comparison in** | Same Tab | `Same Tab` or `New Tab` |
| **Show Save Prompt** | On | Prompts to save before starting a new comparison |
| **Loading Message** | *(see below)* | Text shown during upload and comparison |

Default loading message: `Uploading files for comparison & comparing file`

### 5.4 Download Naming & Save Dialog

Controls how downloaded comparisons are named and saved from the Delta Viewer.

| Setting | Default | Description |
|---|---|---|
| **Enable Download Name Templates** | On | If enabled, controls the default naming format for all downloaded comparison files. |
| **Filename Template** | `{prefix}{original} and {modified}` | Template using variables `{prefix}`, `{original}`, and `{modified}`. |
| **Name Prefixes** | *(varies)* | Specific prefixes for PDF, DOCX, Track Changes, Accept Changes, and Changed Pages. |
| **Allow User to Edit Filename** | Off | If enabled, users can override the default filename in a Save Dialog modal before downloading. |
| **Show "Save As" Folder Picker** | Off | If enabled, presents a "Choose Folder..." option in the HTML Save Dialog. Only supported on Chromium browsers with HTTPS. |

> **Technical Note on Downloads & Proxying:**  
> The Viewer Portal overrides the native DeltaView save buttons to intercept downloads. Instead of letting DeltaView trigger direct downloads (which can cause CORS issues or lack custom naming), the portal routes comparison API calls through a local **Node.js proxy (`/proxy/...`)**. This bypasses CORS restrictions and allows the portal to present an interactive **HTML Save Dialog**. Before saving, the proxy endpoint `/prepareDownload` is called. As a fallback, native `window.open` and `iframe.src` are overridden to ensure rogue downloads are intercepted.

---

## 6. Add-in Settings

Access: **Admin Panel → Add-in Settings**

Configures the behaviour of the Word Add-in taskpane. All settings are stored server-side and applied when the add-in initialises.

### 6.1 Save Options

Controls which redline output formats appear in the **Save** menu.

| Option | Description |
|---|---|
| **PDF** | Save redline as PDF |
| **DOCX** | Save redline as Word document |
| **Track Changes** | Save with tracked changes |
| **Redline Pages** | Save changed pages as PDF |

**Allow User Override** — When enabled, users can change their save format preferences in their personal settings panel. When disabled, the admin selection is locked and the override toggle is hidden.

### 6.2 Email Options

| Option | Description |
|---|---|
| **Show in Email menu** | Which formats appear in the Email attachment menu |
| **Default checked** | Formats pre-selected when the Email dialog opens |
| **Email Subject Template** | Default subject line with variable substitution |

**Variables in email subject:** `{original}`, `{modified}`

### 6.3 Name Template & Prefixes

**Name Template** (default: `{prefix}{original} and {modified}`)

| Variable | Replaced with |
|---|---|
| `{prefix}` | Format-specific prefix |
| `{original}` | Original document name (no extension) |
| `{modified}` | Modified document name (no extension) |

**Default Prefixes:**

| Format | Default |
|---|---|
| PDF | `Redline - ` |
| DOCX | `Redline - ` |
| Track Changes | `Track Changes - ` |
| Redline Pages | `Redline Pages - ` |

**Lock** — The lock icon prevents users from changing the template or prefixes even if override is enabled.

### 6.4 Compare Behaviour

| Setting | Default | Description |
|---|---|---|
| **Show in Download List** | Off | Save files to the system Downloads folder |
| **Show Saved Path Confirmation** | On | Displays file path after saving |
| **Remember Last Folder** | Off | Pre-selects the last chosen save folder |
| **Allow Cancelling Compare Jobs** | On | Shows a Cancel button during active comparisons |
| **Allow Custom Rendering Options** | Off | Shows an advanced rendering parameters input field |
| **Enable Password Fields** | Off | Shows password inputs for password-protected documents |

### 6.5 Hide Buttons & Settings Panel

**Hide Settings** — Removes the Settings gear button entirely from the taskpane.

If **Hide Settings** is enabled, sub-sections can be individually hidden:

| Sub-section | Description |
|---|---|
| Hide Hints | Hides the hints section |
| Hide Save Menu Items | Hides save format checkboxes |
| Hide Email Menu Items | Hides email format checkboxes |
| Hide Default Checked | Hides the default email selection |
| Hide Save Behaviour | Hides save path/folder settings |
| Hide Compare Behaviour | Hides compare options section |
| Hide Name Prefixes | Hides name prefix inputs |
| Hide Email Subject | Hides email subject template |

**Hide Action Buttons:**

| Setting | Description |
|---|---|
| Hide Email Button | Removes the Email button |
| Hide View Button | Removes the View (open in browser) button |
| Hide Cancel Button | Removes the Cancel button during compare |

---

## 7. Activity Dashboard

Access: **Admin Panel → Activity Dashboard**

Logs every comparison request submitted through the server.

| Column | Description |
|---|---|
| **User** | Email / username (from SSO, or `anonymous`) |
| **Source** | `viewer` (web portal) or `addin` (Word Add-in) |
| **Original File** | Baseline document filename |
| **Modified File** | Revised document filename |
| **HTTP Status** | API response code (201 = success) |
| **Duration** | Comparison time in milliseconds |
| **Timestamp** | Date and time of the comparison |

**Activity Settings** (Admin Panel → Activity Settings):

| Setting | Default | Description |
|---|---|---|
| Enable Logging | On | Master toggle for all activity logging |
| Log SSO Users | On | Log comparisons by signed-in users |
| Log Anonymous Users | On | Log comparisons without SSO |
| Retention Days | 90 | Days before old entries are automatically purged |

---

## 8. Translation System

Both the Web Viewer Portal and the Word Add-in use a shared JavaScript translation engine (`i18n.js`). This allows deployers to add additional languages or override any UI text without modifying source code.

### 8.1 How It Works

1. **Built-in English** translations are embedded in `i18n.js` as the `en` locale.
2. On startup, the engine fetches custom language overrides from:
   - `/api/addin-settings` → `custom_languages` field
   - `/api/viewer-settings` → `custom_languages` field
3. Custom translations are **merged on top** of built-in translations per language code.
4. If a custom key exists, it overrides the built-in string. Missing keys fall back to English.

### 8.2 Language Detection Priority

The active language is determined in this order:

1. `?lang=` URL query parameter (e.g. `?lang=de`)
2. Previously selected language in `localStorage` key `litera_viewer_lang`
3. Browser/OS language (`navigator.language`, e.g. `en-US` → `en`)
4. Fallback: `en`

The **language selector** in the header shows the two-letter code (e.g. `EN`, `DE`, `NL`) and allows runtime switching. The selection is persisted in localStorage.

### 8.3 Custom Language Format

Custom languages are stored as a JSON array. Each entry is a language object:

```json
[
  {
    "code": "nl",
    "name": "Nederlands",
    "translations": {
      "btn_run_compare": "Vergelijken",
      "btn_reset": "Opnieuw instellen",
      "btn_cancel": "Annuleren",
      "lbl_original": "Origineel document",
      "lbl_modified": "Gewijzigd document",
      "changeList": {
        "title": "Wijzigingenlijst",
        "zeroState": "Uw documenten bevatten geen wijzigingen"
      },
      "toolbar": {
        "pdf": "Opslaan als PDF",
        "docx": "Opslaan als DOCX"
      },
      "loading": {
        "comparing": "Vergelijken..."
      }
    }
  }
]
```

**Rules:**

| Rule | Detail |
|---|---|
| `code` | ISO 639-1 two-letter lowercase language code (e.g. `nl`, `de`, `fr`) |
| `name` | Human-readable language name (shown in language selector) |
| `translations` | Flat key-value pairs; nested objects for `changeList`, `toolbar`, `loading` |
| Partial translations OK | Only keys you want to override are required — missing keys fall back to English |
| Multiple languages | Array can contain multiple language objects |
| Override English | Use `"code": "en"` to override built-in English strings (useful for white-labelling) |

### 8.4 Adding Custom Languages

Both **Add-in Settings** and **Viewer Settings** include a **Load Sample** button.

Clicking it populates the custom languages textarea with a complete JSON object containing **all supported translation keys** in English, ready to translate.

**Step-by-step workflow for adding a new language:**

1. Click **Load Sample**.
2. Change `"code": "en"` to your language code (e.g. `"de"`).
3. Change `"name"` to the display name (e.g. `"Deutsch"`).
4. Translate each value string.
5. Remove keys you don't need (untranslated keys fall back to English automatically).
6. Click **Save Settings**.
7. The new language will appear in the language selector dropdown.

> [!TIP]
> You can include multiple language objects in a single array to support several languages simultaneously without separate saves.

---

## 9. API Reference

All API endpoints are served at `{APP_URL}/api/`.

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/api/health` | GET | None | Server health check |
| `/api/config` | GET | None | Public server configuration |
| `/api/addin-settings` | GET | None | Add-in settings (public read) |
| `/api/addin-settings` | PUT | Admin | Update add-in settings |
| `/api/viewer-settings` | GET | None | Viewer settings (public read) |
| `/api/viewer-settings` | PUT | Admin | Update viewer settings |
| `/api/sso/config` | GET | None | SSO configuration (public read) |
| `/api/sso/config` | PUT | Admin | Update SSO configuration |
| `/api/UICompare` | POST | SSO (optional) | Submit documents for comparison |
| `/api/manifest` | GET | None | Download generated manifest XML |
| `/api/manifest-settings` | GET / PUT | Admin | Manifest metadata |
| `/api/compare-server-settings` | GET / PUT | Admin | Compare engine settings |
| `/api/activity` | GET | Admin | Comparison activity log |
| `/api/backup/:type` | GET | Admin | Download settings backup |
| `/api/restore/:type` | POST | Admin | Restore from backup file |
| `/api/auth/login` | POST | None | Admin login |
| `/api/auth/logout` | POST | Admin | Admin logout |

---

## 10. Troubleshooting

### Port 3000 already in use

```powershell
# Find the process using port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Get-Process -Id <PID>

# Kill the blocking process
Stop-Process -Id <PID> -Force
```

---

### Admin panel shows blank / 404

The React admin panel must be built before serving. Re-run the deploy script to trigger a fresh build.

---

### Branding changes not reflected in the portal

1. Save the Configuration settings in the admin panel.
2. Hard-refresh: **Ctrl + Shift + R** (or **Ctrl + F5**).
3. If still stale, clear `localStorage` via browser DevTools → Application → Local Storage → Clear All.

---

### Custom language not appearing in the selector

- Validate JSON at [jsonlint.com](https://jsonlint.com).
- Ensure `"code"` is **lowercase** two letters (e.g. `"nl"` not `"NL"`).
- Ensure the language is saved in the correct settings page:
  - **Viewer Portal** languages → Viewer Settings
  - **Taskpane** languages → Add-in Settings

---

### Password-protected documents returning error 403

- Enable **Show Password Fields** in Viewer Settings or Add-in Settings.
- When password fields are disabled by admin, the error message reads:
  *"One or both documents are password-protected, but password fields are disabled by your administrator."*

---

### SSO edit form opens automatically on page load

This is fixed in the current version. The SSO page always loads in read-only view. Click **Edit Configuration** to make changes. An amber warning banner appears when SSO has not yet been configured.

---

### Unexpected rendering options being sent to the compare server

Rendering parameters are **only** sent if the user explicitly types them into the Advanced Options input field. The server does not inject any default rendering parameters automatically.

---

*Litera Compare Server v1.2.0 — Generated 2026-08-27*
