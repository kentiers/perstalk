import { chromium } from "playwright-core";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CONFIG_FILE = path.join(ROOT_DIR, "config", "accounts.json");
const DATA_DIR = path.join(ROOT_DIR, "data");
const LATEST_STATE_FILE = path.join(DATA_DIR, "latest-state.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const SESSION_DIR = path.join(DATA_DIR, "browser-session");
const SCREENSHOTS_DIR = path.join(ROOT_DIR, "screenshots");

// Ensure required base directories exist
export async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(SESSION_DIR, { recursive: true });
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
}

// Ensure account-specific subdirectories exist
export async function ensureAccountDirs(username) {
  const clean = username.replace(/^@/, "");
  const baseDir = path.join(SCREENSHOTS_DIR, `@${clean}`);
  const profileDir = path.join(baseDir, "profile");
  const storiesDir = path.join(baseDir, "stories");
  await fs.mkdir(profileDir, { recursive: true });
  await fs.mkdir(storiesDir, { recursive: true });
  return { baseDir, profileDir, storiesDir };
}

// Load configuration
export async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[CONFIG ERROR] Gagal membaca config/accounts.json: ${err.message}`);
    throw err;
  }
}

// Load previous latest state
export async function loadLatestState() {
  try {
    const raw = await fs.readFile(LATEST_STATE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Save latest state
export async function saveLatestState(state) {
  await fs.writeFile(LATEST_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

// Load history events
export async function loadHistory() {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Save history events
export async function saveHistory(history) {
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
}

// Format timestamp for filenames: YYYY-MM-DD_HH-mm-ss
function getFormattedTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const Y = date.getFullYear();
  const M = pad(date.getMonth() + 1);
  const D = pad(date.getDate());
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${Y}-${M}-${D}_${h}-${m}-${s}`;
}

// Format date for display: YYYY-MM-DD
function getFormattedDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const Y = date.getFullYear();
  const M = pad(date.getMonth() + 1);
  const D = pad(date.getDate());
  return `${Y}-${M}-${D}`;
}

// Download media file (image/video) to destination
async function downloadMedia(url, destPath) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    await fs.writeFile(destPath, Buffer.from(arrayBuffer));
    return true;
  } catch (err) {
    console.warn(`[DOWNLOAD WARNING] Gagal mengunduh media dari ${url}: ${err.message}`);
    return false;
  }
}

// Launch browser context
export async function createBrowserContext(config, headful = false) {
  const settings = config.settings || {};
  let chromePath = settings.chromePath || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  try {
    const { existsSync } = await import("fs");
    if (!existsSync(chromePath)) {
      chromePath = undefined;
    }
  } catch {
    chromePath = undefined;
  }
  const isHeadless = headful ? false : (settings.headless ?? true);
  const viewport = settings.viewport || { width: 1366, height: 900 };

  const launchOptions = {
    headless: isHeadless,
    viewport,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      `--window-size=${viewport.width},${viewport.height}`
    ]
  };
  if (chromePath) {
    launchOptions.executablePath = chromePath;
  }

  const context = await chromium.launchPersistentContext(SESSION_DIR, launchOptions);
  return context;
}

// Dismiss modals, popups, and captchas, then take clean screenshot
export async function takeCleanScreenshot(page, destPath) {
  await page.evaluate(() => {
    // 1. Click close buttons on overlays/captchas
    const closeButtons = document.querySelectorAll(
      'button[aria-label="Close"], [class*="modal"] button, .captcha-verify-container button, button.TUXButton--borderless'
    );
    closeButtons.forEach((btn) => {
      try { btn.click(); } catch {}
    });

    // 2. Hide any leftover modal overlay or captcha backdrop with CSS
    const overlays = document.querySelectorAll(
      '.TUXModal-overlay, .captcha-verify-container, [class*="overlay"], [class*="modal-backdrop"]'
    );
    overlays.forEach((el) => {
      try {
        const h = el;
        h.style.display = "none";
        h.style.opacity = "0";
        h.style.pointerEvents = "none";
      } catch {}
    });

    // Restore body scroll
    document.body.style.overflow = "auto";
  });

  // Short delay for DOM repaint
  await page.waitForTimeout(600);
  await page.screenshot({ path: destPath, fullPage: false });
}

