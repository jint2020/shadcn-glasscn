import * as React from "react"

/**
 * useGlassReveal —— 滚动揭示的兜底。
 *
 * 视觉本身在 CSS 里（primitives/reveal.css）：卡片从下方 24px 处
 * 带着 8px 模糊浮入。支持 `animation-timeline: view()` 的浏览器
 * 已经由纯 CSS 接管，这个 hook 会检测到并直接不干活。
 *
 * 只有不支持的浏览器才走 IntersectionObserver 这条路，
 * 给元素加 .is-revealed。所以它是渐进增强，不是必需品 ——
 * 不装这个 hook，新浏览器照样有揭示动效，老浏览器元素直接可见。
 */
export function useGlassReveal({
  selector = ".glass-reveal",
  threshold = 0.12,
  once = true,
}: { selector?: string; threshold?: number; once?: boolean } = {}) {
  React.useEffect(() => {
    if (typeof window === "undefined") return

    // 纯 CSS 那条已经接管，不重复干活
    if (CSS.supports?.("animation-timeline: view()")) return

    // 用户要求减少动效时，CSS 已经把元素设成立即可见，这里也不必观察
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const els = Array.from(document.querySelectorAll<HTMLElement>(selector))
    if (!els.length) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            if (!once) entry.target.classList.remove("is-revealed")
            continue
          }
          entry.target.classList.add("is-revealed")
          if (once) io.unobserve(entry.target)
        }
      },
      { threshold }
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [selector, threshold, once])
}
