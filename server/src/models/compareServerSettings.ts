import { queryGet, queryRun } from '../db/client.js';

export interface CompareServerSettings {
  compare_headers_footers: number;
  compare_footnotes: number;
  compare_character_level: number;
  ignore_case_changes: number;
  ignore_textboxes: number;
  ignore_tables: number;
  compare_comments: number;
  compare_images: number;
  detect_list_numbering: number;
  detect_movements: number;
  detect_whitespace: number;
  detect_paragraph_changes: number;
  detect_font_changes: number;
  detect_para_style_changes: number;
  detect_char_style_changes: number;
  remove_pages_without_changes: number;
  include_statistics: number;
  include_summary: number;
  show_workshare_footers: number;
  show_change_numbering: number;
  paragraph_threshold: number;
  output_format: 'Rtf' | 'Doc' | 'DocX' | 'Pdf' | 'TrackChanges' | 'RedlineJSON' | 'RedlineMl';
}

export function getCompareServerSettings(): CompareServerSettings {
  const row = queryGet<CompareServerSettings>(
    `SELECT
      compare_headers_footers, compare_footnotes, compare_character_level, ignore_case_changes,
      ignore_textboxes, ignore_tables, compare_comments, compare_images, detect_list_numbering,
      detect_movements, detect_whitespace, detect_paragraph_changes, detect_font_changes,
      detect_para_style_changes, detect_char_style_changes, remove_pages_without_changes,
      include_statistics, include_summary, show_workshare_footers, show_change_numbering,
      paragraph_threshold, output_format
     FROM compare_server_settings WHERE id = 1`
  );
  if (!row) throw new Error('Compare server settings not found');
  return row;
}

export function updateCompareServerSettings(settings: Partial<CompareServerSettings>): CompareServerSettings {
  const current = getCompareServerSettings();
  const next = { ...current, ...settings };

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
      next.compare_headers_footers, next.compare_footnotes, next.compare_character_level,
      next.ignore_case_changes, next.ignore_textboxes, next.ignore_tables, next.compare_comments,
      next.compare_images, next.detect_list_numbering, next.detect_movements, next.detect_whitespace,
      next.detect_paragraph_changes, next.detect_font_changes, next.detect_para_style_changes,
      next.detect_char_style_changes, next.remove_pages_without_changes, next.include_statistics,
      next.include_summary, next.show_workshare_footers, next.show_change_numbering,
      next.paragraph_threshold, next.output_format, new Date().toISOString(),
    ]
  );
  return next;
}

export function buildRenderingOptionsString(s: CompareServerSettings): string {
  const parts: string[] = [];
  parts.push(`Compare Headers/Footers=${s.compare_headers_footers}`); // 0, 1, 2, 3
  if (s.compare_footnotes) parts.push('Compare Footnotes=1');
  if (s.compare_character_level) parts.push('Compare at Character Level=1');
  if (s.ignore_case_changes) parts.push('Ignore Case Changes=1');
  if (s.ignore_textboxes) parts.push('Ignore Text Boxes=1');
  if (s.ignore_tables) parts.push('Ignore Tables=1');
  if (s.compare_comments) parts.push('Compare Comments=1');
  if (s.compare_images) parts.push('Compare Images=1');
  if (s.detect_list_numbering) parts.push('Detect List Numbering Changes=1');
  if (s.detect_movements) parts.push('Show Movements=1');
  if (s.detect_whitespace) parts.push('Show Changes to Spaces=1');
  if (s.detect_paragraph_changes) parts.push('Show Paragraph Changes=1');
  if (s.detect_font_changes) parts.push('Show Font Changes=1');
  if (s.detect_para_style_changes) parts.push('Show Paragraph Style Changes=1');
  if (s.detect_char_style_changes) parts.push('Show Character Style Changes=1');
  if (s.remove_pages_without_changes) parts.push('Remove Pages Without Changes=1');
  if (s.include_statistics) parts.push('Include Redline Statistics=1');
  if (s.include_summary) parts.push('Include Redline Comparison Summary=1');
  if (s.show_workshare_footers) parts.push('Display Workshare Compare Footers=1');
  if (s.show_change_numbering) parts.push('Show Change Numbering=1');
  parts.push(`Paragraph Matched Text Threshold=${s.paragraph_threshold}`);
  return parts.join(';');
}
