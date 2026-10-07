/**
 * API Configuration for MetroFlow Online Sync
 * Enables real-time synchronization of disruptions and articles across all devices,
 * whether running locally, on the live server, or deployed to GitHub Pages.
 */

export const DEFAULT_LIVE_SERVER_URL =
  'https://ais-pre-6mugnqwqjl7vlqsues7fja-274518077471.europe-west2.run.app';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  // 1. Check for user-defined custom API server URL
  try {
    const custom = localStorage.getItem('metroflow_api_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  } catch {}

  // 2. If running on GitHub Pages (or static CDN host) where /api/* does not exist locally
  const hostname = window.location.hostname;
  if (
    hostname.includes('github.io') ||
    hostname.includes('pages.dev') ||
    hostname.includes('netlify.app') ||
    hostname.includes('vercel.app')
  ) {
    return DEFAULT_LIVE_SERVER_URL;
  }

  // 3. Otherwise, use relative origin (works on localhost:3000, preview server, and Cloud Run host)
  return '';
}

export function getCustomApiUrl(): string {
  try {
    return localStorage.getItem('metroflow_api_url') || '';
  } catch {
    return '';
  }
}

export function setCustomApiUrl(url: string): void {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem('metroflow_api_url');
    } else {
      localStorage.setItem('metroflow_api_url', url.trim().replace(/\/+$/, ''));
    }
  } catch {}
}
