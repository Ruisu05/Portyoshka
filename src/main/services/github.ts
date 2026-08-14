import { AppError } from './errors';
import type { ReleaseInfo } from '../../shared/types';

const API_ROOT = 'https://api.github.com';
const DEFAULT_TIMEOUT_MS = 30000;

export async function getLatestRelease(repo: string, token?: string): Promise<ReleaseInfo> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}/repos/${repo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'portyoshka',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });
  } catch (err) {
    const name = (err as Error).name;
    if (name === 'AbortError') {
      throw new AppError('NETWORK_OFFLINE', `The request to GitHub timed out (${repo})`);
    }
    throw new AppError('NETWORK_OFFLINE', `Cannot reach GitHub. Check your network connection. (${repo})`);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 403 || response.status === 429) {
    const reset = response.headers.get('x-ratelimit-reset');
    const until = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : 'later';
    throw new AppError(
      'RATE_LIMITED',
      `GitHub API rate limit reached. Unauthenticated requests are limited to 60/hour.`,
      token ? undefined : `Try adding a personal access token in Settings, or wait until ${until}.`,
    );
  }
  if (response.status === 404) {
    throw new AppError('NO_RELEASE', `No releases found for ${repo}`);
  }
  if (!response.ok) {
    throw new AppError('API_ERROR', `GitHub API error (HTTP ${response.status}) for ${repo}`);
  }

  const body = (await response.json()) as {
    tag_name?: string;
    name?: string;
    published_at?: string;
    assets?: Array<{
      name?: string;
      browser_download_url?: string;
      size?: number;
      digest?: string;
      content_type?: string;
    }>;
  };
  const tag = body.tag_name;
  if (!tag) {
    throw new AppError('API_ERROR', `Unexpected GitHub API response for ${repo}`);
  }
  return {
    tag,
    name: body.name ?? tag,
    publishedAt: body.published_at ?? '',
    assets: (body.assets ?? [])
      .filter((a) => a.name && a.browser_download_url)
      .map((a) => ({
        name: a.name as string,
        browserDownloadUrl: a.browser_download_url as string,
        size: a.size ?? 0,
        digest: a.digest,
        contentType: a.content_type,
      })),
  };
}
