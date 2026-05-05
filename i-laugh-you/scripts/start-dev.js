// Start `next dev` on a port that is actually bindable.
// Windows (Hyper-V / WinNAT) randomly reserves TCP port ranges on each boot,
// causing EACCES on `listen` even when no process is using the port. This
// script reads those reservations, picks the first free preferred port, and
// hands off to next.
//
// Also: if a `next dev` is already running for this project, print its URL
// and exit 0 instead of failing on the .next/dev/lock collision (the user's
// "Start All" task is fired on every folder open).

const { execSync, execFileSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");

const HOST = "127.0.0.1";
const PREFERRED = [4321, 4322, 4500, 4600, 4700, 4800, 5050, 5151, 5252, 5500, 6060, 7070, 8181, 8282, 9090];
const LOCK_PATH = path.join(".next", "dev", "lock");

function getExcludedRanges() {
  if (process.platform !== "win32") return [];
  try {
    const out = execSync("netsh interface ipv4 show excludedportrange protocol=tcp", { encoding: "utf8" });
    const ranges = [];
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/^(\d+)\s+(\d+)/);
      if (m) ranges.push([parseInt(m[1], 10), parseInt(m[2], 10)]);
    }
    return ranges;
  } catch {
    return [];
  }
}

const isExcluded = (port, ranges) => ranges.some(([s, e]) => port >= s && port <= e);

function canBind(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, HOST);
  });
}

async function pickPort() {
  const excluded = getExcludedRanges();
  for (const p of PREFERRED) {
    if (isExcluded(p, excluded)) continue;
    if (await canBind(p)) return p;
  }
  for (let p = 3000; p < 10000; p++) {
    if (isExcluded(p, excluded)) continue;
    if (await canBind(p)) return p;
  }
  throw new Error("No free port found in 3000-9999");
}

function findRunningNextDevPids() {
  if (process.platform !== "win32") return [];
  // Match a node process whose cmdline mentions both `next` and `dev` as CLI
  // tokens. Exclude our own start-dev.js so re-runs don't self-detect. Use
  // execFileSync so PowerShell receives the script verbatim — wrapping in a
  // shell string mangles the nested quotes around -Filter "Name='node.exe'".
  const ps =
    "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
    "Where-Object { $_.CommandLine -match '\\bnext\\b.*\\bdev\\b' -and $_.CommandLine -notmatch 'start-dev\\.js' } | " +
    "Select-Object -ExpandProperty ProcessId";
  try {
    const out = execFileSync("powershell", ["-NoProfile", "-Command", ps], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.split(/\r?\n/).map((s) => parseInt(s.trim(), 10)).filter(Boolean);
  } catch {
    return [];
  }
}

function expandToDescendants(pids) {
  // Next dev runs the actual listening socket in a grandchild process whose
  // cmdline is start-server.js (no "dev" token). Walk the node.exe parent map
  // so port lookup includes that descendant.
  if (!pids.length || process.platform !== "win32") return new Set(pids);
  try {
    const out = execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | ForEach-Object { '{0},{1}' -f $_.ProcessId,$_.ParentProcessId }",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    const childrenOf = new Map();
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^(\d+),(\d+)$/);
      if (!m) continue;
      const child = parseInt(m[1], 10);
      const parent = parseInt(m[2], 10);
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(child);
    }
    const result = new Set(pids);
    const queue = [...pids];
    while (queue.length) {
      const p = queue.shift();
      for (const k of childrenOf.get(p) || []) {
        if (!result.has(k)) { result.add(k); queue.push(k); }
      }
    }
    return result;
  } catch {
    return new Set(pids);
  }
}

function findListeningPortForPids(pids) {
  if (!pids.length) return null;
  const set = expandToDescendants(pids);
  try {
    const ns = execSync("netstat -ano -p TCP", { encoding: "utf8" });
    for (const line of ns.split(/\r?\n/)) {
      const m = line.match(/^\s*TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
      if (!m) continue;
      const [, addr, port, pid] = m;
      if (set.has(parseInt(pid, 10)) && (addr === "127.0.0.1" || addr === "0.0.0.0" || addr === "[::]" || addr === "[::1]")) {
        return parseInt(port, 10);
      }
    }
  } catch {}
  return null;
}

async function main() {
  // 1. Detect a live next-dev for this project.
  const pids = findRunningNextDevPids();
  if (pids.length) {
    // netstat may not see the bound port immediately after spawn; retry briefly.
    let port = findListeningPortForPids(pids);
    for (let i = 0; i < 6 && !port; i++) {
      await new Promise((r) => setTimeout(r, 500));
      port = findListeningPortForPids(pids);
    }
    if (port) {
      console.log(`\n> next dev already running (PID ${pids[0]}) on http://${HOST}:${port}\n`);
    } else {
      console.log(`\n> next dev already running (PID ${pids[0]}) — could not determine port\n`);
    }
    process.exit(0);
  }

  // 2. No live process: clean up any stale lock so next can start fresh.
  if (fs.existsSync(LOCK_PATH)) {
    try {
      fs.unlinkSync(LOCK_PATH);
      console.log("> removed stale .next/dev/lock");
    } catch {
      // best-effort; let next surface the real error
    }
  }

  // 3. Pick a bindable port and exec next dev.
  const port = await pickPort();
  console.log(`\n> next dev on http://${HOST}:${port}\n`);
  const child = spawn("npx", ["--no-install", "next", "dev", "-H", HOST, "-p", String(port)], {
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
