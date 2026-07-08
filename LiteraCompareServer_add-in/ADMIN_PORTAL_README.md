## Architecture Overview

The Compare Server add-in consists of two components:

1. **Add-in Server (localhost:3000)**:
   - Office Add-in UI (`/src/taskpane/taskpane.html`)
   - Admin Portal (`/admin/`)
   - Admin Settings API (`/admin/api/*`)

2. **Backend API Server (localhost/WorkshareCompareApi)**:
   - Document comparison logic (`/api/uicompare`)

```
┌─────────────────┐    ┌─────────────────┐
│   Add-in Server │    │  Backend API    │
│ (localhost:3000)│    │ (localhost/     │
│                 │    │  Workshare...)  │
│ • taskpane.html │    │                 │
│ • /admin/       │    │ • /api/uicompare│
│ • /admin/api/*  │    │                 │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┼───────────────────────
                                 │
                    Calls API for:
                    • Document comparison
```

The admin portal communicates with the add-in server for settings management, while document comparison calls the backend API server.

## Overview

The admin portal allows administrators to:
- Control which menu options are visible to users
- Set default values for new users
- Override certain user preferences with organizational policies

## Accessing the Admin Portal

The admin portal is available at: `https://localhost:3000/admin/`

## Admin-Controlled Settings

### Visibility Controls
- **Save menu items**: Control which save formats are available to users
- **Email menu items**: Control which email attachment options are available to users

These settings override individual user preferences and cannot be changed by users.

### Default Settings
For new users (or when resetting settings), the following defaults are applied:
- Default checked items in email menu
- Hint display preferences
- Save behavior defaults (show in download list, remember last folder)
- Name prefixes and templates
- Email subject templates
- Optional locks to prevent user overrides for name formatting and email subject

## Backend API Requirements (File-Backed, No Dependencies)

The add-in server (localhost:3000) exposes a minimal, file-backed API (classic ASP) that reads/writes a JSON file under the `admin` folder. No external dependencies are required.

### GET /admin/api/settings.asp
Returns the current admin settings in JSON format.

**Response:**
```json
{
  "showSaveOptions": ["pdf", "docx", "track_changes", "changedPagesPdf"],
  "showEmailOptions": ["original", "modified", "pdf", "docx", "track_changes", "changedPagesPdf"],
  "defaultEmailChecked": ["pdf"],
  "enableHints": true,
  "showPathAfterAction": true,
  "enableCancelCompare": true,
  "namePrefixes": {
    "pdf": "Redline - ",
    "docx": "Redline - ",
    "track_changes": "Track Changes - ",
    "changedPagesPdf": "Redline Pages - "
  },
  "nameTemplate": "{prefix}{original} and {modified}",
  "emailSubjectTemplate": "Document Comparison ({original} vs {modified})"
}
```

### POST /admin/api/settings.asp
Saves the admin settings.

**Request Body:** JSON object with admin settings

**Response:** 200 OK on success

### POST /admin/api/reset.asp
Resets admin settings to defaults.

**Response:** 200 OK on success (returns the default JSON)

## Implementation

The endpoints read/write these files:
- Active settings: `admin/admin-settings.json`
- Defaults: `admin/admin-settings.default.json`

## Implementation Notes

- Admin settings are fetched on add-in startup and merged with user settings
- Visibility controls override user preferences
- Default settings only apply to new users or when users reset their settings
- Existing users keep their current customizations within the allowed options

## Development Setup

1. Ensure your add-in server (localhost:3000) hosts the `admin` folder
2. Ensure classic ASP is enabled in IIS for `/admin/api/*.asp`
3. Access the admin portal to configure settings
4. The add-in will automatically fetch and apply admin settings

## Security Considerations

- App-level Basic Auth is enforced for write/reset endpoints via `admin/api/auth.json`
- Update `admin/api/auth.json` with your desired username/password
- Ensure Classic ASP is enabled for `/admin/api/*.asp`
- Consider audit logging for admin setting changes

## Error Detail Toggle (IIS)

Detailed error output is disabled by default across the site. You can selectively enable it in `web.config`:

- **Site-wide**: `<system.webServer>` block
- **Admin UI only**: `<location path="admin">`
- **Admin API only**: `<location path="admin/api">`

To enable detailed errors for a scope, set:
- `errorMode="Detailed"`
- `scriptErrorSentToBrowser="true"`

To disable, set:
- `errorMode="Custom"`
- `scriptErrorSentToBrowser="false"`
