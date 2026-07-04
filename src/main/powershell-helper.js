/**
 * Shared PowerShell + inline C# helper for Win32 window enumeration.
 * Used by steam-profile.js and rockstar-profile.js.
 *
 * Avoids native Node addons (compatible with npmRebuild:false).
 * Scripts are written to temp .ps1 files to avoid $variable escaping issues
 * that occur when passing scripts via -Command argument.
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Run a PowerShell script and return stdout as string.
 * Writes the script to a temp .ps1 file to avoid $ escaping issues.
 *
 * @param {string} script - PowerShell script content
 * @param {number} timeout - timeout in ms
 * @returns {Promise<string>}
 */
function runPowerShell(script, timeout = 15000) {
  return new Promise((resolve) => {
    const tmpFile = path.join(
      os.tmpdir(),
      'vg_ps_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.ps1'
    );
    const outFile = tmpFile.replace(/\.ps1$/, '.out.txt');
    // Force PowerShell to write output to a UTF-8 file to avoid encoding issues
    const fullScript = '& {\r\n' + script + '\r\n} | Out-File -FilePath \"' + outFile.replace(/\\/g, '\\\\') + '\" -Encoding UTF8\r\n';
    try {
      fs.writeFileSync(tmpFile, '﻿' + fullScript, 'utf8');
    } catch (e) {
      resolve('');
      return;
    }

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmpFile],
      { timeout, windowsHide: true },
      (err, stdout) => {
        try {
          const content = fs.readFileSync(outFile, 'utf8');
          try { fs.unlinkSync(outFile); } catch (_) {}
          resolve(content.trim());
        } catch (_) {
          try { fs.unlinkSync(outFile); } catch (_) {}
          if (err && !stdout) { resolve(''); return; }
          resolve((stdout || '').trim());
        }
        try { fs.unlinkSync(tmpFile); } catch (_) {}
      }
    );
  });
}

/**
 * Find top-level windows belonging to specified process names.
 * Uses PowerShell for process lookup + inline C# Add-Type for Win32 EnumWindows.
 *
 * @param {string[]} processNames - e.g. ['steam', 'GTA5', 'GTA5_Enhanced']
 * @returns {Promise<Array<{hwnd:number, pid:number, title:string, visible:boolean, processName:string}>>}
 */
async function findWindowsByProcessName(processNames) {
  // Strip .exe for Get-Process compatibility
  const wanted = processNames.map(n => n.replace(/\.exe$/i, ''));
  // Build PowerShell array literal: @("steam","GTA5")
  const psArray = '@(' + wanted.map(n => '"' + n + '"').join(',') + ')';

  const script = `
$wanted = ${psArray}
$pidSet = @{}
foreach ($n in $wanted) {
    try { Get-Process -Name $n -ErrorAction Stop | % { $pidSet[$_.Id] = $n } } catch {}
}
if ($pidSet.Count -eq 0) { Write-Output '[]'; exit 0 }

Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class W {
    [DllImport("user32.dll")] public static extern bool EnumWindows(DEW l, IntPtr p);
    [DllImport("user32.dll")] public static extern int GetWindowTextW(IntPtr h, StringBuilder s, int m);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint d);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr h);
    public delegate bool DEW(IntPtr h, IntPtr l);
    public static List<object> R = new List<object>();
}
"@

$null = [W]::R.Clear()
$del = [W+DEW]{
    param($h,$l)
    if ([W]::GetParent($h) -ne [IntPtr]::Zero) { return $true }
    $d=0; [W]::GetWindowThreadProcessId($h,[ref]$d)|Out-Null
    if (-not $d -or -not $pidSet.ContainsKey([int]$d)) { return $true }
    $s=New-Object System.Text.StringBuilder(512)
    [W]::GetWindowTextW($h,$s,512)|Out-Null
    $t=$s.ToString()
    if ([string]::IsNullOrEmpty($t)) { return $true }
    [W]::R.Add(@{hwnd=$h.ToInt64();pid=[int]$d;title=$t;visible=[W]::IsWindowVisible($h);processName=$pidSet[[int]$d]})
    return $true
}
$null = [W]::EnumWindows($del,[IntPtr]::Zero)
ConvertTo-Json -Compress -Depth 3 @([W]::R)
`;

  const stdout = await runPowerShell(script, 15000);
  try {
    const result = JSON.parse(stdout);
    return Array.isArray(result) ? result : [];
  } catch (e) {
    return [];
  }
}

/**
 * Read a value from Windows registry.
 * @param {string} keyPath - e.g. 'HKCU:\\Software\\Valve\\Steam'
 * @param {string} valueName - e.g. 'LastGameNameUse'
 * @returns {Promise<string>}
 */
async function readRegistry(keyPath, valueName) {
  const script = `Get-ItemProperty -Path '${keyPath}' -Name '${valueName}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty '${valueName}'`;
  const result = await runPowerShell(script, 5000);
  return result || '';
}

module.exports = { runPowerShell, findWindowsByProcessName, readRegistry };
