/**
 * Litera Compare Server - Admin API Client
 * Centralized API client with request/response interceptors, 401 handling,
 * and global toast notification dispatch for network and server errors.
 */

import { ToastItem, ToastType } from '../components/Toast';

// ==========================================
// Types & Interfaces
// ==========================================

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

export interface ManifestSettings {
  id: number;
  manifest_id: string;
  version: string;
  provider_name: string;
  default_locale: string;
  display_name: string;
  description: string;
  icon_url: string;
  high_resolution_icon_url: string;
  support_url: string;
  office_tab_id: string;
  group_id: string;
  debug_logger_tag: string;
  taskpane_id: string;
}

export interface AddinSettings {
  id: number;
  show_save_options: string[];
  show_email_options: string[];
  default_email_checked: string[];
  enable_hints: boolean;
  show_in_download_list: boolean;
  show_path_after_action: boolean;
  remember_last_folder: boolean;
  enable_cancel_compare: boolean;
  name_prefixes: Record<string, string>;
  name_template: string;
  email_subject_template: string;
  lock_name_formatting: boolean;
  lock_email_subject: boolean;
  custom_languages: string;
  hide_settings: boolean;
  hide_settings_hints: boolean;
  hide_settings_save_menu_items: boolean;
  hide_settings_email_menu_items: boolean;
  hide_settings_default_checked: boolean;
  hide_settings_save_behavior: boolean;
  hide_settings_compare_behavior: boolean;
  hide_settings_name_prefixes: boolean;
  hide_settings_email_subject: boolean;
  hide_button_email: boolean;
  hide_button_view: boolean;
  hide_button_cancel: boolean;
  user_override_save_options: boolean;
  user_override_email_options: boolean;
  user_override_templates: boolean;
  user_override_prefixes: boolean;
  user_override_interaction_toggles: boolean;
  allow_custom_rendering_options: boolean;
  enable_password_fields: boolean;
  
  enable_reset_button: boolean;
  enable_new_comparison_btn: boolean;
  new_comparison_target: string;
  enable_save_prompt: boolean;
}

export interface ViewerSettings {
  id?: number;
  show_toolbar: boolean;
  show_statistics: boolean;
  show_redline: boolean;
  show_changelist: boolean;
  show_categories: boolean;
  toolbar_show_pdf: boolean;
  toolbar_show_docx: boolean;
  toolbar_show_tracked: boolean;
  toolbar_show_changed_pages: boolean;
  toolbar_show_print: boolean;
  toolbar_show_nav_arrows: boolean;
  accept_changes_enabled: boolean;
  enable_reset_button: boolean;
  loading_message: string;
  custom_languages: string;
  show_rendering_params_on_home: boolean;
  enable_password_fields: boolean;

  enable_cancel?: boolean;
  enable_new_comparison_btn?: boolean;
  new_comparison_target?: string;
  enable_save_prompt?: boolean;
  name_template?: string;
  name_prefixes?: Record<string, string>;
  user_override_templates?: boolean;
  user_override_prefixes?: boolean;
  enable_name_templates?: boolean;
  allow_user_edit_filename?: boolean;
  enable_save_as_dialog?: boolean;
}

export interface CompareServerSettings {
  id: number;
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
  updated_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  created_at: string;
  last_login_at: string | null;
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

export interface SsoConfig {
  id: number;
  enabled: boolean;
  tenant_id: string;
  client_id: string;
  addin_redirect_uri: string;
  web_redirect_uri: string;
  allowed_domains: string;
  scopes: string;
  require_login_to_compare: boolean;
  authority_url?: string;
  updated_at: string;
}

export interface ComparisonActivity {
  id: number;
  user_id: string;
  user_email: string;
  user_name: string;
  source: 'addin' | 'web';
  original_filename: string;
  modified_filename: string;
  comparison_id: string;
  server_status: 'success' | 'failed' | 'unknown';
  http_status_code: number;
  duration_ms: number;
  error_message?: string;
  total_changes: number;
  ip_address?: string;
  created_at: string;
  request_headers?: string;
  response_headers?: string;
  has_custom_rendering?: boolean;
  rendering_parameters?: string;
  machine_info?: string;
}

export interface ActivitySettings {
  logging_enabled: boolean;
  log_with_sso: boolean;
  log_without_sso: boolean;
  retention_days: number;
}

export interface UserStatsSummary {
  user_email: string;
  user_name: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  addin_requests: number;
  web_requests: number;
  last_active: string;
}

export interface ActivityDashboardSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  addinRequests: number;
  webRequests: number;
  uniqueUsersCount: number;
  averageLatencyMs: number;
  userSummaries: UserStatsSummary[];
  recentTimeline: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
  }>;
}

