import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { checkAllAccounts } from "./checker.js";
import { generateChangelog, generateHtmlReport } from "./reporter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const TASK_NAME = "TikTokStalkerDailyCheck";

// Setup Windows Task Scheduler
export function setupWindowsSchedule(time = "08:00") {
  const nodeExe = process.execPath;
  const scriptPath = path.join(ROOT_DIR, "src", "index.js");
  const command = `"${nodeExe}" "${scriptPath}" check`;

  console.log(`\n📅 Mendaftarkan task otomatis ke Windows Task Scheduler...`);
  console.log(`   Nama Task: ${TASK_NAME}`);
  console.log(`   Jadwal   : Setiap hari pukul ${time}`);
  console.log(`   Perintah : ${command}`);

  try {
    const cmd = `schtasks /Create /SC DAILY /TN "${TASK_NAME}" /TR "${command}" /ST ${time} /F`;
    execSync(cmd, { stdio: "inherit" });
    console.log(`\n✅ BERHASIL! Windows Task Scheduler telah dibuat.`);
    console.log(`   Tools ini akan berjalan otomatis setiap hari pada jam ${time} tanpa perlu membuka terminal.`);
  } catch (err) {
    console.error(`\n❌ Gagal mendaftarkan ke Windows Task Scheduler: ${err.message}`);
    console.log(`💡 Tips: Jalankan Command Prompt / Terminal sebagai Administrator jika diperlukan akses elevasi.`);
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
    console.log(`   Gunakan 'node src/index.js schedule [HH:mm]' untuk mendaftarkan jadwal.`);
  }
}

// In-process Daemon / Watcher mode
export async function startWatcher(intervalHours = 24) {
  console.log(`\n⏱️ [WATCH MODE DIAKTIFKAN]`);
  console.log(`   Pengecekan akan berjalan otomatis setiap ${intervalHours} jam.`);
  console.log(`   Tekan Ctrl+C untuk berhenti.\n`);

  const runCycle = async () => {
    try {
      await checkAllAccounts();
      await generateChangelog();
      await generateHtmlReport();
    } catch (err) {
      console.error(`[WATCH ERROR] Kesalahan saat pengecekan:`, err);
    }
  };

  // Run first check right away
  await runCycle();

  // Schedule intervals
  const intervalMs = intervalHours * 60 * 60 * 1000;
  setInterval(runCycle, intervalMs);
}
