import path from "node:path"
import { mkdirSync } from "node:fs"
import http from "node:http"
import fs from "node:fs"
import { launchChromium } from "./browser.mjs"

const DIST = path.resolve(process.cwd(), "apps/playground/dist")
const MIME = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".svg":"image/svg+xml" }

const server = http.createServer((req, res) => {
  let f = path.join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0])
  if (!fs.existsSync(f)) f = path.join(DIST, "index.html")
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" })
  fs.createReadStream(f).pipe(res)
})
mkdirSync("docs/screenshots", { recursive: true })
await new Promise(r => server.listen(4173, r))

const browser = await launchChromium()
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, deviceScaleFactor: 1.5 })
await page.goto("http://localhost:4173")
// 字体是外链的，等它们落位再截，否则第一张会是 fallback 字体
await page.waitForTimeout(2500)

/**
 * 截图前先把整页滚一遍。
 *
 * 两个原因，都和 fullPage 截图的实现方式有关：
 * 1. 滚动揭示走的是 animation-timeline: view()，不滚动时间轴不推进，
 *    截出来整页 opacity: 0
 * 2. 光斑是 position: fixed 的，fullPage 只会在首屏那一段画出它们，
 *    下面全是纯底色
 *
 * 所以：先滚到底触发所有揭示，再回到目标位置截视口大小的图。
 * 视口截图本来也更诚实 —— 用户看到的就是一屏。
 */
async function primeReveals() {
  const h = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < h; y += 700) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(120)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
}
await primeReveals()

const setDensity = async (d) => {
  await page.getByRole("tab", { name: d, exact: true }).click()
  await page.waitForTimeout(700)
}

await page.screenshot({ path: "docs/screenshots/theme-unified.jpg", quality: 86 })
console.log("shot: theme-unified")

// 组件区：滚到基础层那一段，截一屏
await page.evaluate(() => {
  const h = Array.from(document.querySelectorAll("h2")).find((e) => e.textContent?.includes("基础层"))
  h?.scrollIntoView({ block: "start" })
  window.scrollBy(0, -90)
})
await page.waitForTimeout(900)
await page.screenshot({ path: "docs/screenshots/components-base.jpg", quality: 86 })
console.log("shot: components-base")

await page.evaluate(() => {
  const h = Array.from(document.querySelectorAll("h2")).find((e) => e.textContent?.includes("表单类"))
  h?.scrollIntoView({ block: "start" })
  window.scrollBy(0, -90)
})
await page.waitForTimeout(900)
await page.screenshot({ path: "docs/screenshots/components-form.jpg", quality: 86 })
console.log("shot: components-form")

await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(600)

// 通透度三档，只截首屏做对照
for (const d of ["sheer", "heavy"]) {
  await setDensity(d)
  await page.screenshot({ path: `docs/screenshots/density-${d}.jpg`, quality: 86 })
  console.log("shot: density", d)
}
await setDensity("frosted")

// 浮层
await page.getByRole("button", { name: "打开 Dialog" }).click()
await page.waitForTimeout(900)
await page.screenshot({ path: "docs/screenshots/overlay-dialog.jpg", quality: 86 })
console.log("shot: dialog")
await page.keyboard.press("Escape")
await page.waitForTimeout(500)

await page.getByRole("button", { name: "账户" }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: "docs/screenshots/overlay-menu.jpg", quality: 86 })
console.log("shot: menu")
await page.keyboard.press("Escape")

await browser.close()
server.close()