export interface ActivityFilterOptions {
  user?: string;
  source?: 'all' | 'addin' | 'web';
  status?: 'all' | 'success' | 'failed' | 'unknown' | 'failed_any';
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface SsoEventSummary {
  addinLogins: number;
  webLogins: number;
  addinLogouts: number;
  webLogouts: number;
  totalLogins: number;
  recentLogins: Array<{
    user_email: string | null;
    user_name: string | null;
    source: string;
    created_at: string;
  }>;
}

export interface RequestOptions extends RequestInit {
  /** Skip automatic redirect/logout on 401 Unauthorized */
  skipAuthRedirect?: boolean;
  /** Skip automatic global toast error notification */
  skipErrorToast?: boolean;
  /** Custom fallback error message for toasts */
  customErrorMessage?: string;
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  data: any;
  isNetworkError: boolean;
  isUnauthorized: boolean;

  constructor(message: string, status = 0, statusText = '', data: any = null, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.isNetworkError = isNetworkError;
    this.isUnauthorized = status === 401;
  }
}

// ==========================================
// Toast Notification Manager (Singleton)
// ==========================================

type ToastListener = (toasts: ToastItem[]) => void;

class GlobalToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private recentMessages: Map<string, number> = new Map();

  getToasts(): ToastItem[] {
    return [...this.toasts];
  }

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = this.getToasts();
    this.listeners.forEach((listener) => listener(list));
  }

  show(options: {
    message: string;
    type?: ToastType;
    title?: string;
    duration?: number;
  }): string {
    const { message, type = 'info', title, duration } = options;

    // Deduplicate identical error messages within 1.5 seconds to prevent spamming
    const dedupKey = `${type}:${title || ''}:${message}`;
    const now = Date.now();
    const lastSeen = this.recentMessages.get(dedupKey);
    if (lastSeen && now - lastSeen < 1500) {
      return '';
    }
    this.recentMessages.set(dedupKey, now);

    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const defaultDuration =
      duration ?? (type === 'error' ? 6000 : type === 'warning' ? 5000 : type === 'success' ? 3500 : 4000);

    const newToast: ToastItem = {
      id,
      type,
      title,
      message,
      duration: defaultDuration,
      timestamp: now,
    };

    // Keep max 5 toasts visible at a time
    this.toasts = [newToast, ...this.toasts.slice(0, 4)];
    this.notify();

    if (defaultDuration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, defaultDuration);
    }

    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clearAll() {
    this.toasts = [];
    this.notify();
  }
}

export const ToastManager = new GlobalToastManager();

export const toast = {
  show: (msg: string, type: ToastType = 'info', title?: string, duration?: number) =>
    ToastManager.show({ message: msg, type, title, duration }),
  success: (msg: string, title = 'Success', duration?: number) =>
    ToastManager.show({ message: msg, type: 'success', title, duration }),
  error: (msg: string, title = 'Error', duration?: number) =>
    ToastManager.show({ message: msg, type: 'error', title, duration }),
  warning: (msg: string, title = 'Warning', duration?: number) =>
    ToastManager.show({ message: msg, type: 'warning', title, duration }),
  info: (msg: string, title = 'Notice', duration?: number) =>
    ToastManager.show({ message: msg, type: 'info', title, duration }),
  dismiss: (id: string) => ToastManager.dismiss(id),
  clear: () => ToastManager.clearAll(),
};

// ==========================================
// Centralized API Client & Interceptors
// ==========================================

type RequestInterceptor = (url: string, options: RequestOptions) => Promise<{ url: string; options: RequestOptions }> | { url: string; options: RequestOptions };
type ResponseSuccessInterceptor<T = any> = (response: Response, data: T, options: RequestOptions) => Promise<T> | T;
type ResponseErrorInterceptor = (error: ApiError, options: RequestOptions) => Promise<any> | any;

type UnauthorizedHandler = (error: ApiError) => void;

