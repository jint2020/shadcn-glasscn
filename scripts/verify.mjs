/**
 * 断言式验证：跑真实浏览器，检查规范里那些"看着对但实际错"的地方。
 *
 * 玻璃拟态特别容易骗过肉眼，这套断言挡的就是这些：
 *   · 玻璃填充悄悄带上了色调（最核心的一条规则，肉眼几乎看不出来）
 *   · 换调色的时候玻璃跟着变了颜色（说明颜色没走光斑）
 *   · 顶边高光丢失（面板会变平，但不看侧光很难发现）
 *   · 降级路径被调色的高特异性静默压掉
 *   · 对比度看着还行实际不达标
 */
import path from "node:path"
import http from "node:http"
import fs from "node:fs"
import { PNG } from "pngjs"
import { launchChromium } from "./browser.mjs"

const DIST = path.resolve(process.cwd(), "apps/playground/dist")
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" }
const srv = http.createServer((q, r) => {
  let f = path.join(DIST, q.url === "/" ? "index.html" : q.url.split("?")[0])
  if (!fs.existsSync(f)) f = path.join(DIST, "index.html")
  r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" })
  fs.createReadStream(f).pipe(r)
})
await new Promise((r) => srv.listen(4190, r))

const results = []
const check = (name, pass, detail = "") => results.push({ name, pass, detail })

const browser = await launchChromium()
const open = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, ...opts })
  const page = await ctx.newPage()
  await page.goto("http://localhost:4190")
  await page.waitForTimeout(1200)
  return page
}

/** 解析 rgb()/rgba() 成 [r,g,b,a] */
const RGB = `(s) => { const m = s.match(/[\\d.]+/g); return m ? m.map(Number) : null }`

/** CSS 时间字符串 -> 毫秒（"240ms" / ".24s" 两种形态都认） */
const ms = (s) => {
  const v = parseFloat(s)
  return s?.trim().endsWith("s") && !s.trim().endsWith("ms") ? v * 1000 : v
}

