/**
 * 从 @glasscn/core 的 CSS 源文件生成 registry.json。
 *
 * 手写 registry.json 的问题是它会和 CSS 源码悄悄漂移——
 * 改了 tokens 忘了同步 registry，用户 shadcn add 拿到的是旧值。
 * 这里直接解析 CSS 提取变量，单一事实来源只有 CSS。
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cssBlockToJson, extractLayer } from "./css-to-json.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../..")
const CORE = path.join(ROOT, "packages/core/src")

/**
 * 从一段 CSS 里抓出指定选择器块中的自定义属性。
 * 用逐行状态机而不是正则：CSS 里有注释、嵌套、多行值，
 * 正则很容易在注释块上错位，而且错得很安静。
 */
function extractVars(css, selector) {
  const out = {}
  let depth = 0
  let inTarget = false
  let buffer = ""

  // 先去掉块注释，避免注释里的花括号影响计数
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "")

  for (const rawLine of clean.split("\n")) {
    const line = rawLine.trim()
    if (!line) continue

    if (depth === 0 && line.startsWith(selector) && line.includes("{")) {
      // 只认精确选择器，避免 ":root[data-x]" 被 ":root" 误吞
      const sel = line.slice(0, line.indexOf("{")).trim()
      inTarget = sel === selector
      depth = 1
      continue
    }

    if (depth > 0) {
      depth += (line.match(/\{/g) || []).length
      depth -= (line.match(/\}/g) || []).length
      if (depth <= 0) {
        depth = 0
        inTarget = false
        buffer = ""
        continue
      }
      if (!inTarget) continue

      buffer += " " + line
      if (!buffer.includes(";")) continue
      for (const decl of buffer.split(";")) {
        const m = decl.match(/^\s*--([a-z0-9-]+)\s*:\s*(.+)$/i)
        if (m) out[m[1]] = m[2].trim().replace(/\s+/g, " ")
      }
      buffer = buffer.endsWith(";") ? "" : ""
    }
  }
  return out
}

/**
 * 这套设计是暗色优先的：Ember & Slate 就写在 :root 里，没有 .dark 变体。
 * 浅色是 palettes/liquid-light 这一套调色，走 data-glass-palette 属性，
 * 不走 shadcn 的 .dark 类。
 *
 * 所以 cssVars 只填 light（registry 的字段名，实际内容是暗色默认值），
 * dark 留空 —— 填重复的一份只会让 shadcn CLI 写两遍同样的东西。
 */
const read = (f) => fs.readFileSync(path.join(CORE, f), "utf8")

const light = {
  ...extractVars(read("tokens/primitives.css"), ":root"),
  ...extractVars(read("tokens/palette.css"), ":root"),
  ...extractVars(read("tokens/elevation.css"), ":root"),
  ...extractVars(read("tokens/typography.css"), ":root"),
}
const dark = {}

/* shadcn 表面 token 的接管值，直接从 bridge.css 读——不手抄 */
const bridge = read("tokens/bridge.css")
const surfaceOverrides = extractVars(bridge, ":root")
const themeScale = extractVars(bridge, "@theme inline")

Object.assign(light, surfaceOverrides)

if (Object.keys(surfaceOverrides).length < 8) {
  throw new Error(
    `bridge.css 只解析出 ${Object.keys(surfaceOverrides).length} 个变量，` +
    "多半是选择器结构变了——宁可构建失败，也不要发一份缺变量的 registry。"
  )
}

/* ----------------------------------------------------------------------------
 * registry-item 的 css 字段：JSON 形态的 CSS
 * ----------------------------------------------------------------------------
 * 从真实的 CSS 源文件转换而来，不手抄。手抄一份的话，改了 CSS 忘了同步
 * registry，用户 shadcn add 拿到的就是旧规则，而且不会报错。
 * ==========================================================================*/

/** 从一个 CSS 文件里挑出顶层的 @utility / @keyframes 块 */
function pickAtRules(file) {
  const all = cssBlockToJson(fs.readFileSync(path.join(CORE, file), "utf8"))
  return Object.fromEntries(
    Object.entries(all).filter(
      ([k]) => k.startsWith("@utility") || k.startsWith("@keyframes")
    )
  )
}

const themeCss = {
  ...pickAtRules("primitives/surface.css"),
  ...pickAtRules("primitives/interaction.css"),
  ...pickAtRules("primitives/backdrop.css"),
  ...pickAtRules("primitives/reveal.css"),
  // shadcn 自动桥：靠 data-slot 就地接管现有组件，这才是"装完即生效"的关键
  "@layer components": extractLayer(
    fs.readFileSync(path.join(CORE, "bridge/auto.css"), "utf8"),
    "components"
  ),
}

/* --- 组装 --- */
const HOMEPAGE = "https://jint2020.github.io/shadcn-glasscn"

/**
 * registryDependencies 里的相对路径（"./glass-theme.json"）会被 CLI 当成
 * 消费方本地的文件去读，而不是相对 registry URL 解析——本地起服务测试时
 * 立刻就会炸。所以这里统一发绝对 URL，base 由构建时环境变量给：
 *
 *   REGISTRY_URL=http://localhost:5055/r pnpm registry:build   # 本地验证
 *   pnpm registry:build                                        # 发布
 */
const BASE = (process.env.REGISTRY_URL || `${HOMEPAGE}/r`).replace(/\/$/, "")
const ref = (name) => `${BASE}/${name}.json`

