import { AppError } from './errors';
import type { ReleaseInfo, ReleaseAsset } from '../../shared/types';

const GITHUB_API_ROOT = 'https://api.github.com';
const GITLAB_API_ROOT = 'https://gitlab.com/api/v4';
const DEFAULT_TIMEOUT_MS = 30000;

interface GithubReleaseBody {
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
}

interface GitlabReleaseBody {
  tag_name?: string;
  name?: string;
  released_at?: string;
  assets?: {
    links?: Array<{
      name?: string;
      url?: string;
      direct_asset_url?: string;
      link_type?: string;
    }>;
  };
}

async function fetchJson(url: string, token?: string): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'portyoshka',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });
  } catch (err) {
    const name = (err as Error).name;
    if (name === 'AbortError') {
      throw new AppError('NETWORK_OFFLINE', `The request to the release host timed out (${url})`);
    }
    throw new AppError('NETWORK_OFFLINE', `Cannot reach the release host. Check your network connection.`);
  } finally {
    clearTimeout(timeout);
  }
  if (response.status === 403 || response.status === 429) {
    throw new AppError(
      'RATE_LIMITED',
      'The release API rate limit was reached.',
      token ? undefined : 'Try adding a personal access token in Settings, or wait a while.',
    );
  }
  if (!response.ok && response.status !== 404) {
    throw new AppError('API_ERROR', `Release API error (HTTP ${response.status}) for ${url}`);
  }
  return { status: response.status, body: await response.json().catch(() => null) };
}

function githubBodyToRelease(body: GithubReleaseBody, repo: string): ReleaseInfo {
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

async function getLatestGithubRelease(repo: string, token?: string): Promise<ReleaseInfo> {
  const { status, body } = await fetchJson(`${GITHUB_API_ROOT}/repos/${repo}/releases/latest`, token);
  if (status !== 404) {
    return githubBodyToRelease(body as GithubReleaseBody, repo);
  }
  // No stable release: fall back to the newest release of any kind (prereleases included).
  const list = await fetchJson(`${GITHUB_API_ROOT}/repos/${repo}/releases?per_page=5`, token);
  const releases = Array.isArray(list.body) ? (list.body as GithubReleaseBody[]) : [];
  const newest = releases[0];
  if (!newest) {
    throw new AppError('NO_RELEASE', `No releases found for ${repo}`);
  }
  return githubBodyToRelease(newest, repo);
}

async function getLatestGitlabRelease(repo: string): Promise<ReleaseInfo> {
  const encoded = encodeURIComponent(repo);
  const { status, body } = await fetchJson(
    `${GITLAB_API_ROOT}/projects/${encoded}/releases/permalink/latest`,
  );
  if (status === 404) {
    throw new AppError('NO_RELEASE', `No releases found for ${repo}`);
  }
  const release = body as GitlabReleaseBody;
  const tag = release.tag_name;
  if (!tag) {
    throw new AppError('API_ERROR', `Unexpected GitLab API response for ${repo}`);
  }
  const assets: ReleaseAsset[] = [];
  for (const link of release.assets?.links ?? []) {
    const url = link.direct_asset_url ?? link.url;
    if (link.link_type !== 'package' || !link.name || !url) {
      continue;
    }
    assets.push({ name: link.name, browserDownloadUrl: url, size: 0 });
  }
  return {
    tag,
    name: release.name ?? tag,
    publishedAt: release.released_at ?? '',
    assets,
  };
}

export async function getLatestRelease(
  repo: string,
  token?: string,
  host: 'github' | 'gitlab' = 'github',
): Promise<ReleaseInfo> {
  if (host === 'gitlab') {
    return getLatestGitlabRelease(repo);
  }
  return getLatestGithubRelease(repo, token);
}
