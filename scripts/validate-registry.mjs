/**
 * 校验生成的 registry.json：结构完整，且没有破坏这套设计的核心不变量。
 *
 * CI 在 `pnpm registry:build` 之后跑这一步；本地随时可以直接
 *   node scripts/validate-registry.mjs
 *
 * 阈值都是"地板"——往 CSS 里加变量只会让数字变大，不会误报。
 * 如果哪天你**故意**精简了 token 体系，记得同步调低这里的常量，否则会拦着不让合。
 */
import fs from "node:fs"
import path from "node:path"

const file = path.resolve(process.cwd(), "registry.json")
const raw = fs.readFileSync(file, "utf8")
const reg = JSON.parse(raw)

const errors = []
const fail = (msg) => errors.push(msg)

const theme = reg.items?.find((i) => i.name === "glass-theme")
if (!theme) fail("找不到 glass-theme item —— registry 结构坏了")

const light = theme?.cssVars?.light ?? {}
const themeScale = theme?.cssVars?.theme ?? {}
const css = theme?.css ?? {}

/* 1. 结构完整性：CSS 选择器结构一变，生成器会静默少解析一批变量 */
if (Object.keys(light).length < 90)
  fail(`cssVars.light 只有 ${Object.keys(light).length} 个变量（期望 ≥ 90）—— 选择器结构可能变了`)
if (Object.keys(themeScale).length < 10)
  fail(`cssVars.theme 只有 ${Object.keys(themeScale).length} 个变量（期望 ≥ 10）`)
if (Object.keys(css).length < 25)
  fail(`css 顶层键只有 ${Object.keys(css).length} 个（期望 ≥ 25）—— @utility 可能没收全`)

/* 2. shadcn 自动桥必须进 registry，否则 shadcn add 装完不生效 */
if (!("@layer components" in css))
  fail("css 里没有 @layer components —— shadcn 自动桥没进 registry")

/* 3. 最核心的一条规则：玻璃填充是白色中性，绝不带色调 */
if (light["glass-white"] !== "255 255 255")
  fail(`glass-white = ${JSON.stringify(light["glass-white"])}（必须是 "255 255 255"）`)

const colorish = /#|rgb|hsl|oklch|oklab|lab\(|lch\(|\bcolor\(/i
for (const [k, v] of Object.entries(light)) {
  if (!k.startsWith("glass-fill")) continue
  if (colorish.test(String(v)))
    fail(`${k} = ${JSON.stringify(v)} 带上了颜色值 —— 玻璃填充必须是纯 alpha 或 var()`)
}

/* 4. 降级层必须在（走 files 字段，target 是 glass-fallback.css）—— 丢了最危险 */
if (!raw.includes("glass-fallback.css"))
  fail("registry 里没有 glass-fallback.css —— 降级层丢了")

/* 5. 本地调试的 base URL 不能发出去 */
if (raw.includes("localhost"))
  fail("registry.json 里含 localhost —— 本地调试的 base URL 忘了重置")

if (errors.length) {
  console.error("✗ registry 校验失败：")
  for (const e of errors) console.error("    " + e)
  process.exit(1)
}

console.log(
  "✓ registry 校验通过：" +
    `${Object.keys(light).length} light / ${Object.keys(themeScale).length} theme / ` +
    `${Object.keys(css).length} css 顶层键；玻璃填充无色调；降级层在位。`
)