class ApiClient {
  private unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();
  private requestInterceptors: RequestInterceptor[] = [];
  private responseSuccessInterceptors: ResponseSuccessInterceptor[] = [];
  private responseErrorInterceptors: ResponseErrorInterceptor[] = [];

  constructor() {
    // Register default response error interceptor for 401 and network/server error handling
    this.setupDefaultInterceptors();
  }

  /**
   * Register a listener for 401 Unauthorized events (e.g. AuthContext)
   */
  onUnauthorized(handler: UnauthorizedHandler): () => void {
    this.unauthorizedHandlers.add(handler);
    return () => {
      this.unauthorizedHandlers.delete(handler);
    };
  }

  /**
   * Trigger unauthorized flow manually
   */
  triggerUnauthorized(error?: ApiError) {
    const err = error || new ApiError('Unauthorized: Authentication required', 401, 'Unauthorized');
    this.unauthorizedHandlers.forEach((handler) => {
      try {
        handler(err);
      } catch (e) {
        console.error('Error in unauthorized handler:', e);
      }
    });

    // Also dispatch custom DOM event for external listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('litera:unauthorized', { detail: { error: err } }));
    }
  }

  /**
   * Interceptor registration methods
   */
  public interceptors = {
    request: {
      use: (interceptor: RequestInterceptor) => {
        this.requestInterceptors.push(interceptor);
        return () => {
          this.requestInterceptors = this.requestInterceptors.filter((i) => i !== interceptor);
        };
      },
    },
    response: {
      use: (onSuccess?: ResponseSuccessInterceptor, onError?: ResponseErrorInterceptor) => {
        if (onSuccess) this.responseSuccessInterceptors.push(onSuccess);
        if (onError) this.responseErrorInterceptors.push(onError);
      },
    },
  };

  private setupDefaultInterceptors() {
    // Default centralized response error interceptor
    this.interceptors.response.use(
      // Success pass-through
      (res, data) => data,
      // Error handling
      (error: ApiError, options: RequestOptions) => {
        // 1. Handle 401 Unauthorized
        if (error.isUnauthorized) {
          if (!options.skipAuthRedirect) {
            // Trigger auth reset and notify subscribers
            this.triggerUnauthorized(error);
          }

          if (!options.skipErrorToast) {
            toast.error(
              error.message || 'Session expired or unauthorized. Please sign in again.',
              'Unauthorized (401)'
            );
          }
          return Promise.reject(error);
        }

        // 2. Handle 403 Forbidden
        if (error.status === 403) {
          if (!options.skipErrorToast) {
            toast.error(
              error.message || 'Access denied. You do not have permission to perform this action.',
              'Forbidden (403)'
            );
          }
          return Promise.reject(error);
        }

        // 3. Handle Network Errors
        if (error.isNetworkError) {
          if (!options.skipErrorToast) {
            toast.error(
              'Unable to reach Litera Compare Server. Please verify your connection or ensure the server is active.',
              'Network Error'
            );
          }
          return Promise.reject(error);
        }

        // 4. Handle Server Errors (5xx)
        if (error.status >= 500) {
          if (!options.skipErrorToast) {
            toast.error(
              error.message || `Server encountered an internal error (${error.status}).`,
              `Server Error (${error.status})`
            );
          }
          return Promise.reject(error);
        }

        // 5. Handle General Client Errors (400, 404, 409, 422, etc.)
        if (error.status >= 400 && !options.skipErrorToast) {
          toast.error(
            options.customErrorMessage || error.message || `Request failed with status ${error.status}.`,
            `Request Error (${error.status})`
          );
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Centralized HTTP Request Method
   */
  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    let reqUrl = url;
    let reqOptions: RequestOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      credentials: 'include', // Ensures session cookie is sent with cross-origin or local requests
    };

    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      const intercepted = await interceptor(reqUrl, reqOptions);
      reqUrl = intercepted.url;
      reqOptions = intercepted.options;
    }

    let response: Response;
    try {
      response = await fetch(reqUrl, reqOptions);
    } catch (networkError: any) {
      // Catch fetch network errors (connection refused, offline, CORS, etc.)
      const apiErr = new ApiError(
        networkError?.message || 'Network request failed',
        0,
        'NetworkError',
        null,
        true
      );

      // Execute response error interceptors
      for (const errInterceptor of this.responseErrorInterceptors) {
        await errInterceptor(apiErr, reqOptions);
      }
      throw apiErr;
    }

    // Process HTTP response
    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      let errorData: any = null;

      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } else {
          const text = await response.text();
          if (text && text.length < 200) {
            errorMessage = text;
          }
        }
      } catch {
        // Fallback to default errorMessage
      }

      const apiErr = new ApiError(errorMessage, response.status, response.statusText, errorData, false);

      // Run error interceptors
      for (const errInterceptor of this.responseErrorInterceptors) {
        await errInterceptor(apiErr, reqOptions);
      }
      throw apiErr;
    }

    // Handle successful response
    let data: T;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as unknown as T;
    }

    // Run success interceptors
    let result = data;
    for (const successInterceptor of this.responseSuccessInterceptors) {
      result = await successInterceptor(response, result, reqOptions);
    }

    return result;
  }

  // ==========================================
  // API Resource Methods
  // ==========================================

  // Auth & Setup
  getSetupStatus = (opts?: RequestOptions) =>
    this.request<{ setupRequired: boolean; adminCount: number; installed: boolean }>('/api/auth/setup-status', {
      skipAuthRedirect: true,
      skipErrorToast: true,
      ...opts,
    });

  setupFirstAdmin = (data: { username: string; password: string }, opts?: RequestOptions) =>
    this.request<{ message: string; user: AdminUser; sessionId: string }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuthRedirect: true,
      ...opts,
    });

  login = (data: { username: string; password: string }, opts?: RequestOptions) =>
    this.request<{ message: string; user: AdminUser; sessionId: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuthRedirect: true,
      ...opts,
    });

  logout = (opts?: RequestOptions) =>
    this.request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      skipAuthRedirect: true,
      ...opts,
    });

  getMe = (opts?: RequestOptions) =>
    this.request<{ user: AdminUser }>('/api/auth/me', {
      // Don't pop up unauthorized toast on initial silent probe
      skipErrorToast: true,
      ...opts,
    });

  changePassword = (data: { currentPassword: string; newPassword: string }, opts?: RequestOptions) =>
    this.request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
      ...opts,
    });

  getUsers = (opts?: RequestOptions) =>
    this.request<AdminUser[]>('/api/auth/users', opts);

  createUser = (data: { username: string; password: string }, opts?: RequestOptions) =>
    this.request<AdminUser>('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
      ...opts,
    });

  // Server Config
  getConfig = (opts?: RequestOptions) =>
    this.request<ServerConfig>('/api/config', opts);

  updateConfig = (data: Partial<ServerConfig>, opts?: RequestOptions) =>
    this.request<ServerConfig>('/api/config', {
      method: 'PUT',
      body: JSON.stringify(data),
      ...opts,
    });

  // Addin Settings
  getAddinSettings = (opts?: RequestOptions) =>
    this.request<AddinSettings>('/api/addin-settings', opts);

  updateAddinSettings = (data: Partial<AddinSettings>, opts?: RequestOptions) =>
    this.request<AddinSettings>('/api/addin-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
      ...opts,
    });

  resetAddinSettings = (opts?: RequestOptions) =>
    this.request<AddinSettings>('/api/addin-settings/reset', {
      method: 'POST',
      ...opts,
    });

  // Viewer Settings
  getViewerSettings = (opts?: RequestOptions) =>
    this.request<ViewerSettings>('/api/viewer-settings', opts);

  updateViewerSettings = (data: Partial<ViewerSettings>, opts?: RequestOptions) =>
    this.request<ViewerSettings>('/api/viewer-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
      ...opts,
    });

  // Manifest Settings
  getManifestSettings = (opts?: RequestOptions) =>
    this.request<ManifestSettings>('/api/manifest-settings', opts);

  updateManifestSettings = (data: Partial<ManifestSettings>, opts?: RequestOptions) =>
    this.request<ManifestSettings>('/api/manifest-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
      ...opts,
    });

  // Compare Server Settings
  getCompareServerSettings = (opts?: RequestOptions) =>
    this.request<CompareServerSettings>('/api/compare-server-settings', opts);

  updateCompareServerSettings = (data: Partial<CompareServerSettings>, opts?: RequestOptions) =>
    this.request<CompareServerSettings>('/api/compare-server-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
      ...opts,
    });

  resetCompareServerSettings = (opts?: RequestOptions) =>
    this.request<CompareServerSettings>('/api/compare-server-settings/reset', {
      method: 'POST',
      ...opts,
    });

  buildRenderingOptions = (opts?: RequestOptions) =>
    this.request<{ renderingOptions: string; outputFormat: string }>('/api/compare-server-settings/build-rendering-options', opts);

  // Installer & Deploy
  runDeploy = (data: Partial<ServerConfig>, opts?: RequestOptions) =>
    this.request<DeployResult>('/api/installer/run', {
      method: 'POST',
      body: JSON.stringify(data),
      ...opts,
    });

  // Backup & Restore
  downloadBackup = (type: 'master' | 'config' | 'addin' | 'viewer') => {
    window.location.href = `/api/backup?type=${type}`;
  };

  restoreBackup = (data: any, opts?: RequestOptions) =>
    this.request<{ success: boolean; message: string }>('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify(data),
      ...opts,
    });

  // Microsoft Entra SSO & Activity Tracking
  getSsoConfig = (opts?: RequestOptions) =>
    this.request<{ success: boolean; config: SsoConfig }>('/api/sso/config', opts).then((r) => r.config);

  updateSsoConfig = (data: Partial<SsoConfig>, opts?: RequestOptions) =>
    this.request<{ success: boolean; config: SsoConfig }>('/api/sso/config', {
      method: 'PUT',
      body: JSON.stringify(data),
      ...opts,
    }).then((r) => r.config);

  testSsoConfig = (data: { tenant_id?: string; client_id?: string }, opts?: RequestOptions) =>
    this.request<any>('/api/sso/test', {
      method: 'POST',
      body: JSON.stringify(data),
      ...opts,
    });

  getActivitySettings = (opts?: RequestOptions) =>
    this.request<{ success: boolean; settings: ActivitySettings }>('/api/activity/settings', opts).then((r) => r.settings);

  getActiveUsers = (opts?: RequestOptions) =>
    this.request<{ success: boolean; activeUsers: any[] }>('/api/activity/active-users', opts).then(r => r.activeUsers);

  updateActivitySettings = (data: Partial<ActivitySettings>, opts?: RequestOptions) =>
    this.request<{ success: boolean; settings: ActivitySettings }>('/api/activity/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
      ...opts,
    }).then((r) => r.settings);

  getSsoActivity = (params: ActivityFilterOptions = {}, opts?: RequestOptions) => {
    const query = new URLSearchParams();
    if (params.user && params.user !== 'all') query.set('user', params.user);
    if (params.source && params.source !== 'all') query.set('source', params.source);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const qs = query.toString();
    return this.request<{ success: boolean; items: ComparisonActivity[]; total: number }>(
      `/api/activity/logs${qs ? `?${qs}` : ''}`,
      opts
    );
  };

  getSsoSummary = (params: ActivityFilterOptions = {}, opts?: RequestOptions) => {
    const query = new URLSearchParams();
    if (params.user && params.user !== 'all') query.set('user', params.user);
    if (params.source && params.source !== 'all') query.set('source', params.source);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);

    const qs = query.toString();
    return this.request<{ success: boolean; summary: ActivityDashboardSummary }>(
      `/api/activity/summary${qs ? `?${qs}` : ''}`,
      opts
    ).then((r) => r.summary);
  };

  getSsoUsers = (opts?: RequestOptions) =>
    this.request<{ success: boolean; users: Array<{ email: string; name: string }> }>(
      '/api/activity/users',
      opts
    ).then((r) => r.users);

  getExportUrl = (params: ActivityFilterOptions = {}, format: 'csv' | 'json' = 'csv'): string => {
    const query = new URLSearchParams();
    if (params.user && params.user !== 'all') query.set('user', params.user);
    if (params.source && params.source !== 'all') query.set('source', params.source);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    query.set('format', format);
    return `/api/activity/export?${query.toString()}`;
  };

  getSsoEventSummary = (opts?: RequestOptions) =>
    this.request<{ success: boolean; summary: SsoEventSummary }>(
      '/api/sso/events/summary',
      opts
    ).then((r) => r.summary);

  // Health
  getHealth = (opts?: RequestOptions) =>
    this.request<any>('/api/health', opts);
}

export const api = new ApiClient();

/**
 * fetchWrapper: Direct fetch wrapper function that automatically handles 401
 * Unauthorized errors by redirecting to login and utilizes Toast notifications
 * to display error messages for all non-200 responses.
 */
export async function fetchWrapper<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  return api.request<T>(url, options);
}

export default api;

