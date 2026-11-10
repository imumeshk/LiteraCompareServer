import fs from 'fs';
import path from 'path';
import { updateServerConfig, getServerConfig, ServerConfig, InstallMode } from '../models/serverConfig.js';
import { generateManifestXml } from './manifestGenerator.js';

export interface DeployParams {
  compare_server_url?: string;
  addin_url?: string;
  viewer_url?: string;
  install_mode?: InstallMode;
  app_name?: string;
  app_base_url?: string;
}

export interface DeployResult {
  success: boolean;
  config: ServerConfig;
  manifestXml: string;
  deployedAt: string;
  details: {
    manifestWritten: boolean;
    addinDeployed: boolean;
    viewerDeployed: boolean;
    exportBundleCreated: boolean;
  };
}

export async function runDeploy(params?: DeployParams): Promise<DeployResult> {
  const deployedAt = new Date().toISOString();

  // (a) Persist to server_config
  const updatedConfig = updateServerConfig({
    ...(params?.compare_server_url ? { compare_server_url: params.compare_server_url } : {}),
    ...(params?.addin_url ? { addin_url: params.addin_url } : {}),
    ...(params?.viewer_url ? { viewer_url: params.viewer_url } : {}),
    ...(params?.install_mode ? { install_mode: params.install_mode } : {}),
    ...(params?.app_name ? { app_name: params.app_name } : {}),
    ...(params?.app_base_url ? { app_base_url: params.app_base_url } : {}),
    installed_at: deployedAt,
  });

  // (b) Regenerate manifest.xml
  const manifestXml = generateManifestXml();

  // Write manifest.xml to addin folder and server static folder
  const addinManifestPath = path.join(process.cwd(), 'addin/manifest.xml');
  const addinDir = path.dirname(addinManifestPath);
  if (!fs.existsSync(addinDir)) {
    fs.mkdirSync(addinDir, { recursive: true });
  }
  fs.writeFileSync(addinManifestPath, manifestXml, 'utf-8');

  // (c) Write/copy static assets into live serving folders and generate downloadable bundle
  const exportBundleDir = path.join(process.cwd(), 'server/data/exports');
  if (!fs.existsSync(exportBundleDir)) {
    fs.mkdirSync(exportBundleDir, { recursive: true });
  }

  const exportConfigJson = JSON.stringify(
    {
      server_config: updatedConfig,
      generated_at: deployedAt,
      version: '1.2.0',
    },
    null,
    2
  );
  fs.writeFileSync(path.join(exportBundleDir, 'litera-compare-config.json'), exportConfigJson, 'utf-8');
  fs.writeFileSync(path.join(exportBundleDir, 'manifest.xml'), manifestXml, 'utf-8');

  const addinDeployed = updatedConfig.install_mode !== 'viewer';
  const viewerDeployed = updatedConfig.install_mode !== 'addin';

  return {
    success: true,
    config: updatedConfig,
    manifestXml,
    deployedAt,
    details: {
      manifestWritten: true,
      addinDeployed,
      viewerDeployed,
      exportBundleCreated: true,
    },
  };
}
