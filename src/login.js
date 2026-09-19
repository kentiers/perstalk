import { createBrowserContext, loadConfig } from "./checker.js";

export async function openLoginBrowser() {
  console.log(`\n============================================================`);
  console.log(`🌐 [TIKTOK SESSION LOGIN HELPER]`);
  console.log(`============================================================`);
  console.log(`Membuka browser Google Chrome untuk login...`);
  console.log(`Session login dan cookie akan disimpan otomatis di:`);
  console.log(`  -> data/browser-session/`);
  console.log(`\nSilakan login ke TikTok di jendela browser yang terbuka.`);
  console.log(`Setelah selesai login atau verifikasi captcha, Anda dapat menutup jendela browser`);
  console.log(`atau tekan Ctrl+C di terminal ini.\n`);

  const config = await loadConfig();
  const context = await createBrowserContext(config, true); // headful = true

  const page = context.pages()[0] || (await context.newPage());
  await page.goto("https://www.tiktok.com/login", { waitUntil: "domcontentloaded" });

  // Keep browser alive until user closes it
  page.on("close", async () => {
    console.log(`\n🔒 Jendela browser ditutup. Session telah tersimpan.`);
    await context.close().catch(() => {});
    process.exit(0);
  });

  // Also catch context close
  context.on("close", () => {
    console.log(`\n🔒 Browser context selesai ditutup.`);
    process.exit(0);
  });
}