// Scrape profile data from page
export async function extractProfileData(page, targetUsername) {
  return await page.evaluate((targetUsername) => {
    // 1. Rehydration data from script tag
    let user = null;
    let stats = null;
    const rehydrationScript = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__");
    if (rehydrationScript && rehydrationScript.textContent) {
      try {
        const parsed = JSON.parse(rehydrationScript.textContent);
        const defaultScope = parsed["__DEFAULT_SCOPE__"];
        const userDetail = defaultScope?.["webapp.user-detail"];
        if (userDetail?.userInfo) {
          user = userDetail.userInfo.user;
          stats = userDetail.userInfo.stats;
        }
      } catch {}
    }

    // 2. Fallback / DOM Extraction
    const domNickname = document.querySelector('[data-e2e="user-title"]')?.textContent?.trim() || "";
    const domUsername = document.querySelector('[data-e2e="user-subtitle"]')?.textContent?.trim() || "";
    const domBio = document.querySelector('[data-e2e="user-bio"]')?.textContent?.trim() || "";
    const domBioLink = document.querySelector('[data-e2e="user-bio-link"]')?.textContent?.trim() || "";
    const domFollowing = document.querySelector('[data-e2e="following-count"]')?.textContent?.trim() || "";
    const domFollowers = document.querySelector('[data-e2e="followers-count"]')?.textContent?.trim() || "";
    const domLikes = document.querySelector('[data-e2e="likes-count"]')?.textContent?.trim() || "";

    // DOM Playlists
    const playlistElements = Array.from(document.querySelectorAll('[data-e2e*="playlist"], a[href*="/playlist/"]'));
    const playlists = playlistElements.map((el) => el.textContent?.trim()).filter(Boolean);

    // Combine data
    const finalUsername = user?.uniqueId || domUsername.replace(/^@/, "") || targetUsername;
    const finalNickname = user?.nickname || domNickname;
    const finalBio = user?.signature !== undefined ? user.signature : domBio;
    const finalBioLink = user?.bioLink?.link || domBioLink;
    const finalAvatar = user?.avatarLarger || user?.avatarMedium || user?.avatarThumb || "";
    const finalFollowing = stats?.followingCount ?? (domFollowing ? parseInt(domFollowing.replace(/\D/g, ""), 10) : 0);
    const finalFollowers = stats?.followerCount ?? (domFollowers ? parseInt(domFollowers.replace(/\D/g, ""), 10) : 0);
    const finalLikes = stats?.heartCount ?? (domLikes ? parseInt(domLikes.replace(/\D/g, ""), 10) : 0);
    const finalVideoCount = stats?.videoCount ?? 0;
    const isPrivate = Boolean(user?.privateAccount || user?.secret);
    const isVerified = Boolean(user?.verified);

    return {
      userId: user?.id || "",
      secUid: user?.secUid || "",
      username: finalUsername,
      nickname: finalNickname,
      bio: finalBio,
      bioLink: finalBioLink,
      avatarUrl: finalAvatar,
      isVerified,
      isPrivate,
      stats: {
        followerCount: finalFollowers,
        followingCount: finalFollowing,
        heartCount: finalLikes,
        videoCount: finalVideoCount,
        diggCount: stats?.diggCount ?? 0,
        friendCount: stats?.friendCount ?? 0
      },
      uniqueIdModifyTime: user?.uniqueIdModifyTime || 0,
      nickNameModifyTime: user?.nickNameModifyTime || 0,
      userStoryStatus: user?.UserStoryStatus || 0,
      playlists: Array.from(new Set(playlists))
    };
  }, targetUsername);
}

