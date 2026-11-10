import { queryGet, queryRun } from '../db/client.js';

export type InstallMode = 'full' | 'addin' | 'viewer';

export interface ServerConfig {
  id: number;
  compare_server_url: string;
  addin_url: string;
  viewer_url: string;
  install_mode: InstallMode;
  installed_at: string | null;
  app_name: string;
  app_base_url: string;
  brand_logo_text: string;
  brand_title: string;
  brand_subtitle: string;
  cors_mode: 'bypass' | 'strict' | 'custom';
  cors_allowed_origins: string;
  enqueue_endpoint_url?: string;
  active_endpoint: 'compare' | 'enqueue';
}

export function getServerConfig(): ServerConfig {
  const row = queryGet<ServerConfig>('SELECT * FROM server_config WHERE id = 1');
  if (!row) {
    return {
      id: 1,
      compare_server_url: 'https://compare.litera.com/api/v1',
      addin_url: 'http://localhost:3000/addin',
      viewer_url: 'http://localhost:3000/viewer',
      install_mode: 'full',
      installed_at: null,
      app_name: 'Litera Compare Server admin Console',
      app_base_url: 'http://localhost:3000',
      brand_logo_text: 'L',
      brand_title: 'Compare Server',
      brand_subtitle: 'Enterprise Document Comparison',
      cors_mode: 'bypass',
      cors_allowed_origins: '',
      enqueue_endpoint_url: '',
      active_endpoint: 'compare',
    };
  }
  
  // Normalize old modes in code if they leak
  if (['addin_and_admin_and_viewer', 'addin_admin_and_viewer'].includes(row.install_mode as string)) {
    row.install_mode = 'full';
  } else if ((row.install_mode as string) === 'addin_and_admin') {
    row.install_mode = 'addin';
  } else if (['addin_and_viewer', 'viewer_only'].includes(row.install_mode as string)) {
    row.install_mode = 'viewer';
  }
  
  return row;
}

export function updateServerConfig(data: Partial<Omit<ServerConfig, 'id'>>): ServerConfig {
  const current = getServerConfig();
  const updated: ServerConfig = {
    ...current,
    ...data,
  };

  queryRun(
    `UPDATE server_config SET
      compare_server_url = ?,
      addin_url = ?,
      viewer_url = ?,
      install_mode = ?,
      installed_at = ?,
      app_name = ?,
      app_base_url = ?,
      brand_logo_text = ?,
      brand_title = ?,
      brand_subtitle = ?,
      cors_mode = ?,
      cors_allowed_origins = ?,
      enqueue_endpoint_url = ?,
      active_endpoint = ?
     WHERE id = 1`,
    [
      updated.compare_server_url,
      updated.addin_url,
      updated.viewer_url,
      updated.install_mode,
      updated.installed_at || new Date().toISOString(),
      updated.app_name,
      updated.app_base_url,
      updated.brand_logo_text,
      updated.brand_title,
      updated.brand_subtitle,
      updated.cors_mode,
      updated.cors_allowed_origins,
      updated.enqueue_endpoint_url || '',
      updated.active_endpoint,
    ]
  );

  return getServerConfig();
}
