import express from 'express';
import {
  getCompareServerSettings,
  updateCompareServerSettings,
  buildRenderingOptionsString,
} from '../models/compareServerSettings.js';
import { DEFAULT_COMPARE_SERVER_SETTINGS, queryRun } from '../db/client.js';

export const compareServerSettingsRouter = express.Router();

// Get settings
compareServerSettingsRouter.get('/', (req, res) => {
  try {
    const settings = getCompareServerSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve compare server settings' });
  }
});

// Update settings
compareServerSettingsRouter.put('/', (req, res) => {
  try {
    const updated = updateCompareServerSettings(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update compare server settings' });
  }
});

// Reset settings
compareServerSettingsRouter.post('/reset', (req, res) => {
  try {
    queryRun(
      `UPDATE compare_server_settings SET
        compare_headers_footers = ?, compare_footnotes = ?, compare_character_level = ?,
        ignore_case_changes = ?, ignore_textboxes = ?, ignore_tables = ?, compare_comments = ?,
        compare_images = ?, detect_list_numbering = ?, detect_movements = ?, detect_whitespace = ?,
        detect_paragraph_changes = ?, detect_font_changes = ?, detect_para_style_changes = ?,
        detect_char_style_changes = ?, remove_pages_without_changes = ?, include_statistics = ?,
        include_summary = ?, show_workshare_footers = ?, show_change_numbering = ?,
        paragraph_threshold = ?, output_format = ?, updated_at = ?
       WHERE id = 1`,
      [
        DEFAULT_COMPARE_SERVER_SETTINGS.compare_headers_footers,
        DEFAULT_COMPARE_SERVER_SETTINGS.compare_footnotes,
        DEFAULT_COMPARE_SERVER_SETTINGS.compare_character_level,
        DEFAULT_COMPARE_SERVER_SETTINGS.ignore_case_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.ignore_textboxes,
        DEFAULT_COMPARE_SERVER_SETTINGS.ignore_tables,
        DEFAULT_COMPARE_SERVER_SETTINGS.compare_comments,
        DEFAULT_COMPARE_SERVER_SETTINGS.compare_images,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_list_numbering,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_movements,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_whitespace,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_paragraph_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_font_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_para_style_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.detect_char_style_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.remove_pages_without_changes,
        DEFAULT_COMPARE_SERVER_SETTINGS.include_statistics,
        DEFAULT_COMPARE_SERVER_SETTINGS.include_summary,
        DEFAULT_COMPARE_SERVER_SETTINGS.show_workshare_footers,
        DEFAULT_COMPARE_SERVER_SETTINGS.show_change_numbering,
        DEFAULT_COMPARE_SERVER_SETTINGS.paragraph_threshold,
        DEFAULT_COMPARE_SERVER_SETTINGS.output_format,
        new Date().toISOString(),
      ]
    );
    const settings = getCompareServerSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset compare server settings' });
  }
});

// Build rendering options string
compareServerSettingsRouter.get('/build-rendering-options', (req, res) => {
  try {
    const settings = getCompareServerSettings();
    const renderingOptions = buildRenderingOptionsString(settings);
    res.json({
      renderingOptions,
      outputFormat: settings.output_format,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to build rendering options' });
  }
});