/* ===== 1. 核心规则：玻璃填充必须是白色中性 ===== */
{
  const page = await open()
  const fills = await page.evaluate(`(() => {
    const parse = ${RGB}
    const out = {}
    for (const sel of ['[data-slot="card"]', '[data-slot="input"]', '[data-slot="tabs-list"]']) {
      const el = document.querySelector(sel)
      if (el) out[sel] = parse(getComputedStyle(el).backgroundColor)
    }
    return out
  })()`)
  for (const [sel, c] of Object.entries(fills)) {
    const neutral = c && c[0] === 255 && c[1] === 255 && c[2] === 255
    check(`白色中性：${sel.replace(/\[data-slot="|"\]/g, "")} 填充无色调`,
          neutral, `rgb(${c?.slice(0, 3).join(" ")}) a=${c?.[3] ?? 1}`)
  }

  const bf = await page.evaluate(`getComputedStyle(document.querySelector('[data-slot="card"]')).backdropFilter`)
  check("backdrop-filter 同时有 blur 和 saturate",
        /blur\(\d/.test(bf) && /saturate\(/.test(bf), bf)

  const shadow = await page.evaluate(`getComputedStyle(document.querySelector('[data-slot="card"]')).boxShadow`)
  check("顶边高光常驻（inset 白线）",
        shadow.includes("inset") && /rgba?\(255,\s*255,\s*255/.test(shadow),
        shadow.split(",").slice(0, 2).join(",").slice(0, 60) + "…")
  await page.context().close()
}

/* ===== 2. 换调色只换光斑，玻璃不动 ===== */
{
  const page = await open()
  const sample = async (id) => page.evaluate(`(() => {
    document.documentElement.dataset.glassPalette = ${JSON.stringify(id)}
    const parse = ${RGB}
    const card = document.querySelector('[data-slot="card"]')
    const root = getComputedStyle(document.documentElement)
    return {
      fill: getComputedStyle(card).backgroundColor,
      blob: root.getPropertyValue("--glass-blob-1").trim(),
      bg: root.getPropertyValue("--glass-bg-base").trim(),
    }
  })()`)

  const dark = ["ember-slate", "ocean-frost", "soft-bloom", "warm-sunset", "emerald-mist"]
  const shots = []
  for (const id of dark) { shots.push({ id, ...(await sample(id)) }) }

  const fillsIdentical = new Set(shots.map((s) => s.fill)).size === 1
  const blobsAllDiffer = new Set(shots.map((s) => s.blob)).size === dark.length
  check("五套暗色调色的玻璃填充完全一致", fillsIdentical, shots[0].fill)
  check("五套暗色调色的光斑各不相同", blobsAllDiffer,
        shots.map((s) => s.blob).join(" "))

  const light = await sample("liquid-light")
  const lp = light.fill.match(/[\d.]+/g).map(Number)
  check("浅色调色的玻璃仍是白色中性（只是更实）",
        lp[0] === 255 && lp[1] === 255 && lp[2] === 255 && lp[3] > 0.3,
        light.fill)
  await page.context().close()
}

/* ===== 3. 高度阶梯与形状 ===== */
{
  const page = await open()
  const tiers = await page.evaluate(`(() => {
    const px = (v) => {
      const probe = document.createElement("div")
      probe.style.width = "var(" + v + ")"
      document.documentElement.appendChild(probe)
      const w = parseFloat(getComputedStyle(probe).width)
      probe.remove()
      return w
    }
    const blurOf = (sel) => {
      const el = document.querySelector(sel)
      const m = el && getComputedStyle(el).backdropFilter.match(/blur\\(([\\d.]+)px\\)/)
      return m ? parseFloat(m[1]) : null
    }
    return {
      flat: px("--glass-blur-flat"), raised: px("--glass-blur-raised"),
      overlay: px("--glass-blur-overlay"), modal: px("--glass-blur-modal"),
      card: blurOf('[data-slot="card"]'), input: blurOf('[data-slot="input"]'),
    }
  })()`)
  check("四档模糊严格递增",
        tiers.flat < tiers.raised && tiers.raised < tiers.overlay && tiers.overlay < tiers.modal,
        `${tiers.flat} < ${tiers.raised} < ${tiers.overlay} < ${tiers.modal}`)
  check("Card 落在 raised 档", tiers.card === tiers.raised, `${tiers.card}px`)
  check("Input 落在 flat 档", tiers.input === tiers.flat, `${tiers.input}px`)

  const radii = await page.evaluate(`(() => {
    const r = (sel) => {
      const el = document.querySelector(sel)
      return el ? parseFloat(getComputedStyle(el).borderRadius) : null
    }
    return { button: r('[data-slot="button"]'), input: r('[data-slot="input"]'),
             badge: r('[data-slot="badge"]'), textarea: r('[data-slot="textarea"]'),
             card: r('[data-slot="card"]') }
  })()`)
  const isPill = (v, h = 40) => v >= h / 2
  check("按钮 / 输入框 / 徽章是药丸",
        isPill(radii.button) && isPill(radii.input) && isPill(radii.badge),
        `btn=${radii.button} input=${radii.input} badge=${radii.badge}`)
  check("多行输入不做药丸（文本会贴圆弧）",
        radii.textarea < 40 && radii.textarea >= 16, `${radii.textarea}px`)
  check("卡片是 20px 圆角", radii.card === 20, `${radii.card}px`)
  await page.context().close()
}

/* ===== 4. 主按钮是实心，不是玻璃 ===== */
{
  const page = await open()
  const btns = await page.evaluate(`(() => {
    const parse = ${RGB}
    const primary = document.querySelector('[data-slot="button"][data-variant="default"]:not(:disabled)')
    const outline = document.querySelector('[data-slot="button"][data-variant="outline"]')
    const disabled = document.querySelector('[data-slot="button"]:disabled')
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--glass-accent").trim()
    return {
      primaryBf: getComputedStyle(primary).backdropFilter,
      primaryBg: parse(getComputedStyle(primary).backgroundColor),
      outlineBf: getComputedStyle(outline).backdropFilter,
      disabledBg: parse(getComputedStyle(disabled).backgroundColor),
      accent,
    }
  })()`)
  check("主按钮没有 backdrop-filter（实心，不是玻璃）",
        btns.primaryBf === "none", btns.primaryBf)
  check("主按钮是不透明强调色",
        (btns.primaryBg[3] ?? 1) === 1 && btns.primaryBg[0] > 100, `rgb(${btns.primaryBg.slice(0,3).join(" ")})`)
  check("次级按钮是玻璃", /blur\(\d/.test(btns.outlineBf), btns.outlineBf)
  check("禁用按钮已褪成玻璃（不再是醒目强调色）",
        (btns.disabledBg[3] ?? 1) < 0.2, `a=${btns.disabledBg[3]}`)
  await page.context().close()
}

/* ===== 5. 模糊层最多三层 ===== */
{
  const page = await open()
  const nested = await page.evaluate(`(() => {
    const el = document.querySelector('[data-slot="card"] [data-slot="card"]')
    return el ? getComputedStyle(el).backdropFilter : "NOT_FOUND"
  })()`)
  check("嵌套保护：内层卡片不再二次模糊", nested === "none", nested)
  await page.context().close()
}

/* ===== 5.5 缓动纪律与浮层物化 ===== */
/* Apple「流体界面」：默认 UI 阻尼 1.0 不过冲，bounce 只属于动量交互。
   过冲曲线（1.56）曾整站当 house easing 用，这里守住不让它回来。 */
{
  const page = await open()
  const motion = await page.evaluate(`(() => {
    const root = getComputedStyle(document.documentElement)
    const card = document.querySelector('[data-slot="card"]')
    return {
      ease: root.getPropertyValue("--glass-ease").trim(),
      spring: root.getPropertyValue("--glass-ease-spring").trim(),
      duration: root.getPropertyValue("--glass-duration").trim(),
      color: root.getPropertyValue("--glass-duration-color").trim(),
      cardTransition: getComputedStyle(card).transitionTimingFunction,
    }
  })()`)
  check("house easing 是阻尼 1.0（无过冲 1.56）",
        !motion.ease.includes("1.56"), motion.ease)
  check("过冲曲线只挂在 --glass-ease-spring（动量专用）",
        motion.spring.includes("1.56"), motion.spring)
  check("位移 240ms / 颜色 150ms，颜色快一拍",
        ms(motion.duration) === 240 && ms(motion.color) === 150,
        `${motion.duration} / ${motion.color}`)
  check("卡片过渡没有过冲曲线",
        !motion.cardTransition.includes("1.56"), motion.cardTransition.slice(0, 40))

  /* 浮层物化：改为 keyframes（Radix Presence 只认 animationName，
     transition 版退场会被瞬间卸载）。验证方式：open 态必须挂着
     glass-pop-in 这条动画 -- 挂不上说明物化层丢了 */
  const menuAnim = await page.evaluate(`(() => {
    const probe = document.createElement("div")
    probe.setAttribute("data-slot", "popover-content")
    probe.dataset.state = "open"
    probe.style.display = "none"
    document.body.appendChild(probe)
    const name = getComputedStyle(probe).animationName
    probe.remove()
    return name
  })()`)
  check("浮层物化入场动画挂载（glass-pop-in）",
        menuAnim === "glass-pop-in", menuAnim)
  await page.context().close()
}

/* ===== 6. 对比度：采真实渲染像素 ===== */
/* 玻璃是合成出来的，computed style 拿到的是半透明源色，量不出真实值。 */
{
  const page = await open()
  const lum = (r, g, b) => {
    const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const measure = async (selector, label, min = 4.5) => {
    const el = page.locator(selector).first()
    if (!(await el.count())) { check(`对比度：${label}`, false, "元素未找到"); return }

    // 单独滚进视口并等揭示动画走完。不等的话测到的是 opacity 中途的状态，
    // 会得出一个假的低对比度 —— 之前 Alert 正文测出 2.29:1 就是这么来的。
    await el.scrollIntoViewIfNeeded()
    await page.waitForTimeout(700)
    const opacity = await el.evaluate((n) => {
      let cur = n, min = 1
      while (cur && cur !== document.documentElement) {
        min = Math.min(min, parseFloat(getComputedStyle(cur).opacity))
        cur = cur.parentElement
      }
      return min
    })
    if (opacity < 0.99) {
      check(`对比度（实测像素）：${label} ≥ ${min}`, false,
            `元素仍在揭示动画中（opacity ${opacity.toFixed(2)}），测量无意义`)
      return
    }

    const png = PNG.sync.read(await el.screenshot())
    let lo = 1, hi = 0
    for (let i = 0; i < png.data.length; i += 4) {
      const L = lum(png.data[i], png.data[i + 1], png.data[i + 2])
      if (L < lo) lo = L
      if (L > hi) hi = L
    }
    const ratio = (hi + 0.05) / (lo + 0.05)
    check(`对比度（实测像素）：${label} ≥ ${min}`, ratio >= min, ratio.toFixed(2) + ":1")
  }
  await measure('[data-slot="card-title"]', "卡片标题")
  await measure('[data-slot="card-description"]', "卡片副文")
  await measure('[data-slot="alert-description"]', "Alert 正文")
  await page.context().close()
}

/* ===== 7. 降级路径 ===== */
{
  const page = await open({ contrast: "more" })
  const v = await page.evaluate(`(() => {
    const root = getComputedStyle(document.documentElement)
    const parse = ${RGB}
    return {
      border: root.getPropertyValue("--glass-border-alpha").trim(),
      shimmer: root.getPropertyValue("--glass-shimmer-alpha").trim(),
      cardBg: parse(getComputedStyle(document.querySelector('[data-slot="card"]')).backgroundColor),
    }
  })()`)
  check("高对比：描边显著加强", parseFloat(v.border) >= 0.5, v.border)
  check("高对比：微光关闭", parseFloat(v.shimmer) === 0, v.shimmer)
  check("高对比：面板退到近不透明实底", (v.cardBg[3] ?? 1) >= 0.9, `a=${v.cardBg[3]}`)
  await page.context().close()
}
{
  const page = await open({ reducedMotion: "reduce" })
  const v = await page.evaluate(`(() => {
    const root = getComputedStyle(document.documentElement)
    const reveal = document.querySelector(".glass-reveal")
    return {
      lift: root.getPropertyValue("--glass-lift").trim(),
      revealOpacity: reveal ? getComputedStyle(reveal).opacity : "n/a",
      blobAnim: getComputedStyle(document.querySelector(".glass-backdrop"), "::before").animationName,
    }
  })()`)
  check("减少动效：hover 位移归零", v.lift === "0px", v.lift)
  check("减少动效：揭示元素立即可见", v.revealOpacity === "1", v.revealOpacity)
  check("减少动效：光斑停止漂移但保留颜色",
        v.blobAnim === "none" || v.blobAnim === "", v.blobAnim || "none")
  await page.context().close()
}
{
  const page = await open()
  const before = await page.evaluate(`getComputedStyle(document.querySelector('[data-slot="card"]')).backdropFilter`)
  const after = await page.evaluate(`(() => {
    document.documentElement.dataset.glassPalette = "ocean-frost"
    document.documentElement.dataset.glassPerf = "lite"
    return getComputedStyle(document.querySelector('[data-slot="card"]')).backdropFilter
  })()`)
  check("性能降级关掉 backdrop-filter", after === "none", `${before.slice(0, 18)}… → ${after}`)
  check("优先级：调色 + 降级同时开启时降级赢", after === "none", after)
  await page.context().close()
}

/* ===== 8. 可覆写性 ===== */
{
  const page = await open()
  const layer = await page.evaluate(`(() => {
    let found = null
    const walk = (rules, name) => {
      for (const r of rules) {
        if (r.constructor.name === "CSSLayerBlockRule") { walk(r.cssRules, r.name); continue }
        if (r.selectorText?.includes('[data-slot="card"]') && r.style?.backdropFilter) found = name ?? "(unlayered)"
        if (r.cssRules) walk(r.cssRules, name)
      }
    }
    for (const s of document.styleSheets) { try { walk(s.cssRules, null) } catch {} }
    return found
  })()`)
  check("auto 层落在 @layer components（工具类永远赢）", layer === "components", String(layer))
  await page.context().close()
}

/* ===== 9. 打印：揭示元素必须可见 ===== */
/* 打印不产生滚动，scroll-driven 动画停在起点 —— 不处理就是一张白纸。 */
{
  const page = await open()
  await page.emulateMedia({ media: "print" })
  await page.waitForTimeout(400)
  const opacities = await page.evaluate(`
    Array.from(document.querySelectorAll(".glass-reveal"))
      .map((el) => getComputedStyle(el).opacity)
  `)
  const allVisible = opacities.length > 0 && opacities.every((o) => o === "1")
  check("打印：所有揭示元素可见（否则整页印成白纸）",
        allVisible, `${opacities.filter((o) => o === "1").length}/${opacities.length} 可见`)
  await page.context().close()
}

await browser.close()
srv.close()

const pad = Math.max(...results.map((r) => r.name.length))
console.log("")
for (const r of results) console.log(`  ${r.pass ? "✓" : "✗"}  ${r.name.padEnd(pad)}   ${r.detail}`)
const failed = results.filter((r) => !r.pass)
console.log(`\n  ${results.length - failed.length}/${results.length} 通过`)
process.exit(failed.length ? 1 : 0)
