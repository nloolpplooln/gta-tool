/**
 * Read Rockstar Social Club avatar from local cache.
 *
 * Social Club downloads avatars to:
 *   %USERPROFILE%\Documents\Rockstar Games\Social Club\Cache\Images\AvatarCache\custom-avatars
 *
 * No API calls needed — just read the cached image file.
 */
const path = require('path');
const fs = require('fs');

/**
 * Find the Social Club avatar cache directory.
 * Tries multiple possible paths (Documents may be localized or on OneDrive).
 */
function getAvatarCacheDirs() {
  const user = process.env.USERPROFILE || '';
  const candidates = [];

  function add(dir) { candidates.push(dir); }

  // Standard Documents
  add(path.join(user, 'Documents', 'Rockstar Games', 'Social Club', 'Cache', 'Images', 'AvatarCache'));
  // OneDrive Documents
  add(path.join(user, 'OneDrive', 'Documents', 'Rockstar Games', 'Social Club', 'Cache', 'Images', 'AvatarCache'));
  // Older Windows
  add(path.join(user, 'My Documents', 'Rockstar Games', 'Social Club', 'Cache', 'Images', 'AvatarCache'));
  // Directly under user
  add(path.join(user, 'Rockstar Games', 'Social Club', 'Cache', 'Images', 'AvatarCache'));

  return candidates;
}

/**
 * Recursively collect all image files under a directory.
 */
function collectImages(dir, results, depth) {
  if (depth > 5) return results;
  results = results || [];

  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return results; }

  for (const e of entries) {
    const fullPath = path.join(dir, e.name);
    if (e.isDirectory()) {
      collectImages(fullPath, results, depth + 1);
    } else if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(e.name)) {
      try {
        results.push({ name: e.name, path: fullPath, mtime: fs.statSync(fullPath).mtimeMs });
      } catch (_) {}
    }
  }
  return results;
}

/**
 * Find the most recent avatar image file in the cache directory.
 * Searches recursively up to 3 levels deep.
 */
function findAvatarFile() {
  const dirs = getAvatarCacheDirs();
  console.log('[R*] Searching AvatarCache dirs:', dirs.join(' | '));

  // Collect all images from all candidate directories (recurse all subdirs)
  let allImages = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      console.log('[R*]   Not found:', dir);
      continue;
    }
    console.log('[R*]   Found:', dir);
    const images = collectImages(dir, [], 0);
    console.log('[R*]   Images:', images.length);
    allImages = allImages.concat(images);
  }

  if (allImages.length === 0) {
    console.log('[R*] No images found in any AvatarCache dir');
    return null;
  }

  // Sort by modification time, newest first
  allImages.sort((a, b) => b.mtime - a.mtime);
  console.log('[R*] Using:', allImages[0].path);
  return allImages[0].path;
}

/**
 * Read image file and return as base64 data URL.
 */
function imageToDataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
  const mime = mimeMap[ext] || 'image/jpeg';

  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  return `data:${mime};base64,${base64}`;
}

/**
 * Get Rockstar Social Club avatar from local cache.
 */
async function getRockstarAvatar() {
  try {
    console.log('[R*] === Reading avatar from local cache ===');

    const filePath = findAvatarFile();
    if (!filePath) {
      return { success: false, error: 'cache_not_found' };
    }

    const dataUrl = imageToDataUrl(filePath);
    console.log('[R*] === Avatar loaded ===');

    return { success: true, dataUrl, nickname: '' };
  } catch (e) {
    console.error('[R*] Error:', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = { getRockstarAvatar };