const coreFiles = [
  "tokens/primitives.css",
  "tokens/palette.css",
  "tokens/elevation.css",
  "tokens/typography.css",
  "tokens/bridge.css",
  "primitives/surface.css",
  "primitives/interaction.css",
  "primitives/backdrop.css",
  "primitives/reveal.css",
  "primitives/fallback.css",
  "bridge/auto.css",
  "index.css",
]

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "glasscn",
  homepage: HOMEPAGE,
  items: [
    {
      name: "glass-theme",
      type: "registry:theme",
      title: "Glass Theme",
      description:
        "Liquid Glass 主题：白色中性玻璃 + 光斑背景，接管 shadcn 的表面 token、" +
        "阴影量表与圆角。现有组件不改源码即变玻璃。暗色优先，零依赖。",
      /* theme 放阴影量表（Tailwind 的 --shadow-* 命名空间），
         light / dark 放材质与表面 token */
      cssVars: { theme: themeScale, light },
      css: themeCss,
      /**
       * 降级层单独走 files 而不是塞进 css 字段。
       * 原因：它整个是 @media / @supports 顶层规则，而且必须落在 unlayered
       * 作用域里才能压过 cssVars 写进 :root 的值。塞进 @layer 会被降权，
       * 静默失效——玻璃拟态里降级失效等于文字直接压在背景图上，不可读。
       */
      files: [
        {
          path: "packages/core/src/primitives/fallback.css",
          type: "registry:file",
          target: "~/styles/glass-fallback.css",
        },
      ],
      docs:
        "装完即生效：CLI 会把玻璃变量写进你的 globals.css，并接管 shadcn 的 " +
        "data-slot，现有组件不用重新 add。\n" +
        "· 换材质：再装 glass-presets，然后 " +
        'document.documentElement.dataset.glassPreset = "vellum"\n' +
        "· 局部关掉：任意元素加 data-glass=\"off\"\n" +
        '· 整站降级：<html data-glass-perf="lite">\n\n' +
        "⚠ 还需手动加一行（降级与无障碍，别省）：\n" +
        '   @import "./glass-fallback.css";\n' +
        "   覆盖 backdrop-filter 不支持、prefers-reduced-transparency、\n" +
        "   prefers-contrast、prefers-reduced-motion、打印、性能降级六种情况。",
    },
    {
      name: "glass-core",
      type: "registry:item",
      title: "Glass Core (vendored)",
      description:
        "把完整的玻璃 CSS 层复制进项目（不走 npm 依赖）：材质原语、高度阶梯、交互、降级、shadcn 自动桥。",
      files: coreFiles.map((f) => ({
        path: `packages/core/src/${f}`,
        type: "registry:file",
        target: `~/styles/glass/${f}`,
      })),
      docs:
        '在你的 globals.css 里，shadcn 变量之后加一行：@import "./glass/index.css";',
    },
    {
      name: "glass-palettes",
      type: "registry:item",
      title: "Glass Palettes",
      description:
        "六套调色（Ember & Slate / Ocean Frost / Soft Bloom / Warm Sunset / " +
        "Emerald Mist / Liquid Light），按 data-glass-palette 属性运行时切换。",
      files: [
        "ember-slate", "ocean-frost", "soft-bloom",
        "warm-sunset", "emerald-mist", "liquid-light", "switchable",
      ].map((n) => ({
        path: `packages/core/src/palettes/${n}.css`,
        type: "registry:file",
        target: `~/styles/glass/palettes/${n}.css`,
      })),
      docs:
        'document.documentElement.dataset.glassPalette = "ocean-frost" 即可切换。\n' +
        "换调色换的是背后的光斑和强调色 —— 玻璃填充在六套里完全一致，" +
        "永远是白色中性。这是这套设计的核心规则，别改成有色填充。",
    },
    {
      name: "use-glass-reveal",
      type: "registry:hook",
      title: "useGlassReveal",
      description:
        "滚动揭示的兜底。视觉本身在 CSS 里，支持 animation-timeline: view() 的" +
        "浏览器已由纯 CSS 接管，这个 hook 只为不支持的浏览器补 IntersectionObserver。",
      files: [
        {
          path: "packages/registry/src/ui/use-glass-reveal.ts",
          type: "registry:hook",
          target: "@hooks/use-glass-reveal.ts",
        },
      ],
      docs: "渐进增强，不装也不影响：新浏览器照样有揭示动效，老浏览器元素直接可见。",
    },
    {
      name: "use-glass-tilt",
      type: "registry:hook",
      title: "useGlassTilt",
      description:
        "鼠标移动时卡片在 perspective(900px) 里倾斜 ±9deg。Expressive 档，" +
        "一页最多三个元素 —— 每个倾斜元素都是持续更新 transform 的合成层，" +
        "叠多了会和 backdrop-filter 的重绘打架。",
      files: [
        {
          path: "packages/registry/src/ui/use-glass-tilt.ts",
          type: "registry:hook",
          target: "@hooks/use-glass-tilt.ts",
        },
      ],
      docs: "触屏和 prefers-reduced-motion 下自动不启用。",
    },
    {
      name: "use-glass-perf",
      type: "registry:hook",
      title: "useGlassPerf",
      description:
        "帧率探测：掉帧时自动给 <html> 挂 data-glass-perf=\"lite\"，整站退回纯色。整套库里唯一一处 JS。",
      files: [
        {
          path: "packages/registry/src/ui/use-glass-perf.ts",
          type: "registry:hook",
          target: "@hooks/use-glass-perf.ts",
        },
      ],
    },
  ],
}

const out = path.join(ROOT, "registry.json")
fs.writeFileSync(out, JSON.stringify(registry, null, 2) + "\n")
console.log(`registry.json 已生成：${registry.items.length} 个 item`)
console.log(`  cssVars.light: ${Object.keys(light).length} 个变量`)
console.log(`  cssVars.dark:  ${Object.keys(dark).length} 个变量`)
