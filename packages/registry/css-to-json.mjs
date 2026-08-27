/**
 * 把 @layer components { ... } 这段 CSS 转成 registry-item.json 的 css 字段。
 *
 * 为什么要转：registry 的 css 字段是 JSON 形态的 CSS。如果手抄一份，
 * 它一定会和 bridge/auto.css 漂移——改了 CSS 忘了同步 registry，
 * 用户 shadcn add 拿到的就是旧规则，而且不会报错。
 *
 * 支持的语法子集（正好是 auto.css 用到的）：选择器 / 声明 / 一层 & 嵌套。
 * 遇到不认识的结构就抛错，宁可构建失败也不要静默产出错的 JSON。
 */
export function cssBlockToJson(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "")
  let i = 0

  function skipWs() { while (i < src.length && /\s/.test(src[i])) i++ }

  function parseBlock() {
    const node = {}
    skipWs()
    while (i < src.length && src[i] !== "}") {
      // 读到 { 或 ; 为止
      let start = i
      while (i < src.length && src[i] !== "{" && src[i] !== ";" && src[i] !== "}") i++

      if (src[i] === "{") {
        const selector = src.slice(start, i).trim().replace(/\s+/g, " ")
        i++ // 吃掉 {
        const child = parseBlock()
        if (src[i] !== "}") throw new Error(`未闭合的块: ${selector}`)
        i++ // 吃掉 }
        // 同名选择器合并，不覆盖
        node[selector] = { ...(node[selector] || {}), ...child }
      } else if (src[i] === ";") {
        const decl = src.slice(start, i).trim()
        i++
        const c = decl.indexOf(":")
        if (c > 0) node[decl.slice(0, c).trim()] = decl.slice(c + 1).trim().replace(/\s+/g, " ")
      } else {
        // 到了块尾，可能是最后一条没有分号的声明
        const decl = src.slice(start, i).trim()
        if (decl) {
          const c = decl.indexOf(":")
          if (c > 0) node[decl.slice(0, c).trim()] = decl.slice(c + 1).trim().replace(/\s+/g, " ")
        }
        break
      }
      skipWs()
    }
    return node
  }

  const root = parseBlock()
  if (i < src.length && src[i] === "}") throw new Error("多余的 }")
  return root
}

/** 取出 `@layer components { ... }` 的内容并转成 JSON */
export function extractLayer(css, layerName = "components") {
  const marker = `@layer ${layerName}`
  const at = css.indexOf(marker)
  if (at === -1) throw new Error(`找不到 ${marker}`)
  const open = css.indexOf("{", at)
  // 找配对的 }
  let depth = 0
  let end = -1
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
  for (let k = open; k < stripped.length; k++) {
    if (stripped[k] === "{") depth++
    else if (stripped[k] === "}") { depth--; if (depth === 0) { end = k; break } }
  }
  if (end === -1) throw new Error(`${marker} 未闭合`)
  return cssBlockToJson(css.slice(open + 1, end))
}
