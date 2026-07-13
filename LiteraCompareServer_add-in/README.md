# LiteraCompareServer Add-in

This directory contains a single-page task pane add-in (using Office.js) for Microsoft Word that integrates with the Litera Compare Server.

## Functionality Overview

The add-in provides a seamless UI within Word to:
1. **Select Documents:** Choose an Original and a Modified document either from the current Word document or from a local device.
2. **Compare:** Send both documents to the Litera Compare API.
3. **View Results:** Open the comparison result in a browser window.
4. **Save Outputs:** Save the comparison redlines in multiple formats (PDF, DOCX, Track Changes, Redline Pages).
5. **Email Packaging:** Generate an Outlook `.eml` draft with selected original, modified, and redline attachments.

<img width="514" height="817" alt="image" src="https://github.com/user-attachments/assets/711204dc-ed21-4ee2-b3dd-a8bb9c8d6f6a" />
<img width="499" height="775" alt="image" src="https://github.com/user-attachments/assets/4c7bef2e-0e03-4e66-a38e-371ea17fa341" />
<img width="531" height="739" alt="image" src="https://github.com/user-attachments/assets/fe458206-a8c8-45c9-9beb-8544865196b2" />
<img width="535" height="750" alt="image" src="https://github.com/user-attachments/assets/620e5590-bed2-4f86-9c54-bdb4edef471c" />
<img width="529" height="742" alt="image" src="https://github.com/user-attachments/assets/51162e94-7d9e-410c-bed2-c7b28934bed6" />
<img width="532" height="271" alt="image" src="https://github.com/user-attachments/assets/2c26e21c-ce4f-4c9e-b3b7-22c13ff92482" />
<img width="1198" height="924" alt="image" src="https://github.com/user-attachments/assets/4bbc0b70-65a9-405a-9c22-ca57aaf9da39" />
<img width="1201" height="633" alt="image" src="https://github.com/user-attachments/assets/4d03c187-6684-42a4-bdcc-4103d9b22a8b" />
<img width="1203" height="946" alt="image" src="https://github.com/user-attachments/assets/e1a39a4e-27c5-4dcf-8e53-b161573f23e1" />

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
