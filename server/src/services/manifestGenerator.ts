import fs from 'fs';
import path from 'path';
import { getManifestSettings } from '../models/manifestSettings.js';
import { getServerConfig } from '../models/serverConfig.js';

function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return `${url.protocol}//${url.host}`;
  } catch {
    return urlStr;
  }
}

export function generateManifestXml(): string {
  const config = getServerConfig();
  const manifest = getManifestSettings();
  
  const normalizedAddinUrl = config.addin_url.replace(/\/+$/, '');
  const normalizedViewerUrl = config.viewer_url.replace(/\/+$/, '');
  
  const addinDomain = extractDomain(normalizedAddinUrl);
  const viewerDomain = extractDomain(normalizedViewerUrl);
  
  const domainForAppDomain = addinDomain;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0" xmlns:ov="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="TaskPaneApp">
  <Id>${manifest.manifest_id}</Id>
  <Version>${manifest.version}</Version>
  <ProviderName>${manifest.provider_name}</ProviderName>
  <DefaultLocale>${manifest.default_locale}</DefaultLocale>
  <DisplayName DefaultValue="${manifest.display_name}" />
  <Description DefaultValue="${manifest.description}" />
  <IconUrl DefaultValue="${normalizedAddinUrl}${manifest.icon_url}" />
  <HighResolutionIconUrl DefaultValue="${normalizedAddinUrl}${manifest.high_resolution_icon_url}" />
  <SupportUrl DefaultValue="${manifest.support_url}" />
  
  <AppDomains>
    <AppDomain>${domainForAppDomain}</AppDomain>
    ${viewerDomain !== addinDomain ? `<AppDomain>${viewerDomain}</AppDomain>` : ''}
  </AppDomains>

  <Hosts>
    <Host Name="Document" />
  </Hosts>

  <DefaultSettings>
    <SourceLocation DefaultValue="${normalizedAddinUrl}/src/taskpane/taskpane.html" />
  </DefaultSettings>

  <Permissions>ReadWriteDocument</Permissions>
  
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="Document">
        <DesktopFormFactor>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <OfficeTab id="${manifest.office_tab_id}">
              <Group id="${manifest.group_id}">
                <Label resid="CommandsGroup.Label" />
                <Icon>
                  <bt:Image size="16" resid="Icon.16x16" />
                  <bt:Image size="32" resid="Icon.32x32" />
                  <bt:Image size="80" resid="Icon.80x80" />
                </Icon>
                <Control xsi:type="Button" id="${manifest.taskpane_id}">
                  <Label resid="TaskpaneButton.Label" />
                  <Supertip>
                    <Title resid="TaskpaneButton.Label" />
                    <Description resid="TaskpaneButton.Tooltip" />
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16x16" />
                    <bt:Image size="32" resid="Icon.32x32" />
                    <bt:Image size="80" resid="Icon.80x80" />
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <TaskpaneId>${manifest.taskpane_id}</TaskpaneId>
                    <SourceLocation resid="Taskpane.Url" />
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    
    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16x16" DefaultValue="${normalizedAddinUrl}/assets/icon-16.png"/>
        <bt:Image id="Icon.32x32" DefaultValue="${normalizedAddinUrl}/assets/icon-32.png"/>
        <bt:Image id="Icon.80x80" DefaultValue="${normalizedAddinUrl}/assets/icon-80.png"/>
      </bt:Images>
      <bt:Urls>
        <bt:Url id="GetStarted.LearnMoreUrl" DefaultValue="https://go.microsoft.com/fwlink/?LinkId=276812" />
        <bt:Url id="Taskpane.Url" DefaultValue="${normalizedAddinUrl}/src/taskpane/taskpane.html?v=20260409-1" />
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="GetStarted.Title" DefaultValue="Compare Server Add-in Loaded" />
        <bt:String id="CommandsGroup.Label" DefaultValue="${manifest.display_name}" />
        <bt:String id="TaskpaneButton.Label" DefaultValue="${manifest.display_name}" />
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="GetStarted.Description" DefaultValue="Your document comparison tool has been loaded successfully." />
        <bt:String id="TaskpaneButton.Tooltip" DefaultValue="Click to open the ${manifest.display_name} task pane." />
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>`;

  return xml;
}
