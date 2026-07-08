# LiteraCompareServer Add-in

This directory contains a single-page task pane add-in (using Office.js) for Microsoft Word that integrates with the Litera Compare Server.

## Functionality Overview

The add-in provides a seamless UI within Word to:
1. **Select Documents:** Choose an Original and a Modified document either from the current Word document or from a local device.
2. **Compare:** Send both documents to the Litera Compare API.
3. **View Results:** Open the comparison result in a browser window.
4. **Save Outputs:** Save the comparison redlines in multiple formats (PDF, DOCX, Track Changes, Redline Pages).
5. **Email Packaging:** Generate an Outlook `.eml` draft with selected original, modified, and redline attachments.

## Core Features and Functions

- **File Selection:** Allows picking the active Word document or uploading local files (`.doc`, `.docx`, `.rtf`, `.txt`, `.pdf`). It supports swapping the original and modified files.
- **Compare Flow:** Posts the documents to the `/WorkshareCompareApi/api/uicompare` endpoint and retrieves a comparison URL.
- **Save / Export Flow:** Downloads the result directly using different formats (`pdf`, `docx`, `track_changes`, `changedPagesPdf`). It manages file naming conventions via customizable templates (e.g., `Redline - Original and Modified.pdf`).
- **Email Generation:** Generates a `multipart/mixed` `.eml` file client-side, embedding selected documents as Base64 encoded attachments, ready to be opened as a draft in Outlook.
- **Settings:** Customizable settings stored locally, including:
  - Default save folders via File System Access API.
  - Custom file naming templates and prefixes.
  - Enabling/disabling save and email options.
  - Setting default email subject templates.

For more deep-dive technical details, including the architectural overview and storage details, refer to the [ADDIN_TECHNICAL_DOCUMENTATION.md](ADDIN_TECHNICAL_DOCUMENTATION.md) file located in this directory.
