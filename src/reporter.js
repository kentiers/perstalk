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

// Generate 100% pure, optimized Pico CSS v2 dashboard with inlined CSS (0 network requests, blazing fast)
export async function generateHtmlReport() {
  const history = await loadHistory();
  const latestState = await loadLatestState();

  const accountsJson = JSON.stringify(latestState);
  const historyJson = JSON.stringify(history);

  // Load official Pico CSS v2 from node_modules for zero-latency inlined styling
  let picoCss = "";
  try {
    const picoPath = path.join(ROOT_DIR, "node_modules", "@picocss", "pico", "css", "pico.min.css");
    picoCss = await fs.readFile(picoPath, "utf-8");
  } catch {
    picoCss = "";
  }

  const cssInclude = picoCss
    ? `<style>${picoCss}</style>`
    : `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">`;

  const html = `<!DOCTYPE html>
<html lang="id" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stalk - Pemantau Akun</title>
  ${cssInclude}
  <style>
    /* Native Pico CSS v2 integration */
    /* Responsive 2x2 on mobile, 4-col on desktop */
    .summary-grid, .telemetry-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      text-align: center;
      margin-top: 0.5rem;
    }
    @media (min-width: 768px) {
      .summary-grid, .telemetry-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
      }
    }
    .profile-avatar-img {
      width: 76px;
      height: 76px;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      object-fit: cover;
      background: #000;
      flex-shrink: 0;
      border: 2px solid var(--pico-muted-border-color);
    }
    .story-thumb-box {
      width: 100%;
      height: 150px;
      border-radius: var(--pico-border-radius);
      overflow: hidden;
      background: #000;
      cursor: pointer;
      position: relative;
    }
    .story-thumb-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .story-thumb-box mark {
      position: absolute;
      bottom: 6px;
      right: 6px;
      font-size: 0.75rem;
      padding: 0.15rem 0.45rem;
    }
    .snapshot-thumb-box {
      width: 100%;
      height: 200px;
      border-radius: var(--pico-border-radius);
      overflow: hidden;
      background: #000;
      cursor: pointer;
    }
    .snapshot-thumb-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      display: block;
    }
    dialog article img {
      width: 100%;
      max-height: 75vh;
      object-fit: contain;
      border-radius: var(--pico-border-radius);
      display: block;
      margin: 1rem 0;
    }
  </style>
</head>
<body>
  <!-- Header with Semantic Nav -->
  <header class="container" style="padding-top:1rem;padding-bottom:0.5rem;">
    <nav>
      <ul>
        <li><strong>Stalk</strong></li>
        <li><ins>• 6 Target</ins></li>
      </ul>
      <ul>
        <li><small id="sync-time">${formatDate(new Date().toISOString())}</small></li>
      </ul>
    </nav>
    <div class="summary-grid">
      <article style="margin-bottom:0;padding:0.75rem 0.5rem;">
        <small style="color:var(--pico-muted-color);">TOTAL VIDEO</small>
        <h4 style="margin-bottom:0;margin-top:0.2rem;" id="sum-videos">0</h4>
      </article>
      <article style="margin-bottom:0;padding:0.75rem 0.5rem;">
        <small style="color:var(--pico-muted-color);">TOTAL PENGIKUT</small>
        <h4 style="margin-bottom:0;margin-top:0.2rem;" id="sum-followers">0</h4>
      </article>
      <article style="margin-bottom:0;padding:0.75rem 0.5rem;">
        <small style="color:var(--pico-muted-color);">STORY AKTIF</small>
        <h4 style="margin-bottom:0;margin-top:0.2rem;" id="sum-stories">0</h4>
      </article>
      <article style="margin-bottom:0;padding:0.75rem 0.5rem;">
        <small style="color:var(--pico-muted-color);">TARGET</small>
        <h4 style="margin-bottom:0;margin-top:0.2rem;" id="sum-targets">6</h4>
      </article>
    </div>
  </header>

  <!-- Main Content Container -->
  <main class="container">
    <!-- Compact Target Selector Dropdown -->
    <section style="margin-bottom:1rem;">
      <label for="target-selector" style="font-weight:700;font-size:1.05rem;margin-bottom:0.4rem;display:block;">Pilih Akun Target:</label>
      <select id="target-selector" onchange="onSelectTarget(this.value)" style="margin-bottom:0;font-weight:600;font-size:1rem;"></select>
    </section>

    <!-- Active Profile Inspector Section -->
    <section id="inspector-stage"></section>
  </main>

  <!-- Native HTML5 Dialog Modal Styled by Pico CSS -->
  <dialog id="modal">
    <article>
      <header>
        <button aria-label="Close" rel="prev" onclick="closeModal()"></button>
        <p><strong id="modal-caption">-</strong></p>
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

      renderSelectorDropdown();
      renderStage();
    }

    function renderSelectorDropdown() {
      const select = document.getElementById('target-selector');
      select.innerHTML = '';

      usernames.forEach(u => {
        const acc = accounts[u];
        const stories = acc.activeStories || [];
        const opt = document.createElement('option');
        opt.value = u;
        opt.selected = (u === selectedUser);
        const storyTag = stories.length > 0 ? ' (' + stories.length + ' Story Aktif)' : '';
        opt.textContent = '@' + u + ' - ' + (acc.nickname || u) + storyTag;
        select.appendChild(opt);
      });
    }

    function onSelectTarget(user) {
      selectedUser = user;
      renderApp();
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

      // Story Grid
      let storiesHtml = '';
      if (stories.length > 0) {
        storiesHtml = \`
          <div class="grid">
            \${stories.map((s, idx) => \`
              <div class="story-thumb-box" onclick="openModal('\${s.screenshot || s.mediaFile}', '@\${selectedUser} - Story \${idx+1}')">
                <img src="\${s.mediaFile || s.screenshot}" alt="Story">
                <mark>\${s.mediaType || 'media'}</mark>
              </div>
            \`).join('')}
          </div>
        \`;
      } else {
        storiesHtml = '<p><small>Tidak ada story aktif dalam 24 jam terakhir.</small></p>';
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
        <!-- Target Profile Card via Pico Article -->
        <article>
          <header style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1.25rem;">
            <div style="display:flex;align-items:center;gap:1.25rem;">
              <img class="profile-avatar-img" src="\${acc.avatarUrl}" alt="\${acc.nickname}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23555\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M12 14c-6.1 0-8 4-8 4v2h16v-2s-1.9-4-8-4z\\'/></svg>'">
              <div>
                <h2 style="margin-bottom:0.2rem;font-size:1.85rem;font-weight:800;">\${acc.nickname || selectedUser} \${acc.isVerified ? '✓' : ''}</h2>
                <a href="https://www.tiktok.com/@\${selectedUser}" target="_blank" style="font-size:1.05rem;font-weight:700;">@\${selectedUser} ↗</a>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
              <ins style="font-weight:700;">\${acc.isPrivate ? 'Akun Privat 🔒' : 'Akun Publik 🌐'}</ins>
              \${latestScreenshot ? \`
                <button class="outline" onclick="openModal('\${latestScreenshot}', '@\${selectedUser} - Snapshot Profil')" style="margin-bottom:0;">
                  Snapshot Profil ↗
                </button>
              \` : ''}
            </div>
          </header>

          <!-- Bio via Semantic blockquote -->
          <blockquote style="margin:0.75rem 0;padding:0.65rem 1rem;">
            \${acc.bio ? escapeHtml(acc.bio) : '<em>Tidak ada teks bio tercantum.</em>'}
          </blockquote>

          <!-- 4 Metric Cards via Pico Grid -->
          <div class="telemetry-grid">
            <article style="text-align:center;margin-bottom:0;padding:0.85rem 0.5rem;">
              <small style="font-weight:700;color:var(--pico-muted-color);">VIDEO</small>
              <h2 style="margin-bottom:0;margin-top:0.25rem;">\${stats.videoCount ?? 0}</h2>
            </article>
            <article style="text-align:center;margin-bottom:0;padding:1.25rem 0.5rem;">
              <small style="font-weight:700;color:var(--pico-muted-color);">PENGIKUT</small>
              <h2 style="margin-bottom:0;margin-top:0.25rem;">\${Number(stats.followerCount ?? 0).toLocaleString('id-ID')}</h2>
            </article>
            <article style="text-align:center;margin-bottom:0;padding:1.25rem 0.5rem;">
              <small style="font-weight:700;color:var(--pico-muted-color);">MENGIKUTI</small>
              <h2 style="margin-bottom:0;margin-top:0.25rem;">\${Number(stats.followingCount ?? 0).toLocaleString('id-ID')}</h2>
            </article>
            <article style="text-align:center;margin-bottom:0;padding:1.25rem 0.5rem;">
              <small style="font-weight:700;color:var(--pico-muted-color);">SUKA</small>
              <h2 style="margin-bottom:0;margin-top:0.25rem;">\${Number(stats.heartCount ?? 0).toLocaleString('id-ID')}</h2>
            </article>
          </div>
        </article>

        <!-- Media Grid (Pico Grid) -->
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
              <div class="snapshot-thumb-box" onclick="openModal('\${latestScreenshot}', '@\${selectedUser} - Snapshot Profil')">
                <img src="\${latestScreenshot}" alt="Snapshot">
              </div>
            </article>
          \` : ''}
        </div>

        <!-- Full-Width Audit Table (Pico Table) -->
        <article>
          <header>
            <strong>Riwayat Perubahan Akun</strong>
          </header>
          <div class="overflow-auto">
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
