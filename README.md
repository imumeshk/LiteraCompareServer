# LiteraCompareServer

> [!IMPORTANT]
> **Disclaimer:** Litera Compare Server is a property of Litera. This repository does NOT contain any Litera proprietary code. It solely provides examples, tools, and options to utilize the Litera Compare Server.

## Deployment

The server (Node.js + Express + SQLite), admin panel (React), web viewer and Word add-in all run from a single Node.js process. Pick **one** of the options below.

For the full reference (settings, SSO, translations, API, troubleshooting) see [GUIDE.md](GUIDE.md).

### Prerequisites

| Option | Requirements |
|---|---|
| Docker | Docker Desktop (latest), Windows PowerShell 5.1+ or PowerShell 7 |
| Server (Node.js) | Node.js 20 LTS, npm 10+, PowerShell 5.1+ |
| Portable | PowerShell 5.1+, internet access for the first Node.js download |
| IIS reverse proxy (optional) | Administrator PowerShell, IIS + URL Rewrite + ARR, a LocalMachine certificate with private key |

If scripts are blocked:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 1. Get the code

```powershell
git clone https://github.com/imumeshk/LiteraCompareServer.git
cd LiteraCompareServer
```

### 2. Configure the environment

```powershell
Copy-Item .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `server/data/app.db` | SQLite database file |
| `SESSION_SECRET` | *(example value)* | Secret for signing admin session cookies. **Set a strong unique value in production.** |
| `PORT` | `3000` | Port the Node.js server listens on |
| `APP_URL` | `http://localhost:3000` | Public base URL (used for SSO redirects and manifest URLs) |
| `USE_NATIVE_SSL` | `false` | `true` for native Node.js SSL, `false` when behind an IIS reverse proxy |
| `SSL_CERT_PATH` / `SSL_KEY_PATH` | empty | Certificate and key paths when `USE_NATIVE_SSL=true` |

`.env` is git-ignored. Never commit it.

### 3. Deploy

Run the deployment script and choose a mode:

```powershell
.\deploy.ps1
```

| Choice | Mode | Notes |
|---|---|---|
| 1 | **Docker Deploy** (recommended) | Builds an image and runs it with a persistent volume for `server/data` |
| 2 | **Server Deploy** | Runs `npm install` and `npm run build`, then runs directly on the host. Includes start/stop, logs, startup task and NSSM service options |
| 3 | **Portable Run** | Downloads an isolated Node.js into `portable/` and runs from there |

The same menu also offers Status Check, Dry Run, Backup, IIS Reverse Proxy setup/repair and a Diagnostics Bundle.

**Manual Docker alternative** (without the script):

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

**Manual Node.js alternative** (development):

```bash
npm install
npm --prefix server install
npm run dev        # Vite dev server on port 3000
npm run start      # API/server via tsx
```

### 4. First-time setup

After deployment open:

| URL | Purpose |
|---|---|
| `{APP_URL}/installer` | First-time setup wizard (create the admin account, point to your Litera Compare API) |
| `{APP_URL}/` | Admin panel |
| `{APP_URL}/viewer` | Web viewer portal |
| `{APP_URL}/api/health` | Health check |

Then, from the admin panel, configure Microsoft Entra SSO (optional) and download the generated Office Add-in `manifest.xml` to sideload or centrally deploy it in Word.

### Updating

Re-run `.\deploy.ps1` and choose **Update (rebuild)**. A configuration backup is created automatically and data in `server/data` is preserved.
