# LiteraCompareServer Custom View

This subdirectory contains a custom viewer implementation designed to work with the Litera Compare Server.

## How it works

The Custom View provides a web-based interface (HTML/CSS/JS) to upload original and modified documents, submit them to the Litera Compare Server API, and render the comparison results using the `deltaview.js` component provided by Litera.

### Key Components:
- **`home.html` / `home.js`**: Provides the form to select the original and modified documents. Upon submission, it calls the `/WorkshareCompareApi/api/uicompare` endpoint (via POST request) to start the comparison. It then redirects to the viewer page.
- **`viewer.html` / `viewer.js`**: Parses the `comparisonUrl` and utilizes `window.deltaview.init` and `window.deltaview.render` to display the redline result directly in the browser. It also includes DOM observer logic to enhance the viewer UI (e.g. showing category tabs based on feature flags).

*Note: This integration relies on the Litera Compare Server backend and its frontend assets (like `deltaview.js`) being reachable on the server.*