// Compare current data with previous state and return diffs
export function compareAccountState(prev, curr) {
  if (!prev) return { isInitial: true, changes: [] };

  const changes = [];

  // Username change
  if (prev.username && curr.username && prev.username !== curr.username) {
    changes.push({
      field: "username",
      label: "Username / Handle",
      oldValue: prev.username,
      newValue: curr.username,
      isSignificant: true
    });
  }

  // Nickname change
  if (prev.nickname !== curr.nickname) {
    changes.push({
      field: "nickname",
      label: "Nama Tampilan (Nickname)",
      oldValue: prev.nickname,
      newValue: curr.nickname,
      isSignificant: true
    });
  }

  // Bio change
  if (prev.bio !== curr.bio) {
    changes.push({
      field: "bio",
      label: "Bio / Signature",
      oldValue: prev.bio,
      newValue: curr.bio,
      isSignificant: true
    });
  }

  // Bio link change
  if (prev.bioLink !== curr.bioLink) {
    changes.push({
      field: "bioLink",
      label: "Link Bio",
      oldValue: prev.bioLink || "(kosong)",
      newValue: curr.bioLink || "(kosong)",
      isSignificant: true
    });
  }

  // Avatar change (compare URL pathname to ignore dynamic CDN host rotation)
  const getAvatarPath = (url) => {
    if (!url) return "";
    try {
      return new URL(url).pathname;
    } catch {
      return url.split("?")[0].replace(/^https?:\/\/[^\/]+/, "");
    }
  };
  if (getAvatarPath(prev.avatarUrl) !== getAvatarPath(curr.avatarUrl) && curr.avatarUrl) {
    changes.push({
      field: "avatarUrl",
      label: "Foto Profil (Avatar)",
      oldValue: prev.avatarUrl,
      newValue: curr.avatarUrl,
      isSignificant: true
    });
  }

  // Video / Post count change (New Post or Deleted Post!)
  if (prev.stats?.videoCount !== curr.stats?.videoCount) {
    const diff = curr.stats.videoCount - (prev.stats?.videoCount || 0);
    const actionDesc = diff > 0 ? `Postingan Baru (+${diff})` : `Postingan Dihapus (${diff})`;
    changes.push({
      field: "videoCount",
      label: `Jumlah Video / Post (${actionDesc})`,
      oldValue: prev.stats?.videoCount ?? 0,
      newValue: curr.stats.videoCount,
      diff,
      isSignificant: true
    });
  }

  // Private account toggle
  if (prev.isPrivate !== curr.isPrivate) {
    changes.push({
      field: "isPrivate",
      label: "Status Privasi Akun",
      oldValue: prev.isPrivate ? "Privat" : "Publik",
      newValue: curr.isPrivate ? "Privat" : "Publik",
      isSignificant: true
    });
  }

  // Verified status toggle
  if (prev.isVerified !== curr.isVerified) {
    changes.push({
      field: "isVerified",
      label: "Centang Biru (Verified)",
      oldValue: prev.isVerified ? "Verified" : "Tidak",
      newValue: curr.isVerified ? "Verified" : "Tidak",
      isSignificant: true
    });
  }

  // Follower count change
  if (prev.stats?.followerCount !== curr.stats?.followerCount) {
    const diff = curr.stats.followerCount - (prev.stats?.followerCount || 0);
    changes.push({
      field: "followerCount",
      label: "Jumlah Pengikut (Followers)",
      oldValue: prev.stats?.followerCount ?? 0,
      newValue: curr.stats.followerCount,
      diff,
      isSignificant: false
    });
  }

  // Following count change
  if (prev.stats?.followingCount !== curr.stats?.followingCount) {
    const diff = curr.stats.followingCount - (prev.stats?.followingCount || 0);
    changes.push({
      field: "followingCount",
      label: "Jumlah Mengikuti (Following)",
      oldValue: prev.stats?.followingCount ?? 0,
      newValue: curr.stats.followingCount,
      diff,
      isSignificant: false
    });
  }

  // Likes / Heart count change
  if (prev.stats?.heartCount !== curr.stats?.heartCount) {
    const diff = curr.stats.heartCount - (prev.stats?.heartCount || 0);
    changes.push({
      field: "heartCount",
      label: "Total Suka (Likes)",
      oldValue: prev.stats?.heartCount ?? 0,
      newValue: curr.stats.heartCount,
      diff,
      isSignificant: false
    });
  }

  return { isInitial: false, changes };
}

