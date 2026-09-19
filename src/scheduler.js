import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { checkAllAccounts, loadConfig } from "./checker.js";
import { generateChangelog, generateHtmlReport } from "./reporter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const TASK_NAME = "TikTokStalkerCheck";

// Sync latest state & screenshots to GitHub
export function syncToGit() {
  try {
    execSync("git add data/ screenshots/ CHANGELOG.md report.html index.html", { stdio: "ignore" });
    try {
      execSync('git commit -m "Auto-update TikTok tracking data [skip ci]"', { stdio: "ignore" });
    } catch {}
    execSync("git push", { stdio: "inherit" });
    console.log("🚀 [GIT SYNC] Data & laporan terbaru berhasil di-push ke GitHub Pages!");
  } catch (err) {
    console.log("ℹ️ [GIT SYNC] Tidak ada perubahan baru atau remote belum terhubung:", err.message);
  }
}

// Setup Windows Task Scheduler (Supports interval in hours e.g. 6 or specific time e.g. "08:00")
export function setupWindowsSchedule(intervalOrTime = "6") {
  const nodeExe = process.execPath;
  const scriptPath = path.join(ROOT_DIR, "src", "index.js");
  const command = `"${nodeExe}" "${scriptPath}" check --push`;

  console.log(`\n📅 Mendaftarkan task otomatis ke Windows Task Scheduler...`);
  console.log(`   Nama Task: ${TASK_NAME}`);
  console.log(`   Perintah : ${command}`);

  try {
    let cmd = "";
    if (intervalOrTime.includes(":")) {
      // Specific daily time, e.g. "08:00"
      console.log(`   Jadwal   : Setiap hari pukul ${intervalOrTime}`);
      cmd = `schtasks /Create /SC DAILY /TN "${TASK_NAME}" /TR "${command}" /ST ${intervalOrTime} /F`;
    } else {
      // Interval in hours, e.g. 6 hours
      const hours = parseInt(intervalOrTime, 10) || 6;
      console.log(`   Jadwal   : Setiap ${hours} jam sekali`);
      cmd = `schtasks /Create /SC HOURLY /MO ${hours} /TN "${TASK_NAME}" /TR "${command}" /F`;
    }

    execSync(cmd, { stdio: "inherit" });
    console.log(`\n✅ BERHASIL! Windows Task Scheduler telah aktif.`);
    console.log(`   Sistem akan berjalan di background PC Anda menggunakan koneksi internet rumah.`);
    console.log(`   Setiap selesai memeriksa, hasil akan otomatis di-push ke GitHub Pages.`);
  } catch (err) {
    console.error(`\n❌ Gagal mendaftarkan ke Windows Task Scheduler: ${err.message}`);
    console.log(`💡 Tips: Buka Terminal / CMD sebagai Administrator.`);
  }
}

// Remove Windows Task Scheduler
export function removeWindowsSchedule() {
  console.log(`\n🗑️ Menghapus task "${TASK_NAME}" dari Windows Task Scheduler...`);
  try {
    const cmd = `schtasks /Delete /TN "${TASK_NAME}" /F`;
    execSync(cmd, { stdio: "inherit" });
    console.log(`✅ BERHASIL! Task jadwal otomatis telah dihapus.`);
  } catch (err) {
    console.error(`⚠️ Task tidak ditemukan atau gagal dihapus: ${err.message}`);
  }
}

// Query Windows Task Scheduler status
export function getScheduleStatus() {
  console.log(`\n🔍 Memeriksa status task "${TASK_NAME}" di Windows Task Scheduler...`);
  try {
    const output = execSync(`schtasks /Query /TN "${TASK_NAME}" /V /FO LIST`, { encoding: "utf-8" });
    console.log(output);
  } catch {
    console.log(`ℹ️ Task "${TASK_NAME}" belum terdaftar di Windows Task Scheduler.`);
    console.log(`   Gunakan 'node src/index.js schedule 6' untuk mendaftarkan jadwal setiap 6 jam.`);
  }
}

// In-process Daemon / Watcher mode (Defaults to 6 hours)
export async function startWatcher(intervalHours = 6) {
  const config = await loadConfig();
  const hours = intervalHours || config.settings?.checkIntervalHours || 6;

  console.log(`\n⏱️ [WATCH MODE AKTIF - INTERNET RUMAH]`);
  console.log(`   Pengecekan berjalan otomatis setiap ${hours} jam.`);
  console.log(`   Tekan Ctrl+C untuk berhenti.\n`);

  const runCycle = async () => {
    try {
      await checkAllAccounts();
      await generateChangelog();
      await generateHtmlReport();

      if (config.settings?.autoGitPush) {
        syncToGit();
      }
    } catch (err) {
      console.error(`[WATCH ERROR] Kesalahan saat pengecekan:`, err);
    }
  };

  // Run first check right away
  await runCycle();

  // Schedule intervals in milliseconds
  const intervalMs = hours * 60 * 60 * 1000;
  setInterval(runCycle, intervalMs);
}
