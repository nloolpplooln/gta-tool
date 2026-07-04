/**
 * Read Steam display name.
 *
 * Strategy (in order):
 *   1. Parse loginusers.vdf → MostRecent account's PersonaName (most reliable)
 *   2. Window title fallback: "Steam - Nickname" from visible Steam window
 *
 * Does NOT require Steam to be running — returns { success: false } gracefully.
 */
const fs = require('fs');
const path = require('path');
const { findWindowsByProcessName, readRegistry } = require('./powershell-helper');

/**
 * Parse Valve VDF format to extract all accounts.
 * Returns an array of { id: steamID64, PersonaName, MostRecent, ... }
 */
function parseLoginUsersVdf(vdfContent) {
  const accounts = [];
  const lines = vdfContent.split('\n');
  let currentId = null;
  let currentFields = {};
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    if (trimmed === '{') { depth++; continue; }
    if (trimmed === '}') {
      depth--;
      if (depth === 1 && currentId) {
        accounts.push({ id: currentId, ...currentFields });
        currentId = null;
        currentFields = {};
      }
      continue;
    }

    const kvMatch = trimmed.match(/^"([^"]*)"\s+"([^"]*)"\s*$/);
    if (kvMatch) {
      if (depth === 2 && currentId) currentFields[kvMatch[1]] = kvMatch[2];
      continue;
    }

    const keyMatch = trimmed.match(/^"([^"]+)"\s*$/);
    if (keyMatch && depth === 1 && keyMatch[1] !== 'users') {
      currentId = keyMatch[1];
    }
  }
  return accounts;
}

/**
 * Get the most recent account from loginusers.vdf.
 * @returns {{ name: string, steamID64: string } | null}
 */
function getMostRecentAccount(accounts) {
  const mostRecent = accounts.find(a => a.MostRecent === '1');
  if (mostRecent && mostRecent.PersonaName) {
    return { name: mostRecent.PersonaName, steamID64: mostRecent.id };
  }
  if (accounts.length > 0 && accounts[0].PersonaName) {
    return { name: accounts[0].PersonaName, steamID64: accounts[0].id };
  }
  return null;
}

/**
 * Get Steam installation path from registry.
 * @returns {Promise<string|null>}
 */
async function getSteamPath() {
  // Try 64-bit registry first, then 32-bit, then user path
  const paths = [
    await readRegistry('HKLM:\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'),
    await readRegistry('HKLM:\\SOFTWARE\\Valve\\Steam', 'InstallPath'),
    await readRegistry('HKCU:\\Software\\Valve\\Steam', 'SteamPath'),
  ];
  for (const p of paths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Read loginusers.vdf and find the most recent account.
 * @returns {Promise<{ name: string, steamID64: string, steamPath: string }|null>}
 */
async function getMostRecentFromVdf() {
  try {
    const steamPath = await getSteamPath();
    if (!steamPath) return null;

    const vdfPath = path.join(steamPath, 'config', 'loginusers.vdf');
    if (!fs.existsSync(vdfPath)) return null;

    const content = fs.readFileSync(vdfPath, 'utf8');
    const accounts = parseLoginUsersVdf(content);
    const account = getMostRecentAccount(accounts);
    if (account) return { ...account, steamPath };
    return null;
  } catch (e) {
    console.error('[SteamProfile] VDF error:', e.message);
    return null;
  }
}

/**
 * Read Steam avatar from local cache.
 * Steam caches avatars at: <SteamPath>/config/avatarcache/<steamID64>.png
 */
function getSteamAvatarPath(steamPath, steamID64) {
  const cacheDir = path.join(steamPath, 'config', 'avatarcache');
  if (!fs.existsSync(cacheDir)) return null;
  const filePath = path.join(cacheDir, steamID64 + '.png');
  if (fs.existsSync(filePath)) return filePath;
  // Try .jpg as fallback
  const jpgPath = path.join(cacheDir, steamID64 + '.jpg');
  if (fs.existsSync(jpgPath)) return jpgPath;
  return null;
}

/**
 * Extract Steam display name from window title.
 * @returns {Promise<string|null>}
 */
async function getDisplayNameFromWindow() {
  try {
    const windows = await findWindowsByProcessName(['steam']);

    for (const w of windows) {
      const title = (w.title || '').trim();
      if (!title) continue;

      // "Steam - Nickname" format
      const dashIdx = title.indexOf(' - ');
      if (dashIdx > 0) {
        const prefix = title.substring(0, dashIdx).toLowerCase();
        if (prefix.includes('steam')) {
          const displayName = title.substring(dashIdx + 3).trim();
          if (displayName && displayName.length > 0 && displayName.length < 100) {
            return displayName;
          }
        }
      }
    }
  } catch (e) {
    console.error('[SteamProfile] Window detection error:', e.message);
  }
  return null;
}

/**
 * Get Steam display name.
 * @returns {Promise<{success: boolean, displayName?: string, steamID64?: string, source?: string}>}
 */
async function getSteamDisplayName() {
  try {
    const account = await getMostRecentFromVdf();
    if (account) {
      return { success: true, displayName: account.name, steamID64: account.steamID64, source: 'loginusers_vdf' };
    }

    const windowName = await getDisplayNameFromWindow();
    if (windowName) {
      return { success: true, displayName: windowName, source: 'window' };
    }

    return { success: false, source: 'not_found' };
  } catch (e) {
    console.error('[SteamProfile] Error:', e.message);
    return { success: false, source: 'error', error: e.message };
  }
}

/**
 * Get Steam avatar as base64 data URL.
 * @returns {Promise<{success: boolean, dataUrl?: string, error?: string}>}
 */
async function getSteamAvatar() {
  try {
    const account = await getMostRecentFromVdf();
    if (!account) return { success: false, error: 'vdf_not_found' };

    const avatarPath = getSteamAvatarPath(account.steamPath, account.steamID64);
    if (!avatarPath) return { success: false, error: 'avatar_not_found' };

    const buffer = fs.readFileSync(avatarPath);
    const base64 = buffer.toString('base64');
    return { success: true, dataUrl: 'data:image/png;base64,' + base64 };
  } catch (e) {
    console.error('[SteamProfile] Avatar error:', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = { getSteamDisplayName, getSteamAvatar };