// Scrape and screenshot stories for an account
async function processStories(context, username, storyApiResponse, dirs, history, prevState) {
  if (!storyApiResponse || !storyApiResponse.itemList || storyApiResponse.itemList.length === 0) {
    return [];
  }

  const activeStories = [];
  const prevStoryIds = new Set((prevState?.activeStories || []).map((s) => s.id));
  const dateStr = getFormattedDate();

  console.log(`\n   📸 [STORY DETECTED] @${username} memiliki ${storyApiResponse.itemList.length} story aktif!`);

  for (const item of storyApiResponse.itemList) {
    const storyId = item.id;
    const desc = item.desc || "";
    const createTime = item.createTime || 0;
    const isPhoto = Boolean(item.imagePost);
    const mediaType = isPhoto ? "photo" : "video";

    // Media download URL
    let mediaUrl = null;
    let ext = isPhoto ? "jpg" : "mp4";

    if (isPhoto && item.imagePost?.images?.[0]?.imageURL?.urlList?.[0]) {
      mediaUrl = item.imagePost.images[0].imageURL.urlList[0];
    } else if (item.video?.cover) {
      mediaUrl = item.video.cover;
    }

    const storyPageUrl = `https://www.tiktok.com/@${username}/${mediaType}/${storyId}`;
    const screenshotFilename = `${dateStr}_story_${storyId}.png`;
    const screenshotAbsPath = path.join(dirs.storiesDir, screenshotFilename);
    const screenshotRelPath = `screenshots/@${username}/stories/${screenshotFilename}`;

    let mediaRelPath = null;
    if (mediaUrl) {
      const mediaFilename = `${dateStr}_story_${storyId}_media.${ext}`;
      const mediaAbsPath = path.join(dirs.storiesDir, mediaFilename);
      mediaRelPath = `screenshots/@${username}/stories/${mediaFilename}`;

      // Download raw media if not already downloaded
      try {
        await fs.access(mediaAbsPath);
      } catch {
        const ok = await downloadMedia(mediaUrl, mediaAbsPath);
        if (ok) {
          console.log(`      📥 Media story ${storyId} diunduh: ${mediaRelPath}`);
        }
      }
    }

    // Capture story viewer screenshot if not already taken
    let hasScreenshot = false;
    try {
      await fs.access(screenshotAbsPath);
      hasScreenshot = true;
    } catch {}

    if (!hasScreenshot) {
      try {
        const storyPage = await context.newPage();
        await storyPage.goto(storyPageUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await storyPage.waitForTimeout(3000);
        await storyPage.screenshot({ path: screenshotAbsPath });
        await storyPage.close();
        console.log(`      📸 Screenshot story ${storyId} disimpan: ${screenshotRelPath}`);
      } catch (err) {
        console.warn(`      ⚠️ Gagal mengambil screenshot story ${storyId}: ${err.message}`);
      }
    }

    const storyObj = {
      id: storyId,
      desc,
      createTime,
      mediaType,
      url: storyPageUrl,
      screenshot: screenshotRelPath,
      mediaFile: mediaRelPath
    };
    activeStories.push(storyObj);

    // If this is a new story not seen previously
    if (!prevStoryIds.has(storyId)) {
      console.log(`   ✨ [NEW STORY] Story baru terdeteksi: ID ${storyId} ${desc ? `("${desc}")` : ""}`);
      history.push({
        id: `evt_story_${storyId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        username,
        eventType: "NEW_STORY",
        summary: `Story baru diunggah oleh @${username}${desc ? `: "${desc}"` : ""}`,
        story: storyObj,
        screenshot: screenshotRelPath
      });
    }
  }

  return activeStories;
}

// Main check function for all enabled accounts
export async function checkAllAccounts(options = {}) {
  await ensureDirs();
  const config = await loadConfig();
  const latestStates = await loadLatestState();
  const history = await loadHistory();

  const accounts = config.accounts.filter((a) => a.enabled !== false);
  console.log(`\n============================================================`);
  console.log(`🔍 [TIKTOK STALKER] Memulai pengecekan ${accounts.length} akun...`);
  console.log(`⏰ Waktu: ${new Date().toLocaleString("id-ID")}`);
  console.log(`============================================================\n`);

  const context = await createBrowserContext(config, options.headful);
  const results = [];

  try {
    for (const acc of accounts) {
      const username = acc.username.replace(/^@/, "");
      const accountUrl = acc.url || `https://www.tiktok.com/@${username}`;
      const dirs = await ensureAccountDirs(username);

      console.log(`\n------------------------------------------------------------`);
      console.log(`📡 Memeriksa @${username} (${accountUrl})...`);

      const page = context.pages()[0] || (await context.newPage());
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
        window.chrome = { runtime: {} };
      });

      // Capture story API and post API responses
      let storyApiResponse = null;
      let postApiResponse = null;

      const responseHandler = async (res) => {
        const url = res.url();
        if (url.includes("/api/story/item_list")) {
          try {
            storyApiResponse = await res.json();
          } catch {}
        } else if (url.includes("/api/post/item_list")) {
          try {
            const text = await res.text();
            if (text.length > 0) postApiResponse = JSON.parse(text);
          } catch {}
        }
      };

      page.on("response", responseHandler);

      let currentData = null;
      let navError = null;

      try {
        await page.goto(accountUrl, {
          waitUntil: "domcontentloaded",
          timeout: config.settings?.timeoutMs || 45000
        });
        await page.waitForTimeout(config.settings?.waitTimeAfterLoadMs || 4000);

        currentData = await extractProfileData(page, username);
      } catch (err) {
        navError = err.message;
        console.error(`❌ Gagal memuat @${username}: ${err.message}`);
      } finally {
        page.off("response", responseHandler);
      }

      if (!currentData || !currentData.username) {
        console.warn(`⚠️ Data profil @${username} tidak lengkap didapatkan. Melanjutkan ke akun berikutnya.`);
        results.push({ username, success: false, error: navError || "Data tidak ditemukan" });
        continue;
      }

      const prevState = latestStates[username];
      const comparison = compareAccountState(prevState, currentData);
      const timestamp = new Date().toISOString();
      const fileTimestamp = getFormattedTimestamp();

      // Process and screenshot stories
      const activeStories = await processStories(context, username, storyApiResponse, dirs, history, prevState);
      currentData.activeStories = activeStories;

      // Handle authenticated post items if available
      if (postApiResponse?.itemList && postApiResponse.itemList.length > 0) {
        currentData.recentVideos = postApiResponse.itemList.slice(0, 10).map((v) => ({
          id: v.id,
          desc: v.desc,
          createTime: v.createTime,
          stats: v.stats,
          url: `https://www.tiktok.com/@${username}/video/${v.id}`
        }));
      } else if (prevState?.recentVideos) {
        currentData.recentVideos = prevState.recentVideos;
      }

      let screenshotPath = null;
      let relativeScreenshotPath = null;

      if (comparison.isInitial) {
        // First time recording this account
        console.log(`✨ [INITIAL BASELINE] Akun @${username} pertama kali dicatat!`);
        console.log(`   - Nickname : ${currentData.nickname}`);
        console.log(`   - Bio      : "${currentData.bio}"`);
        console.log(`   - Posts    : ${currentData.stats.videoCount} video`);
        console.log(`   - Followers: ${currentData.stats.followerCount} | Following: ${currentData.stats.followingCount} | Likes: ${currentData.stats.heartCount}`);
        console.log(`   - Stories  : ${activeStories.length} story aktif`);

        const filename = `${fileTimestamp}_baseline.png`;
        screenshotPath = path.join(dirs.profileDir, filename);
        relativeScreenshotPath = `screenshots/@${username}/profile/${filename}`;

        await takeCleanScreenshot(page, screenshotPath);
        console.log(`📸 Screenshot baseline profil disimpan: ${relativeScreenshotPath}`);

        // Record history event
        const historyEvent = {
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp,
          username,
          eventType: "INITIAL_BASELINE",
          summary: "Profil pertama kali dicatat dalam database pemantauan.",
          snapshot: currentData,
          screenshot: relativeScreenshotPath
        };
        history.push(historyEvent);

        currentData.lastCheckedAt = timestamp;
        currentData.lastBaselineScreenshot = relativeScreenshotPath;
        latestStates[username] = currentData;

        results.push({ username, success: true, isInitial: true, changesCount: 0, screenshot: relativeScreenshotPath });
      } else if (comparison.changes.length > 0) {
        // Changes detected!
        console.log(`\n🚨 [PERUBAHAN TERDETEKSI] Ditemukan ${comparison.changes.length} perubahan pada @${username}!`);

        for (const ch of comparison.changes) {
          const diffStr = ch.diff !== undefined ? ` (${ch.diff > 0 ? "+" : ""}${ch.diff})` : "";
          console.log(`   ⚡ [${ch.label}]:`);
          console.log(`      Lama: "${ch.oldValue}"`);
          console.log(`      Baru: "${ch.newValue}"${diffStr}`);
        }

        // Take screenshot of the new profile state
        const filename = `${fileTimestamp}_change.png`;
        screenshotPath = path.join(dirs.profileDir, filename);
        relativeScreenshotPath = `screenshots/@${username}/profile/${filename}`;

        await takeCleanScreenshot(page, screenshotPath);
        console.log(`📸 Screenshot profil perubahan disimpan: ${relativeScreenshotPath}`);

        // Record each change in history
        const historyEvent = {
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp,
          username,
          eventType: "PROFILE_CHANGED",
          summary: `${comparison.changes.length} perubahan terdeteksi (${comparison.changes.map((c) => c.label).join(", ")})`,
          changes: comparison.changes,
          screenshot: relativeScreenshotPath,
          snapshot: currentData
        };
        history.push(historyEvent);

        currentData.lastCheckedAt = timestamp;
        currentData.lastChangeAt = timestamp;
        currentData.lastChangeScreenshot = relativeScreenshotPath;
        latestStates[username] = currentData;

        results.push({ username, success: true, isInitial: false, changes: comparison.changes, screenshot: relativeScreenshotPath });
      } else {
        // No profile change
        console.log(`✅ [TIDAK ADA PERUBAHAN PROFIL] Profil @${username} sama dengan catatan sebelumnya.`);
        console.log(`   - Posts: ${currentData.stats.videoCount} | Followers: ${currentData.stats.followerCount} | Likes: ${currentData.stats.heartCount}`);
        console.log(`   - Stories aktif: ${activeStories.length}`);

        currentData.lastCheckedAt = timestamp;
        // Keep prior screenshots and dates
        if (prevState) {
          currentData.lastBaselineScreenshot = prevState.lastBaselineScreenshot;
          currentData.lastChangeScreenshot = prevState.lastChangeScreenshot;
          currentData.lastChangeAt = prevState.lastChangeAt;
        }
        latestStates[username] = currentData;

        results.push({ username, success: true, isInitial: false, changesCount: 0 });
      }
    }

    // Save updated states and history
    await saveLatestState(latestStates);
    await saveHistory(history);

    console.log(`\n============================================================`);
    console.log(`🎉 Pengecekan selesai! Data disimpan ke data/latest-state.json & data/history.json`);
    console.log(`============================================================\n`);
  } finally {
    await context.close();
  }

  return { results, timestamp: new Date().toISOString() };
}
