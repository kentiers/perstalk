#!/usr/bin/env node
import { checkAllAccounts, loadConfig, ensureDirs, loadLatestState } from "./checker.js";
import { generateChangelog, generateHtmlReport } from "./reporter.js";
import { setupWindowsSchedule, removeWindowsSchedule, getScheduleStatus, startWatcher } from "./scheduler.js";
import { openLoginBrowser } from "./login.js";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CONFIG_FILE = path.join(ROOT_DIR, "config", "accounts.json");

function printHelp() {
  console.log(`
============================================================
🎯 TIKTOK STALKER & HISTORICAL MONITORING TOOL
============================================================
Perintah yang tersedia:

  node src/index.js check            Lakukan pengecekan akun sekarang (Default)
  node src/index.js report           Buat laporan HTML & buka di browser
  node src/index.js watch [jam]      Jalankan pemantauan background (default: 24 jam)
  node src/index.js login            Buka Chrome interaktif untuk login/simpan cookie
  node src/index.js schedule [jam]   Daftarkan ke Windows Task Scheduler (e.g. 08:00)
  node src/index.js schedule:status  Lihat status jadwal di Windows Task Scheduler
  node src/index.js schedule:remove  Hapus jadwal dari Windows Task Scheduler
  node src/index.js add <username>   Tambah akun baru ke daftar pemantauan
  node src/index.js list             Lihat daftar akun yang dipantau
  node src/index.js help             Tampilkan bantuan ini

Contoh Penggunaan:
  node src/index.js check
  node src/index.js schedule 09:00
  node src/index.js add username_baru
============================================================
`);
}

async function handleAddAccount(username) {
  if (!username) {
    console.error("❌ Mohon masukkan username: node src/index.js add <username>");
    process.exit(1);
  }
  const cleanUser = username.replace(/^@/, "").trim();
  const config = await loadConfig();
  const exists = config.accounts.some((a) => a.username.toLowerCase() === cleanUser.toLowerCase());
  if (exists) {
    console.log(`ℹ️ Akun @${cleanUser} sudah ada di daftar pemantauan.`);
    return;
  }
  config.accounts.push({
    username: cleanUser,
    url: `https://www.tiktok.com/@${cleanUser}`,
    enabled: true
  });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  console.log(`✅ Berhasil menambahkan @${cleanUser} ke config/accounts.json`);
}

async function handleListAccounts() {
  const config = await loadConfig();
  const states = await loadLatestState();
  console.log(`\n📋 DAFTAR AKUN YANG DIPANTAU (${config.accounts.length} akun):`);
  console.log(`------------------------------------------------------------`);
  for (const acc of config.accounts) {
    const state = states[acc.username];
    const status = acc.enabled ? "Aktif" : "Non-aktif";
    const lastChecked = state?.lastCheckedAt ? new Date(state.lastCheckedAt).toLocaleString("id-ID") : "Belum pernah dicek";
    console.log(`• @${acc.username} [${status}]`);
    console.log(`  URL     : ${acc.url}`);
    if (state) {
      console.log(`  Nama    : ${state.nickname} | Bio: "${state.bio || '-'}"`);
      console.log(`  Posts   : ${state.stats?.videoCount ?? 0} | Followers: ${state.stats?.followerCount ?? 0} | Likes: ${state.stats?.heartCount ?? 0}`);
    }
    console.log(`  Dicek   : ${lastChecked}\n`);
  }
}

async function handleReport(openBrowser = true) {
  console.log(`\n📊 Menghasilkan laporan terbaru...`);
  const changelogPath = await generateChangelog();
  const htmlPath = await generateHtmlReport();
  console.log(`✅ CHANGELOG.md diperbarui: ${changelogPath}`);
  console.log(`✅ report.html diperbarui : ${htmlPath}`);

  if (openBrowser) {
    console.log(`🌐 Membuka report.html di web browser default...`);
    exec(`start "" "${htmlPath}"`, () => {});
  }
}

async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0] || "check";

  await ensureDirs();

  switch (command.toLowerCase()) {
    case "check":
    case "run": {
      const headful = args.includes("--headful");
      const shouldPush = args.includes("--push");
      await checkAllAccounts({ headful });
      await generateChangelog();
      await generateHtmlReport();
      if (shouldPush) {
        const { syncToGit } = await import("./scheduler.js");
        syncToGit();
      }
      break;
    }

    case "report":
      await handleReport(true);
      break;

    case "watch": {
      const interval = parseFloat(args[1]) || 6;
      await startWatcher(interval);
      break;
    }

    case "login":
      await openLoginBrowser();
      break;

    case "schedule": {
      const param = args[1] || "6";
      setupWindowsSchedule(param);
      break;
    }

    case "schedule:status":
      getScheduleStatus();
      break;

    case "schedule:remove":
    case "unschedule":
      removeWindowsSchedule();
      break;

    case "add":
      await handleAddAccount(args[1]);
      break;

    case "list":
      await handleListAccounts();
      break;
    case "push":
    case "sync": {
      console.log("\n📦 Menyinkronkan data dan screenshot ke GitHub...");
      try {
        const { execSync } = await import("child_process");
        execSync("git add data/ screenshots/ CHANGELOG.md report.html index.html", { stdio: "inherit" });
        try {
          execSync('git commit -m "Update TikTok tracking data [skip ci]"', { stdio: "inherit" });
        } catch {
          console.log("ℹ️ Tidak ada data baru untuk di-commit.");
        }
        execSync("git push", { stdio: "inherit" });
        console.log("✅ Berhasil di-push ke GitHub! Halaman publik akan segera ter-update.");
      } catch (err) {
        console.error("❌ Gagal push ke GitHub:", err.message);
      }
      break;
    }

    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;

    default:
      console.error(`❌ Perintah tidak dikenal: "${command}"`);
      printHelp();
      process.exit(1);
  }
}

runCli().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
