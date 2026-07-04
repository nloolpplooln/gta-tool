/* ===== Fuzzy String Matching (Levenshtein Distance) ===== */
window.GTA = window.GTA || {};

GTA.FuzzyMatch = (function () {
  /**
   * Compute Levenshtein edit distance between two strings
   */
  function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    var matrix = [];

    // Increment along first column
    for (var i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }

    // Increment first row
    for (var j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest
    for (var i = 1; i <= a.length; i++) {
      for (var j = 1; j <= b.length; j++) {
        if (a.charAt(i - 1) === b.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // deletion
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }

    return matrix[a.length][b.length];
  }

  /**
   * Normalize string for comparison:
   * lowercase, remove special chars, trim extra spaces
   */
  function normalize(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Soft normalize for OCR error tolerance — maps common digit/letter confusions
   * so Levenshtein comparison is more forgiving of OCR mistakes.
   */
  function ocrSoften(str) {
    return str
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/5/g, 's')
      .replace(/8/g, 'b')
      .replace(/6/g, 'g')
      .replace(/2/g, 'z');
  }

  /**
   * Find the best matching vehicle from the catalog for a given OCR line
   * @param {string} ocrLine - Raw text from OCR
   * @param {Array} vehicleList - Array of vehicle objects with 'name' property
   * @returns {{ vehicle: object|null, score: number, method: string }}
   */
  function findBestMatch(ocrLine, vehicleList) {
    // Space-normalize original text for consistent comparison (both CJK and Latin)
    var orig = ocrLine.replace(/\s+/g, ' ').trim();
    var normalized = normalize(ocrLine);

    // ====== 1. Exact match on original text (handles pure CJK like "后奏", "卫士") ======
    for (var i = 0; i < vehicleList.length; i++) {
      var vOrig = (vehicleList[i].name || '').replace(/\s+/g, ' ').trim();
      if (vOrig === orig) return { vehicle: vehicleList[i], score: 1.0, method: 'exact' };
    }

    // ====== 2. Contains on original text ======
    if (orig.length >= 2) {
      for (var i = 0; i < vehicleList.length; i++) {
        var vOrig = (vehicleList[i].name || '').replace(/\s+/g, ' ').trim();
        if (vOrig.length >= 2) {
          if (orig.indexOf(vOrig) !== -1 || vOrig.indexOf(orig) !== -1) {
            return { vehicle: vehicleList[i], score: 0.85, method: 'contains' };
          }
        }
      }
    }

    // ====== 3. Normalized matching (model codes: SJ, RR, X32, FR36) ======
    if (normalized.length >= 2) {
      // 3a. Exact match on normalized
      for (var i = 0; i < vehicleList.length; i++) {
        if (normalize(vehicleList[i].name) === normalized) {
          return { vehicle: vehicleList[i], score: 1.0, method: 'exact' };
        }
      }
      // 3b. Contains on normalized (min 3 chars to avoid single-digit false positives)
      for (var i = 0; i < vehicleList.length; i++) {
        var vNorm = normalize(vehicleList[i].name);
        if (!vNorm || vNorm.length < 2) continue;
        if (normalized.length >= 3 && vNorm.indexOf(normalized) !== -1) {
          return { vehicle: vehicleList[i], score: 0.85, method: 'contains' };
        }
        if (vNorm.length >= 3 && normalized.indexOf(vNorm) !== -1) {
          return { vehicle: vehicleList[i], score: 0.85, method: 'contains' };
        }
      }
      // 3c. Levenshtein on OCR-softened normalized
      var softOcr = ocrSoften(normalized);
      var best = { vehicle: null, score: 0 };
      for (var i = 0; i < vehicleList.length; i++) {
        var vNorm = normalize(vehicleList[i].name);
        if (!vNorm) continue;
        var softV = ocrSoften(vNorm);
        var dist = levenshtein(softOcr, softV);
        var maxLen = Math.max(softOcr.length, softV.length);
        var score = maxLen > 0 ? (1 - dist / maxLen) : 0;
        if (score > best.score) best = { vehicle: vehicleList[i], score: score };
      }
      if (best.score > 0.6) return { vehicle: best.vehicle, score: best.score, method: 'fuzzy' };
      if (best.score > 0.4) return { vehicle: best.vehicle, score: best.score, method: 'possible' };
    }

    // ====== 4. Levenshtein on original text (fallback for CJK with minor OCR errors) ======
    var bestOrig = { vehicle: null, score: 0 };
    for (var i = 0; i < vehicleList.length; i++) {
      var vOrig = (vehicleList[i].name || '').replace(/\s+/g, ' ').trim();
      if (!vOrig) continue;
      var dist = levenshtein(orig, vOrig);
      var maxLen = Math.max(orig.length, vOrig.length);
      var score = maxLen > 0 ? (1 - dist / maxLen) : 0;
      if (score > bestOrig.score) bestOrig = { vehicle: vehicleList[i], score: score };
    }
    if (bestOrig.score > 0.6) return { vehicle: bestOrig.vehicle, score: bestOrig.score, method: 'fuzzy' };
    if (bestOrig.score > 0.4) return { vehicle: bestOrig.vehicle, score: bestOrig.score, method: 'possible' };

    return { vehicle: null, score: 0, method: 'none' };
  }

  return { findBestMatch: findBestMatch, normalize: normalize };
})();
