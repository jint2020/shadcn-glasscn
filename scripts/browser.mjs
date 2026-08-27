import fs from "node:fs"
import { chromium } from "playwright"

/**
 * 启动 Chromium。
 *
 * 沙箱镜像把浏览器预装在 /opt/pw-browsers/chromium，本地和 CI 上没有这个路径。
 * 之前这里写死了沙箱路径，换台机器 `pnpm verify` 会直接起不来——
 * 所以改成路径存在才用它，否则交给 Playwright 自己解析。
 *
 * 本地第一次跑之前需要：pnpm exec playwright install chromium
 */
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium"

export async function launchChromium(options = {}) {
  const opts = { ...options }
  if (fs.existsSync(SANDBOX_CHROMIUM)) opts.executablePath = SANDBOX_CHROMIUM

  try {
    return await chromium.launch(opts)
  } catch (err) {
    if (String(err.message).includes("Executable doesn't exist")) {
      throw new Error(
        "找不到 Chromium。先跑一次：\n" +
        "  pnpm exec playwright install chromium\n\n" +
        "原始错误：" + err.message
      )
    }
    throw err
  }
}
