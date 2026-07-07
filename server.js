const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.wasm': 'application/wasm',
  '.traineddata': 'application/octet-stream',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

// Xiaoheihe vehicle info cache (in-memory, 1 hour TTL)
const xhhCache = new Map();

// Xiaoheihe slug mapping: display name → API slug (loaded from xhh_slugs.json)
let xhhSlugs = {};
try {
  xhhSlugs = JSON.parse(fs.readFileSync(path.join(__dirname, 'xhh_slugs.json'), 'utf-8'));
  console.log('[Server] Loaded ' + Object.keys(xhhSlugs).length + ' Xiaoheihe slug mappings');
} catch (e) {
  console.warn('[Server] Failed to load xhh_slugs.json, slug lookup disabled:', e.message);
}

// Discontinued vehicles cache (24 hour TTL — scrape once per day)
let discontinuedCache = null;

function fetchDiscontinued() {
  return new Promise((resolve, reject) => {
    const apiUrl = 'https://api.xiaoheihe.cn/wiki/get_article_for_app/?article_id=9975255&wiki_id=271590&is_share=1';
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.xiaoheihe.cn/'
      }
    };
    https.get(apiUrl, opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          // Extract the 'json' JS variable with balanced brace parsing
          const startIdx = body.indexOf('var json = {');
          if (startIdx < 0) {
            resolve({ discontinued: [], updatedAt: Date.now(), source: '小黑盒', error: 'No json var found' });
            return;
          }
          let idx = startIdx + 'var json = '.length;
          let depth = 0, inString = false, esc = false;
          while (idx < body.length) {
            const ch = body[idx];
            if (esc) { esc = false; idx++; continue; }
            if (ch === '\\') { esc = true; idx++; continue; }
            if (ch === '"') { inString = !inString; idx++; continue; }
            if (inString) { idx++; continue; }
            if (ch === '{') depth++;
            if (ch === '}') { depth--; if (depth === 0) break; }
            idx++;
          }
          const jsonStr = body.substring(startIdx + 'var json = '.length, idx + 1);
          const data = JSON.parse(jsonStr);
          const names = [];
          if (data.list_items && Array.isArray(data.list_items)) {
            data.list_items.forEach(item => {
              // isNotOnSale is empty for normal vehicles, set to vehicle name for discontinued ones
              if (item.realid && item.isNotOnSale && item.isNotOnSale.trim() !== '') {
                names.push(item.realid);
              }
            });
          }
          resolve({ discontinued: [...new Set(names)], updatedAt: Date.now(), source: '小黑盒' });
        } catch (e) {
          resolve({ discontinued: [], updatedAt: Date.now(), source: '小黑盒', error: e.message });
        }
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

function fetchXiaoheihe(vehicleName) {
  return new Promise((resolve, reject) => {
    // The Xiaoheihe wiki page URL for a vehicle
    // vehicleName should be the slug/id format (underscores), e.g. "猛牛_STX_追逐"
    const apiUrl = `https://api.xiaoheihe.cn/wiki/get_article_for_app/?name=${encodeURIComponent(vehicleName)}&wiki_id=271590&is_share=1`;

    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.xiaoheihe.cn/'
      }
    };

    https.get(apiUrl, opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const info = { source: '小黑盒', url: apiUrl };

        // --- Helper: extract text from <th>KEY</th><td...>VALUE</td> ---
        function extractField(thLabel) {
          const escaped = thLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(
            `<th>${escaped}<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
            'i'
          );
          const m = body.match(regex);
          if (!m) return null;
          return m[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;|&#160;/g, ' ')
            .replace(/&ensp;|&#8194;/g, ' ')
            .replace(/&amp;|&#38;/g, '&')
            .replace(/&lt;|&#60;/g, '<')
            .replace(/&gt;|&#62;/g, '>')
            .trim();
        }

        // --- 1. Game description (intro text from 军火大亨 etc.) ---
        const introMatch = body.match(/<td[^>]*class="intro"[^>]*>([\s\S]*?)<div class="shop">/);
        if (introMatch) {
          info.description = introMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;|&#160;/g, '')
            .replace(/&ensp;|&#8194;/g, ' ')
            .replace(/&amp;|&#38;/g, '&')
            .replace(/&lt;|&#60;/g, '<')
            .replace(/&gt;|&#62;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
        }
        // Extract shop/source attribution (e.g. "——军火大亨")
        const shopMatch = body.match(/<div class="shop">([^<]*)<\/div>/);
        if (shopMatch) info.shop_source = shopMatch[1].trim();

        // --- 2. Vehicle names from inline JS (most reliable source) ---
        const chsMatch = body.match(/const realid_chs_org\s*=\s*"([^"]*)"/);
        if (chsMatch) { info.name_chs = chsMatch[1]; info.载具名称 = chsMatch[1]; }

        const zhtMatch = body.match(/const realid_zht_org\s*=\s*"([^"]*)"/);
        if (zhtMatch) { info.name_zht = zhtMatch[1]; info.繁体名称 = zhtMatch[1]; }

        const engMatch = body.match(/const realid_eng_org\s*=\s*"([^"]*)"/);
        if (engMatch) { info.name_eng = engMatch[1]; info.英文名称 = engMatch[1]; }

        // --- 3. Model name ---
        const modelMatch = body.match(/<span id="model_name">([^<]*)<\/span>/);
        if (modelMatch) info.model_name = modelMatch[1].trim();

        // --- 4. Table fields — extract ALL <th>→<td> pairs dynamically ---
        // Match every <th>LABEL</th><td...>VALUE</td> in the car-info table
        const thTdRegex = /<th>([^<]*)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
        let m;
        while ((m = thTdRegex.exec(body)) !== null) {
          const key = m[1].trim();
          // Skip name cells (handled above via JS variables)
          if (key === '载具名称' || key === '繁体名称' || key === '英文名称') continue;

          let val = m[2]
            .replace(/<span[^>]*id="companySource"[^>]*>.*?<\/span>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;|&#160;/g, ' ')
            .replace(/&ensp;|&#8194;/g, ' ')
            .replace(/&amp;|&#38;/g, '&')
            .replace(/&lt;|&#60;/g, '<')
            .replace(/&gt;|&#62;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();

          // Performance stats — extract leading number only
          if (['速度', '加速', '刹车', '抓地'].includes(key)) {
            const numMatch = val.match(/^([\d.]+)/);
            if (numMatch) {
              const keyMap = { '速度': 'speed', '加速': 'acceleration', '刹车': 'braking', '抓地': 'traction' };
              info[keyMap[key]] = numMatch[1];
            }
          } else if (val) {
            info[key] = val;
          }
        }

        // --- 6. Prices from span ids ---
        const pri2Match = body.match(/<span id="pri2">([^<]*)<\/span>/);
        if (pri2Match) info.price_buy = pri2Match[1].trim();

        const pri1Match = body.match(/<span id="pri1">([^<]*)<\/span>/);
        if (pri1Match) info.price_wholesale = pri1Match[1].trim();

        // --- 7. Weight from span id ---
        const weightMatch = body.match(/<span id="weight">([^<]*)<\/span>/);
        if (weightMatch) info.weight = weightMatch[1].trim() + ' kg';

        // --- 8. Top speed from span id ---
        const topSpeedMatch = body.match(/<span id="topSpeed">([^<]*)<\/span>/);
        if (topSpeedMatch) info.top_speed = topSpeedMatch[1].trim();

        // Also get raw km/h from JS variable
        const rawSpeedMatch = body.match(/const rawTopSpeedKmh\s*=\s*"([^"]*)"/);
        if (rawSpeedMatch && rawSpeedMatch[1]) info.top_speed_raw = rawSpeedMatch[1] + ' km/h';

        // --- 9. Slug from <title> tag ---
        const titleMatch = body.match(/<title>([^<]*)<\/title>/);
        if (titleMatch && titleMatch[1]) info.xhh_slug = titleMatch[1].trim();

        // --- 10. Not-on-sale / pre-release warning (skip if display:none) ---
        const warnBlockMatch = body.match(/<blockquote[^>]*id="notOnSaleWarn"[^>]*>([\s\S]*?)<\/blockquote>/);
        if (warnBlockMatch) {
          // Only capture if NOT hidden (no display:none in style)
          const blockTag = warnBlockMatch[0];
          if (!/display\s*:\s*none/i.test(blockTag)) {
            const warnText = warnBlockMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, ' ').trim();
            if (warnText) info.warning = warnText;
          }
        }

        resolve(info);
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}


http.createServer(async (req, res) => {
  console.log('[Server] ' + req.method + ' ' + req.url);
  const parsed = new URL(req.url, 'http://localhost:' + PORT);
  const pathname = decodeURIComponent(parsed.pathname);

  // Xiaoheihe discontinued vehicles list (24h cache)
  if (pathname === '/api/xiaoheihe/discontinued') {
    if (discontinuedCache && (Date.now() - discontinuedCache.updatedAt < 86400000)) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(discontinuedCache));
      return;
    }
    fetchDiscontinued()
      .then(data => {
        discontinuedCache = data;
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(data));
      })
      .catch(err => {
        // Serve stale cache if available
        if (discontinuedCache) {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify(discontinuedCache));
          return;
        }
        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Failed to fetch', discontinued: [] }));
      });
    return;
  }

  // Image proxy — fetch cross-origin image for html2canvas capture
  if (pathname.startsWith('/api/proxy-image')) {
    const imageUrl = parsed.searchParams.get('url');
    if (!imageUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing ?url= parameter');
      return;
    }
    const proto = imageUrl.startsWith('https') ? https : http;
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://getwallpapers.com/',
        'Accept': 'image/webp,image/*,*/*'
      }
    };
    proto.get(imageUrl, opts, (proxyRes) => {
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        // Follow redirect
        const redirectUrl = proxyRes.headers.location;
        const redirectProto = redirectUrl.startsWith('https') ? https : http;
        redirectProto.get(redirectUrl, opts, (redirectRes) => {
          res.writeHead(200, {
            'Content-Type': redirectRes.headers['content-type'] || 'image/jpeg',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
          });
          redirectRes.pipe(res);
        }).on('error', () => {
          res.writeHead(502);
          res.end('Redirect error');
        });
        return;
      }
      res.writeHead(200, {
        'Content-Type': proxyRes.headers['content-type'] || 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      });
      proxyRes.pipe(res);
    }).on('error', () => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Proxy error');
    });
    return;
  }

  // Xiaoheihe proxy endpoint
  if (pathname === '/api/xiaoheihe/vehicle') {
    const vehicleName = parsed.searchParams.get('name');
    if (!vehicleName) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Missing ?name= parameter' }));
      return;
    }

    // Look up the Xiaoheihe API slug from display name
    const xhhSlug = xhhSlugs[vehicleName];
    if (!xhhSlug) {
      res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'No Xiaoheihe entry for this vehicle', name: vehicleName }));
      return;
    }

    // Check cache (keyed by slug)
    const cached = xhhCache.get(xhhSlug);
    if (cached && (Date.now() - cached.time < 3600000)) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(cached.data));
      return;
    }

    fetchXiaoheihe(xhhSlug)
      .then(data => {
        xhhCache.set(xhhSlug, { data, time: Date.now() });
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(data));
      })
      .catch(err => {
        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Failed to fetch Xiaoheihe data', detail: err.message }));
      });
    return;
  }

  // Serve Supabase SDK from local node_modules (bypass CDN)
  if (pathname === '/vendor/supabase/supabase.js') {
    let sbFile = path.join(ROOT, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
    fs.readFile(sbFile, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' });
      res.end(data);
    });
    return;
  }

  // Static file serving — redirect custom-bg video/image to userData
  var filePath;
  if (pathname.indexOf('/assets/bg-img/') === 0) {
    var osImg = require('os');
    var userDataImg = process.env.USER_DATA || path.join(osImg.homedir(), 'AppData', 'Roaming', 'VaultGTA');
    filePath = path.join(userDataImg, 'bg-image', path.basename(pathname));
  } else if (pathname.indexOf('custom-bg') !== -1) {
    var os = require('os');
    var userData = process.env.USER_DATA || path.join(os.homedir(), 'AppData', 'Roaming', 'VaultGTA');
    filePath = path.join(userData, 'bg-video', path.basename(pathname));
  } else {
    filePath = path.join(ROOT, pathname);
  }
  if (filePath.endsWith('/')) filePath = path.join(filePath, 'index.html');

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('VaultGTA: http://localhost:' + PORT + '/src/html/index.html');
  console.log('Xiaoheihe proxy:  /api/xiaoheihe/vehicle?name=VEHICLE_NAME');
});
