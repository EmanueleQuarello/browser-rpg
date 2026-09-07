import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
desktop.on("pageerror", (e) => logs.push("pageerror " + e.message));
desktop.on("console", (m) => {
  if (m.type() === "error") logs.push("console " + m.text());
});

await desktop.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await desktop.getByRole("heading", { name: "Browser RPG" }).waitFor();
await desktop.screenshot({ path: "/tmp/brpg-landing.png" });

await desktop.getByRole("link", { name: "Accedi" }).first().click();
await desktop.waitForURL("**/login");
await desktop.getByRole("button", { name: "Accedi" }).click();
await desktop.waitForURL("**/hub");
await desktop.screenshot({ path: "/tmp/brpg-hub.png" });

await desktop.goto("http://localhost:5173/play/demo");
await desktop.waitForTimeout(1500);
const canvas = await desktop.locator("canvas").first();
await canvas.waitFor({ timeout: 10000 });
await desktop.screenshot({ path: "/tmp/brpg-play.png" });

const continueBtn = desktop.getByRole("button", { name: "Continua" });
if (await continueBtn.count()) await continueBtn.click();
await desktop.waitForTimeout(400);

const box = await canvas.boundingBox();
if (!box) throw new Error("no canvas box");
await desktop.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.55);
await desktop.waitForTimeout(800);
await desktop.screenshot({ path: "/tmp/brpg-play-moved.png" });

await desktop.goto("http://localhost:5173/hub");
await desktop.getByRole("button", { name: "Nuova avventura" }).click();
await desktop.waitForURL("**/editor/**");
await desktop.waitForTimeout(800);
await desktop.screenshot({ path: "/tmp/brpg-editor.png" });

await desktop.setViewportSize({ width: 390, height: 844 });
await desktop.goto("http://localhost:5173/play/demo");
await desktop.waitForTimeout(2000);
await desktop.locator("canvas").first().waitFor({ timeout: 15000 });
if (await desktop.getByRole("button", { name: /Continua|Continue/ }).count()) {
  await desktop.getByRole("button", { name: /Continua|Continue/ }).click();
}
await desktop.screenshot({ path: "/tmp/brpg-mobile.png" });

await browser.close();
writeFileSync("/tmp/brpg-logs.txt", logs.join("\n"));
console.log("SMOKE_OK", logs);
