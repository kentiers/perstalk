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

// Generate pure Pico CSS dashboard (100% semantic, robust, and responsive)
export async function generateHtmlReport() {
  const history = await loadHistory();
  const latestState = await loadLatestState();

  const accountsJson = JSON.stringify(latestState);
  const historyJson = JSON.stringify(history);

  const html = `<!DOCTYPE html>
<html lang="id" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stalk - Pemantau Akun</title>
  <!-- Pico CSS v2 (https://picocss.com) -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
  <style>
    :root {
      --pico-border-radius: 0.6rem;
    }
    body {
      padding-bottom: 4rem;
    }
    /* Brand Header */
    .brand-header {
      padding-top: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--pico-muted-border-color);
      margin-bottom: 2rem;
    }
    .header-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .header-nav h1 {
      margin-bottom: 0;
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .stats-summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      background: var(--pico-card-background-color);
      border: 1px solid var(--pico-card-border-color);
      border-radius: var(--pico-border-radius);
      padding: 0.85rem 1rem;
      text-align: center;
      font-size: 0.95rem;
    }
    @media (min-width: 768px) {
      .stats-summary-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .stats-summary-grid div strong {
      color: var(--pico-primary);
      font-size: 1.2rem;
      display: block;
      margin-top: 0.2rem;
    }

    /* Target Selector Switcher */
    .selector-container {
      margin-bottom: 2rem;
    }
    .selector-container h3 {
      font-size: 1.05rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      color: var(--pico-muted-color);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .target-btn-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.6rem;
    }
    @media (min-width: 768px) {
      .target-btn-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }
    }
    .target-btn-grid button {
      margin-bottom: 0;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 0.75rem 0.8rem;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Profile Header - Mobile First Stacking */
    .profile-card-header {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1.25rem;
      margin-bottom: 1.25rem;
      width: 100%;
    }
    @media (min-width: 768px) {
      .profile-card-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }
    }
    .profile-meta-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      width: 100%;
    }
    .profile-titles {
      min-width: 0;
      flex: 1;
      overflow: hidden;
    }
    .profile-titles h2 {
      margin-bottom: 0.15rem;
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .profile-titles a {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--pico-primary);
      text-decoration: none;
    }
    .profile-titles a:hover {
      text-decoration: underline;
    }
    .profile-actions-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      width: 100%;
    }
    @media (min-width: 768px) {
      .profile-actions-right {
        width: auto;
      }
    }
    .profile-actions-right button, .profile-actions-right a {
      margin-bottom: 0;
      flex: 1;
    }
    @media (min-width: 768px) {
      .profile-actions-right button, .profile-actions-right a {
        flex: initial;
      }
    }
    .profile-avatar {
      width: 76px;
      height: 76px;
      border-radius: var(--pico-border-radius);
      object-fit: cover;
      background: #000;
      border: 2px solid var(--pico-muted-border-color);
      flex-shrink: 0;
    }

    /* Bio quote */
    blockquote {
      margin: 1.5rem 0;
      padding: 1rem 1.25rem;
      font-size: 1.1rem;
      line-height: 1.6;
    }

    /* Metrics Grid */
    .telemetry-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    @media (min-width: 768px) {
      .telemetry-row {
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
      }
    }
    .telemetry-box {
      text-align: center;
      margin-bottom: 0;
      padding: 1.25rem 0.75rem;
    }
    .telemetry-box p {
      margin-bottom: 0.35rem;
      font-size: 0.9rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pico-muted-color);
    }
    .telemetry-box h3 {
      margin-bottom: 0;
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--pico-color);
    }

    /* Story Vault Grid */
    .story-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .story-tile {
      position: relative;
      height: 150px;
      border-radius: var(--pico-border-radius);
      border: 1px solid var(--pico-muted-border-color);
      overflow: hidden;
      cursor: pointer;
      background: #000;
    }
    .story-tile img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .story-tile mark {
      position: absolute;
      bottom: 6px;
      right: 6px;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    /* Snapshot Box */
    .snapshot-container {
      position: relative;
      height: 200px;
      border-radius: var(--pico-border-radius);
      border: 1px solid var(--pico-muted-border-color);
      overflow: hidden;
      cursor: pointer;
      background: #000;
      margin-top: 1rem;
    }
    .snapshot-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      display: block;
    }
    .snapshot-container span {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 4px;
    }

    /* Modal dialog */
    dialog article img {
      max-height: 75vh;
      width: 100%;
      object-fit: contain;
      border-radius: var(--pico-border-radius);
      margin: 1rem 0;
      display: block;
    }

    @media (max-width: 768px) {
      .telemetry-row {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
      .telemetry-box h3 {
        font-size: 2rem;
      }
      .profile-titles h2 {
        font-size: 1.6rem;
      }
      .target-btn-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <!-- Semantic Header -->
  <header class="container brand-header">
    <div class="header-nav">
      <div>
        <h1>Stalk</h1>
        <small class="secondary">• 6 Target Dipantau</small>
      </div>
      <div>
        <small class="secondary">Pembaruan: ${formatDate(new Date().toISOString())}</small>
      </div>
    </div>
    <div class="stats-summary-grid">
      <div>Total Video: <strong id="sum-videos">0</strong></div>
      <div>Total Pengikut: <strong id="sum-followers">0</strong></div>
      <div>Story Aktif: <strong id="sum-stories">0</strong></div>
      <div>Target Dipantau: <strong id="sum-targets">6</strong></div>
    </div>
  </header>

  <!-- Semantic Main Content -->
  <main class="container">
    <!-- Target Account Selector Grid -->
    <section class="selector-container">
      <h3>Pilih Akun Target</h3>
      <div class="target-btn-grid" id="target-selector-grid"></div>
    </section>

    <!-- Target Dossier Stage -->
    <section id="inspector-stage"></section>
  </main>

  <!-- Native HTML5 Dialog for Lightbox -->
  <dialog id="modal">
    <article>
      <header>
        <button aria-label="Close" rel="prev" onclick="closeModal()"></button>
        <strong id="modal-caption">-</strong>
      </header>
      <img id="modal-image" src="" alt="Pratinjau">
      <footer>
        <a id="modal-download" role="button" download>Unduh Berkas</a>
      </footer>
    </article>
  </dialog>

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
      document.getElementById('sum-targets').textContent = usernames.length;
      renderSelector();
      renderStage();
    }

    function renderSelector() {
      const grid = document.getElementById('target-selector-grid');
      grid.innerHTML = '';

      usernames.forEach(u => {
        const acc = accounts[u];
        const stories = acc.activeStories || [];
        const isSelected = (u === selectedUser);

        const btn = document.createElement('button');
        btn.className = isSelected ? 'primary' : 'outline secondary';
        const badge = stories.length > 0 ? ' (' + stories.length + 'S)' : '';
        btn.textContent = '@' + u + badge;
        btn.onclick = function() {
          selectedUser = u;
          renderApp();
        };

        grid.appendChild(btn);
      });
    }

    function renderStage() {
      const stage = document.getElementById('inspector-stage');
      if (!selectedUser || !accounts[selectedUser]) {
        stage.innerHTML = '<article><p>Pilih akun target di atas.</p></article>';
        return;
      }

      const acc = accounts[selectedUser];
      const stats = acc.stats || {};
      const stories = acc.activeStories || [];
      const latestScreenshot = acc.lastChangeScreenshot || acc.lastBaselineScreenshot || '';
      const userEvents = historyData.filter(e => e.username === selectedUser);

      // Stories Section
      let storiesHtml = '';
      if (stories.length > 0) {
        storiesHtml = \`
          <div class="story-grid">
            \${stories.map((s, idx) => \`
              <div class="story-tile" onclick="openModal('\${s.screenshot || s.mediaFile}', '@\${selectedUser} - Story \${idx+1}')">
                <img src="\${s.mediaFile || s.screenshot}" alt="Story">
                <mark>\${s.mediaType || 'media'}</mark>
              </div>
            \`).join('')}
          </div>
        \`;
      } else {
        storiesHtml = '<p class="secondary" style="margin-top:1rem;"><small>Tidak ada story aktif dalam 24 jam terakhir.</small></p>';
      }

      // History Table
      let tableRowsHtml = '';
      if (userEvents.length === 0) {
        tableRowsHtml = '<tr><td colspan="4" class="secondary">Belum ada perubahan tercatat.</td></tr>';
      } else {
        const rev = [...userEvents].reverse();
        tableRowsHtml = rev.map(item => {
          const timeStr = new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
          let badgeTag = 'Baseline';
          if (item.eventType === 'PROFILE_CHANGED') badgeTag = 'Perubahan';
          else if (item.eventType === 'NEW_STORY') badgeTag = 'Story';

          let detail = '';
          if (item.eventType === 'INITIAL_BASELINE') {
            detail = 'Perekaman status profil awal ke sistem.';
          } else if (item.eventType === 'NEW_STORY' && item.story) {
            detail = 'Story: "' + escapeHtml(item.story.desc || 'Tanpa teks') + '" <a href="' + item.story.url + '" target="_blank">[Buka Link]</a>';
          } else if (item.changes && item.changes.length > 0) {
            detail = item.changes.map(c => {
              const delta = c.diff !== undefined ? ' (<strong>' + (c.diff > 0 ? '+' : '') + c.diff + '</strong>)' : '';
              return '<div><strong>' + c.label + ':</strong> <del>' + escapeHtml(String(c.oldValue)) + '</del> &rarr; <ins>' + escapeHtml(String(c.newValue)) + '</ins>' + delta + '</div>';
            }).join('');
          } else {
            detail = escapeHtml(item.summary || '-');
          }

          const media = item.screenshot || item.story?.screenshot || item.story?.mediaFile;
          let thumb = '-';
          if (media) {
            thumb = '<button class="outline secondary" style="margin-bottom:0;padding:0.35rem 0.75rem;font-size:0.85rem;" onclick="openModal(\\'' + media + '\\', \\'@' + selectedUser + ' - ' + timeStr + '\\')">Lihat</button>';
          }

          return \`
            <tr>
              <td><small>\${timeStr}</small></td>
              <td><mark>\${badgeTag}</mark></td>
              <td>\${detail}</td>
              <td>\${thumb}</td>
            </tr>
          \`;
        }).join('');
      }

      stage.innerHTML = \`
        <!-- Target Profile Card -->
        <article>
          <div class="profile-card-header">
            <div class="profile-meta-left">
              <img class="profile-avatar" src="\${acc.avatarUrl}" alt="\${acc.nickname}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23555\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z\\'/></svg>'">
              <div class="profile-titles">
                <h2>\${acc.nickname || selectedUser} \${acc.isVerified ? '✓' : ''}</h2>
                <a href="https://www.tiktok.com/@\${selectedUser}" target="_blank">@\${selectedUser} ↗</a>
              </div>
            </div>

            <div class="profile-actions-right">
              <span class="secondary" style="font-weight:700;font-size:0.95rem;">
                \${acc.isPrivate ? 'Akun Privat 🔒' : 'Akun Publik 🌐'}
              </span>
              \${latestScreenshot ? \`
                <button class="outline" onclick="openModal('\${latestScreenshot}', '@\${selectedUser} - Tangkapan Layar Profil')">
                  Lihat Snapshot Profil ↗
                </button>
              \` : ''}
            </div>
          </div>

          <!-- Bio -->
          <blockquote>
            \${acc.bio ? escapeHtml(acc.bio) : '<em>Tidak ada teks bio tercantum.</em>'}
          </blockquote>

          <!-- 4 Metrics Grid -->
          <div class="telemetry-row">
            <article class="telemetry-box">
              <p>Video</p>
              <h3>\${stats.videoCount ?? 0}</h3>
            </article>
            <article class="telemetry-box">
              <p>Pengikut</p>
              <h3>\${Number(stats.followerCount ?? 0).toLocaleString('id-ID')}</h3>
            </article>
            <article class="telemetry-box">
              <p>Mengikuti</p>
              <h3>\${Number(stats.followingCount ?? 0).toLocaleString('id-ID')}</h3>
            </article>
            <article class="telemetry-box">
              <p>Suka</p>
              <h3>\${Number(stats.heartCount ?? 0).toLocaleString('id-ID')}</h3>
            </article>
          </div>
        </article>

        <!-- Stories & Snapshot Grid (2-column) -->
        <div class="grid">
          <article>
            <header>
              <strong>Story Aktif (\${stories.length})</strong>
            </header>
            \${storiesHtml}
          </article>

          \${latestScreenshot ? \`
            <article>
              <header>
                <strong>Tangkapan Layar Terakhir</strong>
              </header>
              <div class="snapshot-container" onclick="openModal('\${latestScreenshot}', '@\${selectedUser} - Tangkapan Layar Profil')">
                <img src="\${latestScreenshot}" alt="Snapshot">
                <span>Klik untuk perbesar</span>
              </div>
            </article>
          \` : ''}
        </div>

        <!-- Full-Width Audit Table -->
        <article>
          <header>
            <strong>Riwayat Perubahan Akun</strong>
          </header>
          <div style="overflow-x:auto;">
            <table class="striped">
              <thead>
                <tr>
                  <th scope="col">Waktu</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Detail Perubahan</th>
                  <th scope="col">Berkas</th>
                </tr>
              </thead>
              <tbody>
                \${tableRowsHtml}
              </tbody>
            </table>
          </div>
        </article>
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
      modal.showModal();
    }

    function closeModal() {
      document.getElementById('modal').close();
    }

    renderApp();
  </script>
</body>
</html>`;

  await fs.writeFile(REPORT_HTML_FILE, html, "utf-8");
  await fs.writeFile(INDEX_HTML_FILE, html, "utf-8");
  return REPORT_HTML_FILE;
}
