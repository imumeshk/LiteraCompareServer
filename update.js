const fs = require('fs');
let guide = fs.readFileSync('GUIDE.md', 'utf8');

const replaceAll = (str, search, replacement) => str.split(search).join(replacement);

guide = replaceAll(guide, 'http://localhost:3000/installer', '{APP_URL}/installer');
guide = replaceAll(guide, 'http://localhost:3000/viewer', '{APP_URL}/viewer');
guide = replaceAll(guide, 'http://localhosu:3000/api/health', '{APP_URL}/api/health');
guide = replaceAll(guide, 'http://localhosu:3000/api/', '{APP_URL}/api/');
guide = replaceAll(guide, 'http://localhosu:3000/', '{APP_URL}/');
guide = replaceAll(guide, 'http://localhost:3000', '{APP_URL}');

guide = replaceAll(guide, 'port `3000` and share a SQLite database', 'port `3000` (or as configured in `.env`) and share a SQLite database');
guide = replaceAll(guide, 'A new container is started on **port 3000**, persisting', 'A new container is started on your configured **port**, persisting');

const envSectionStr = '| `APP_URL` | `{APP_URL}` | Public-facing base URL (used in SSO redirects, manifest URLs) |';

const envSectionNew = *| `APP_URL` | `{APP_URL}` | Public-facing base URL (used in SSO redirects, manifest URLs) |\n\| `USE_NATIVE_SSL` | `false` | Set to `true` to enable native SSL for the Docker deployment |\n\| `SSL_CERT_PATH` | `""` | Absolute path to the SSL certificate file on the host machine |\n\| `SSL_KEY_PATH` | \""` | Absolute path to the SSL private key file on the host machine |*;
guide = replaceAll(guide, envSectionStr, envSectionNew);

const saveDialogStr = '| **Show "Save As" Folder Picker** | Off | If enabled, presents a "Choose Folder..." option in the HTML Save Dialog. Only supported on Chromium browsers with HTTPS. |';

const saveDialogNew = '| **Show "Save As" Folder Picker** | Off | If enabled, presents a "Choose Folder..." option in the HTML Save Dialog. Only supported on Chromium browsers with HTTPS. |\n\n> **Technical Note on Downloads & Proxying:**  \n> The Viewer Portal overrides the native DeltaView save buttons to intercept downloads. Instead of letting DeltaView trigger direct downloads (which can cause CORS issues or lack custom naming), the portal routes comparison API calls through a local **Node.js proxy (`/proxy/...`)**. This bypasses CORS restrictions and allows the portal to present an interactive **HTML Save Dialog**. Before saving, the proxy endpoint `/prepareDownload` is called. As a fallback, native `window.open` and `iframe.src` are overridden to ensure rogue downloads are intercepted.';
guide = replaceAll(guide, saveDialogStr, saveDialogNew);

fs.writeFileSync('GUIDE.md', guide, 'utf8');

