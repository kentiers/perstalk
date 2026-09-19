import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { loadLatestState, loadHistory } from "./checker.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CHANGELOG_FILE = path.join(ROOT_DIR, "CHANGELOG.md");
const REPORT_HTML_FILE = path.join(ROOT_DIR, "report.html");
const INDEX_HTML_FILE = path.join(ROOT_DIR, "index.html");

function formatDate(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

// Generate clean CHANGELOG.md without em-dashes
export async function generateChangelog() {
  const history = await loadHistory();
  const latestState = await loadLatestState();

  let md = `# Log Riwayat Perubahan\n\n`;
  md += `Terakhir diperiksa: **${formatDate(new Date().toISOString())}**\n\n`;

  md += `## Ringkasan Akun (${Object.keys(latestState).length} Target)\n\n`;
  md += `| Akun | Nama | Bio | Video | Pengikut | Mengikuti | Suka | Story | Tanggal Dicek |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;

  for (const [user, data] of Object.entries(latestState)) {
    const bioClean = (data.bio || "-").replace(/\n/g, " ").slice(0, 32);
    const checkedAt = data.lastCheckedAt ? new Date(data.lastCheckedAt).toLocaleDateString("id-ID") : "-";
    const storiesCount = data.activeStories?.length || 0;
    md += `| **[@${user}](https://www.tiktok.com/@${user})** | ${data.nickname || "-"} | "${bioClean}" | ${data.stats?.videoCount ?? 0} | ${data.stats?.followerCount ?? 0} | ${data.stats?.followingCount ?? 0} | ${data.stats?.heartCount ?? 0} | ${storiesCount} | ${checkedAt} |\n`;
  }

  md += `\n---\n\n## Riwayat Kejadian\n\n`;

  if (history.length === 0) {
    md += `*Belum ada aktivitas tercatat.*\n`;
  } else {
    const reversed = [...history].reverse();
    for (const evt of reversed) {
      const timeStr = formatDate(evt.timestamp);
      md += `### ${timeStr} - @${evt.username} (${evt.eventType})\n\n`;

      if (evt.changes && evt.changes.length > 0) {
        for (const c of evt.changes) {
          const diffStr = c.diff !== undefined ? ` (${c.diff > 0 ? "+" : ""}${c.diff})` : "";
          md += `- ${c.label}: "${String(c.oldValue).replace(/\n/g, " ")}" &rarr; "${String(c.newValue).replace(/\n/g, " ")}"${diffStr}\n`;
        }
        md += `\n`;
      } else if (evt.story) {
        md += `- Story: "${evt.story.desc || 'Tanpa teks'}" ([Buka link](${evt.story.url}))\n\n`;
      } else {
        md += `- ${evt.summary}\n\n`;
      }

      if (evt.screenshot) {
        md += `Berkas: [\`${evt.screenshot}\`](${evt.screenshot})\n\n`;
      }
      md += `---\n\n`;
    }
  }

  await fs.writeFile(CHANGELOG_FILE, md, "utf-8");
  return CHANGELOG_FILE;
}

// Generate bold, generous, highly-legible sans-serif dashboard
export async function generateHtmlReport() {
  const history = await loadHistory();
  const latestState = await loadLatestState();

  const accountsJson = JSON.stringify(latestState);
  const historyJson = JSON.stringify(history);

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Stalk - Pemantau Akun</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0c11;
      --panel: #13141c;
      --panel-inner: #191a26;
      --panel-hover: #212332;
      --panel-selected: #282b3d;
      --border: #2c2f42;
      --border-subtle: #202230;
      --text: #ffffff;
      --text-muted: #cbd5e1;
      --text-dim: #9499ad;
      --accent: #38bdf8;
      --accent-soft: rgba(56, 189, 248, 0.16);
      --positive: #34d399;
      --positive-soft: rgba(52, 211, 153, 0.16);
      --negative: #fb7185;
      --warning: #fbbf24;
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100dvh;
      -webkit-font-smoothing: antialiased;
      display: flex;
      flex-direction: column;
    }

    /* Top Bar */
    .topbar {
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      padding: 16px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      flex-wrap: wrap;
      gap: 16px;
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #fff;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--positive);
      background: var(--positive-soft);
      padding: 6px 14px;
      border-radius: 8px;
      font-weight: 700;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--positive);
    }
    .topbar-stats {
      display: flex;
      gap: 28px;
      font-size: 15px;
      color: var(--text-muted);
      align-items: center;
    }
    .topbar-stats strong {
      color: #fff;
      font-weight: 800;
      font-size: 16px;
    }
    .topbar-sync {
      font-size: 14px;
      color: var(--text-dim);
      font-weight: 500;
    }

    /* Workspace Layout */
    .layout-split {
      display: flex;
      flex: 1;
      height: calc(100dvh - 66px);
      overflow: hidden;
    }

    /* Left Sidebar: Target Roster */
    .sidebar {
      width: 370px;
      background: var(--panel);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .sidebar-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sidebar-title {
      font-size: 14.5px;
      font-weight: 800;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sidebar-count {
      font-size: 14px;
      color: var(--text-muted);
      font-weight: 700;
    }
    .roster-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .roster-card {
      padding: 16px 18px;
      border-radius: 12px;
      border: 1px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 14px;
      transition: background 0.15s, border-color 0.15s;
    }
    .roster-card:hover {
      background: var(--panel-hover);
    }
    .roster-card.selected {
      background: var(--panel-selected);
      border-color: #40445c;
    }
    .roster-avatar {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: #000;
      border: 1px solid var(--border);
      flex-shrink: 0;
      overflow: hidden;
    }
    .roster-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .roster-info {
      flex: 1;
      min-width: 0;
    }
    .roster-top-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .roster-handle {
      font-size: 16.5px;
      font-weight: 800;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .roster-story-badge {
      font-size: 12.5px;
      color: var(--accent);
      background: var(--accent-soft);
      padding: 3px 9px;
      border-radius: 6px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .roster-stats-line {
      display: flex;
      gap: 16px;
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 5px;
      font-weight: 500;
    }
    .roster-stats-line strong {
      color: #ffffff;
      font-weight: 800;
    }

    /* Main Stage */
    .stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      background: var(--bg);
    }
    .stage-top {
      padding: 36px 44px 30px;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
    }
    .profile-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      margin-bottom: 26px;
      flex-wrap: wrap;
    }
    .profile-user-left {
      display: flex;
      gap: 22px;
      align-items: center;
    }
    .profile-large-avatar {
      width: 84px;
      height: 84px;
      border-radius: 20px;
      background: #000;
      border: 1px solid var(--border);
      overflow: hidden;
      flex-shrink: 0;
    }
    .profile-large-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .profile-titles {
      min-width: 0;
    }
    .profile-name {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .profile-link {
      font-size: 16.5px;
      color: var(--accent);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      font-weight: 700;
    }
    .profile-link:hover { text-decoration: underline; }
    .profile-actions {
      display: flex;
      gap: 14px;
      align-items: center;
      flex-wrap: wrap;
    }
    .privacy-badge {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--panel-inner);
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .btn-secondary {
      background: #252837;
      border: 1px solid #3e4259;
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s;
    }
    .btn-secondary:hover {
      background: #31354a;
      border-color: #515673;
    }

    /* Bold Bio Container */
    .bio-panel {
      background: var(--panel-inner);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 22px 28px;
      font-size: 17.5px;
      line-height: 1.6;
      color: #ffffff;
      font-weight: 500;
      word-break: break-word;
      margin-bottom: 26px;
    }
    .bio-panel.empty {
      color: var(--text-dim);
      font-style: italic;
    }

    /* Metrics Row */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
    }
    .metric-card {
      background: var(--panel-inner);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px 24px;
    }
    .metric-card-label {
      font-size: 14px;
      color: #cbd5e1;
      margin-bottom: 6px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
    .metric-card-value {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #fff;
    }

    /* Stage Content */
    .stage-content {
      padding: 36px 44px;
      display: grid;
      grid-template-columns: 370px 1fr;
      gap: 32px;
    }

    .sub-section {
      display: flex;
      flex-direction: column;
      gap: 26px;
    }
    .content-box {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
    }
    .content-box-title {
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Story Vault Grid */
    .stories-vault {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    .story-card-item {
      height: 145px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: #000;
      position: relative;
      cursor: pointer;
      overflow: hidden;
      transition: border-color 0.15s, transform 0.15s;
    }
    .story-card-item:hover {
      border-color: var(--accent);
      transform: scale(1.02);
    }
    .story-card-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .story-type-label {
      position: absolute;
      bottom: 8px;
      right: 8px;
      font-size: 11.5px;
      background: rgba(0, 0, 0, 0.88);
      padding: 3px 8px;
      border-radius: 5px;
      color: #fff;
      font-weight: 800;
      text-transform: uppercase;
    }
    .empty-story-note {
      font-size: 15px;
      color: var(--text-muted);
      padding: 36px 24px;
      text-align: center;
      border: 1px dashed var(--border);
      border-radius: 12px;
      line-height: 1.6;
      font-weight: 500;
    }

    /* Snapshot Box */
    .snapshot-thumb-wrapper {
      width: 100%;
      height: 190px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: #000;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .snapshot-thumb-wrapper:hover {
      border-color: var(--accent);
    }
    .snapshot-thumb-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      display: block;
    }
    .snapshot-thumb-label {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(0, 0, 0, 0.92);
      font-size: 13.5px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 6px;
      color: #fff;
    }

    /* Table Container */
    .target-history-box {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
    }
    .target-history-header {
      padding: 20px 26px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .target-history-title {
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
    }
    .table-scroll-wrap {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .data-table {
      width: 100%;
      min-width: 540px;
      border-collapse: collapse;
      font-size: 15.5px;
    }
    .data-table th {
      background: var(--panel-inner);
      font-size: 14.5px;
      color: #ffffff;
      padding: 16px 24px;
      border-bottom: 1px solid var(--border);
      font-weight: 800;
      text-align: left;
    }
    .data-table td {
      padding: 18px 24px;
      border-bottom: 1px solid var(--border-subtle);
      vertical-align: middle;
      line-height: 1.6;
      color: #ffffff;
      font-weight: 500;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: var(--panel-hover); }

    .tag-badge {
      font-size: 13px;
      padding: 5px 12px;
      border-radius: 6px;
      font-weight: 700;
      white-space: nowrap;
      display: inline-block;
    }
    .tag-badge.change { background: rgba(245, 158, 11, 0.22); color: var(--warning); }
    .tag-badge.story { background: var(--accent-soft); color: var(--accent); }
    .tag-badge.base { background: rgba(255, 255, 255, 0.12); color: #ffffff; }

    .diff-item {
      font-size: 15px;
      margin-bottom: 4px;
    }
    .diff-label { color: #cbd5e1; font-weight: 700; }
    .diff-old { color: var(--negative); text-decoration: line-through; margin: 0 6px; }
    .diff-new { color: var(--positive); font-weight: 800; }
    .diff-delta { color: var(--accent); font-size: 14px; font-weight: 800; margin-left: 6px; }

    .media-thumb-btn {
      width: 68px;
      height: 48px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #000;
      overflow: hidden;
      cursor: pointer;
      display: inline-block;
      transition: border-color 0.15s;
    }
    .media-thumb-btn:hover { border-color: var(--accent); }
    .media-thumb-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }

    /* Modal */
    #modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.94);
      backdrop-filter: blur(14px);
      z-index: 10000;
      justify-content: center;
      align-items: center;
      padding: 28px;
    }
    #modal.active { display: flex; }
    .modal-dialog {
      max-width: 92vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    .modal-dialog img {
      max-width: 90vw;
      max-height: 80vh;
      border-radius: 12px;
      border: 1px solid var(--border);
      object-fit: contain;
    }
    .modal-bar {
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      width: 100%;
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      align-items: center;
    }
    .modal-close-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(30, 32, 45, 0.92);
      border: 1px solid var(--border);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 20px;
      z-index: 10001;
    }

    /* Responsive Mobile & Tablet Overrides */
    @media (max-width: 1023px) {
      body {
        overflow-y: auto;
      }
      .topbar {
        padding: 16px 20px;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      .topbar-left {
        justify-content: space-between;
        width: 100%;
      }
      .topbar-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        background: var(--panel-inner);
        padding: 12px 14px;
        border-radius: 10px;
        font-size: 14px;
        text-align: center;
      }
      .topbar-sync {
        display: none;
      }
      .layout-split {
        flex-direction: column;
        height: auto;
        overflow: visible;
      }
      /* Horizontal swipeable stories/target selector on mobile */
      .sidebar {
        width: 100%;
        background: #0e0f16;
        border-right: none;
        border-bottom: 1px solid var(--border);
      }
      .sidebar-header {
        padding: 12px 20px;
      }
      .roster-list {
        flex-direction: row;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding: 12px 16px 16px;
        gap: 12px;
      }
      .roster-card {
        flex-shrink: 0;
        min-width: 145px;
        height: 142px;
        padding: 12px 16px;
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 12px;
        flex-direction: column;
        align-items: center;
        text-align: center;
        justify-content: space-between;
        gap: 6px;
      }
      .roster-card.selected {
        border-color: var(--accent);
        background: #1c2233;
      }
      .roster-avatar {
        width: 56px;
        height: 56px;
      }
      .roster-info {
        width: 100%;
      }
      .roster-top-line {
        flex-direction: column;
        gap: 4px;
        min-height: 48px;
        justify-content: center;
      }
      .roster-handle {
        font-size: 15px;
      }
      .roster-stats-line {
        justify-content: center;
        gap: 8px;
        font-size: 13px;
        margin-top: 4px;
      }

      /* Stage Mobile Layout */
      .stage {
        overflow-y: visible;
      }
      .stage-top {
        padding: 24px 20px;
      }
      .profile-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 18px;
      }
      .profile-actions {
        width: 100%;
        justify-content: space-between;
      }
      .profile-actions .btn-secondary {
        flex: 1;
        justify-content: center;
      }
      .metrics-row {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .metric-card {
        padding: 16px 18px;
      }
      .metric-card-value {
        font-size: 32px;
      }
      .stage-content {
        padding: 24px 20px;
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }
  </style>
</head>
<body>
  <!-- Top Bar -->
  <header class="topbar">
    <div class="topbar-left">
      <span class="brand-title">Stalk</span>
      <span class="status-badge"><span class="status-dot"></span> <span id="target-count-badge">6 Target Dipantau</span></span>
    </div>
    <div class="topbar-stats">
      <span>Video: <strong id="sum-videos">0</strong></span>
      <span>Pengikut: <strong id="sum-followers">0</strong></span>
      <span>Story: <strong id="sum-stories" style="color:var(--accent)">0</strong></span>
    </div>
    <div class="topbar-sync">
      <span>Terakhir dicek: ${formatDate(new Date().toISOString())}</span>
    </div>
  </header>

  <!-- Split Workspace -->
  <div class="layout-split">
    <!-- Target Roster (Sidebar on Desktop, Horizontal Swipe on Mobile) -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">Daftar Akun</span>
        <span class="sidebar-count" id="roster-total">6 Akun</span>
      </div>
      <div class="roster-list" id="roster-container"></div>
    </aside>

    <!-- Right Inspector Stage -->
    <main class="stage" id="stage-container"></main>
  </div>

  <!-- Modal -->
  <div id="modal" onclick="closeModal(event)">
    <div class="modal-dialog">
      <button class="modal-close-btn" onclick="closeModal(event)">&times;</button>
      <img id="modal-image" src="" alt="Pratinjau Berkas">
      <div class="modal-bar">
        <span id="modal-caption">-</span>
        <a id="modal-download" href="" download class="btn-secondary">Unduh Berkas</a>
      </div>
    </div>
  </div>

  <script>
    const accounts = ${accountsJson};
    const historyData = ${historyJson};

    const usernames = Object.keys(accounts);
    let selectedUser = usernames[0] || null;

    function renderApp() {
      if (!selectedUser && usernames.length > 0) {
        selectedUser = usernames[0];
      }

      let totalVids = 0;
      let totalFoll = 0;
      let totalStories = 0;

      for (const u of usernames) {
        const a = accounts[u];
        totalVids += a.stats?.videoCount || 0;
        totalFoll += a.stats?.followerCount || 0;
        totalStories += a.activeStories?.length || 0;
      }

      document.getElementById('sum-videos').textContent = totalVids;
      document.getElementById('sum-followers').textContent = Number(totalFoll).toLocaleString('id-ID');
      document.getElementById('sum-stories').textContent = totalStories;
      document.getElementById('target-count-badge').textContent = usernames.length + ' Target Dipantau';
      document.getElementById('roster-total').textContent = usernames.length + ' Akun';

      renderSidebar();
      renderStage();
    }

    function renderSidebar() {
      const list = document.getElementById('roster-container');
      list.innerHTML = '';

      usernames.forEach(u => {
        const acc = accounts[u];
        const stats = acc.stats || {};
        const stories = acc.activeStories || [];
        const isSelected = (u === selectedUser);

        const card = document.createElement('div');
        card.className = 'roster-card' + (isSelected ? ' selected' : '');
        card.onclick = function() {
          selectedUser = u;
          renderApp();
        };

        card.innerHTML = \`
          <div class="roster-avatar">
            <img src="\${acc.avatarUrl}" alt="\${u}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23444\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z\\'/></svg>'">
          </div>
          <div class="roster-info">
            <div class="roster-top-line">
              <span class="roster-handle">@\${u}</span>
              \${stories.length > 0 ? \`<span class="roster-story-badge">\${stories.length} Story</span>\` : ''}
            </div>
            <div class="roster-stats-line">
              <span>Video: <strong>\${stats.videoCount ?? 0}</strong></span>
              <span>Pengikut: <strong>\${Number(stats.followerCount ?? 0).toLocaleString('id-ID')}</strong></span>
            </div>
          </div>
        \`;
        list.appendChild(card);
      });
    }

    function renderStage() {
      const stage = document.getElementById('stage-container');
      if (!selectedUser || !accounts[selectedUser]) {
        stage.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-dim);font-size:16px;">Pilih akun di daftar.</div>';
        return;
      }

      const acc = accounts[selectedUser];
      const stats = acc.stats || {};
      const stories = acc.activeStories || [];
      const latestScreenshot = acc.lastChangeScreenshot || acc.lastBaselineScreenshot || '';

      const userEvents = historyData.filter(e => e.username === selectedUser);

      // Stories Grid
      let storiesHtml = '';
      if (stories.length > 0) {
        storiesHtml = \`
          <div class="stories-vault">
            \${stories.map((s, idx) => \`
              <div class="story-card-item" onclick="openModal('\${s.screenshot || s.mediaFile}', '@\${selectedUser} - Story \${idx+1}')" title="\${s.desc || 'Story'}">
                <img src="\${s.mediaFile || s.screenshot}" alt="Story">
                <span class="story-type-label">\${s.mediaType || 'media'}</span>
              </div>
            \`).join('')}
          </div>
        \`;
      } else {
        storiesHtml = '<div class="empty-story-note">Tidak ada story aktif dalam 24 jam terakhir</div>';
      }

      // History Rows
      let rowsHtml = '';
      if (userEvents.length === 0) {
        rowsHtml = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:28px;font-size:15px;">Belum ada perubahan tercatat.</td></tr>';
      } else {
        const rev = [...userEvents].reverse();
        rowsHtml = rev.map(item => {
          const timeStr = new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
          let tagClass = 'base';
          let tagText = 'Baseline';
          if (item.eventType === 'PROFILE_CHANGED') { tagClass = 'change'; tagText = 'Perubahan'; }
          else if (item.eventType === 'NEW_STORY') { tagClass = 'story'; tagText = 'Story'; }

          let detail = '';
          if (item.eventType === 'INITIAL_BASELINE') {
            detail = '<span style="color:#cbd5e1;">Perekaman status profil awal ke sistem.</span>';
          } else if (item.eventType === 'NEW_STORY' && item.story) {
            detail = \`Story: "\${escapeHtml(item.story.desc || 'Tanpa teks')}" <a href="\${item.story.url}" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:700;margin-left:6px;">[Buka Link]</a>\`;
          } else if (item.changes && item.changes.length > 0) {
            detail = item.changes.map(c => {
              const delta = c.diff !== undefined ? \` <span class="diff-delta">(\${c.diff > 0 ? '+' : ''}\${c.diff})</span>\` : '';
              return \`
                <div class="diff-item">
                  <span class="diff-label">\${c.label}:</span>
                  <span class="diff-old">\${escapeHtml(String(c.oldValue))}</span> &rarr;
                  <span class="diff-new">\${escapeHtml(String(c.newValue))}</span>\${delta}
                </div>
              \`;
            }).join('');
          } else {
            detail = escapeHtml(item.summary || '-');
          }

          const media = item.screenshot || item.story?.screenshot || item.story?.mediaFile;
          let thumb = '<span style="color:var(--text-dim);">-</span>';
          if (media) {
            thumb = \`
              <div class="media-thumb-btn" onclick="openModal('\${media}', '@\${selectedUser} - \${timeStr}')" title="Lihat berkas">
                <img src="\${media}" alt="Berkas" onerror="this.parentElement.innerHTML='<span style=\\'font-size:12px;padding:4px;display:block;\\'>Foto</span>'">
              </div>
            \`;
          }

          return \`
            <tr>
              <td style="white-space:nowrap;color:#cbd5e1;font-weight:600;">\${timeStr}</td>
              <td><span class="tag-badge \${tagClass}">\${tagText}</span></td>
              <td>\${detail}</td>
              <td>\${thumb}</td>
            </tr>
          \`;
        }).join('');
      }

      stage.innerHTML = \`
        <div class="stage-top">
          <div class="profile-header">
            <div class="profile-user-left">
              <div class="profile-large-avatar">
                <img src="\${acc.avatarUrl}" alt="\${acc.nickname}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23444\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z\\'/></svg>'">
              </div>
              <div class="profile-titles">
                <div class="profile-name">
                  <span>\${acc.nickname || selectedUser}</span>
                  \${acc.isVerified ? '<span style="color:var(--accent);font-size:18px;">✓</span>' : ''}
                </div>
                <a class="profile-link" href="https://www.tiktok.com/@\${selectedUser}" target="_blank">
                  <span>@\${selectedUser}</span>
                  <span style="font-size:14px;">↗</span>
                </a>
              </div>
            </div>
            <div class="profile-actions">
              <span class="privacy-badge">
                \${acc.isPrivate ? 'Akun Privat 🔒' : 'Akun Publik 🌐'}
              </span>
              \${latestScreenshot ? \`
                <button class="btn-secondary" onclick="openModal('\${latestScreenshot}', '@\${selectedUser} - Tangkapan Layar Profil')">
                  Lihat Tangkapan Layar ↗
                </button>
              \` : ''}
            </div>
          </div>

          <div class="bio-panel \${acc.bio ? '' : 'empty'}">
            \${acc.bio ? escapeHtml(acc.bio) : 'Tidak ada teks bio tercantum'}
          </div>

          <div class="metrics-row">
            <div class="metric-card">
              <div class="metric-card-label">Video</div>
              <div class="metric-card-value">\${stats.videoCount ?? 0}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">Pengikut</div>
              <div class="metric-card-value">\${Number(stats.followerCount ?? 0).toLocaleString('id-ID')}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">Mengikuti</div>
              <div class="metric-card-value">\${Number(stats.followingCount ?? 0).toLocaleString('id-ID')}</div>
            </div>
            <div class="metric-card">
              <div class="metric-card-label">Suka</div>
              <div class="metric-card-value">\${Number(stats.heartCount ?? 0).toLocaleString('id-ID')}</div>
            </div>
          </div>
        </div>

        <div class="stage-content">
          <div class="sub-section">
            <div class="content-box">
              <div class="content-box-title">
                <span>Story Aktif (\${stories.length})</span>
              </div>
              \${storiesHtml}
            </div>

            \${latestScreenshot ? \`
              <div class="content-box">
                <div class="content-box-title">Tangkapan Layar Terakhir</div>
                <div class="snapshot-thumb-wrapper" onclick="openModal('\${latestScreenshot}', '@\${selectedUser} - Tangkapan Layar Profil')">
                  <img src="\${latestScreenshot}" alt="Tangkapan layar">
                  <span class="snapshot-thumb-label">Klik untuk perbesar</span>
                </div>
              </div>
            \` : ''}
          </div>

          <div class="target-history-box">
            <div class="target-history-header">
              <span class="target-history-title">Riwayat Perubahan Akun</span>
              <span style="font-size:14.5px;color:#cbd5e1;font-weight:700;">\${userEvents.length} Peristiwa</span>
            </div>
            <div class="table-scroll-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Kategori</th>
                    <th>Detail Perubahan</th>
                    <th>Berkas</th>
                  </tr>
                </thead>
                <tbody>
                  \${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      \`;
    }

    function escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function openModal(src, title) {
      const modal = document.getElementById('modal');
      const img = document.getElementById('modal-image');
      const cap = document.getElementById('modal-caption');
      const dl = document.getElementById('modal-download');
      img.src = src;
      cap.textContent = title || '-';
      dl.href = src;
      modal.classList.add('active');
    }

    function closeModal(e) {
      if (e.target.id === 'modal' || e.target.classList.contains('modal-close-btn')) {
        document.getElementById('modal').classList.remove('active');
      }
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.getElementById('modal').classList.remove('active');
      }
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= usernames.length) {
        selectedUser = usernames[num - 1];
        renderApp();
      }
    });

    renderApp();
  </script>
</body>
</html>`;

  await fs.writeFile(REPORT_HTML_FILE, html, "utf-8");
  await fs.writeFile(INDEX_HTML_FILE, html, "utf-8");
  return REPORT_HTML_FILE;
}
