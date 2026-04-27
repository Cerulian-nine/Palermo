// api/save-config.js
// Allows the Palermo App to save its own configuration changes back to GitHub.
// Requires GITHUB_TOKEN environment variable in Vercel.

const OWNER = 'Cerulian-nine';
const REPO  = 'Palermo';
const BRANCH = 'main';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { path, content, message } = req.body || {};
  if (!path || !content) {
    return res.status(400).json({ error: 'path and content are required' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not configured on Vercel' });

  const apiBase = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'palermo-app-updater'
  };

  try {
    // 1. Get current file SHA
    const getRes = await fetch(apiBase, { headers });
    let sha;
    if (getRes.ok) {
      const current = await getRes.json();
      sha = current.sha;
    } else if (getRes.status !== 404) {
      return res.status(502).json({ error: 'GitHub API error fetching file SHA' });
    }

    // 2. Push update
    const body = {
      message: message || `chore: update ${path} via Palermo App`,
      content: Buffer.from(content).toString('base64'),
      branch: BRANCH,
      ...(sha ? { sha } : {})
    };

    const putRes = await fetch(apiBase, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return res.status(502).json({ error: err.message || 'GitHub write failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
