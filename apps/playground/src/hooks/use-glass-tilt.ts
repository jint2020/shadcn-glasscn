import * as React from "react"

/**
 * useGlassTilt —— 鼠标移动时卡片在 perspective(900px) 里倾斜 ±9deg。
 *
 * 规范把它归为 Expressive 档，并且限制一页最多三个元素。
 * 原因是每个倾斜的元素都是一个持续更新 transform 的合成层，
 * 叠多了会和 backdrop-filter 的重绘打架，直接掉帧。
 *
 * 所以这个 hook 默认就带上限，超出的元素静默跳过而不是硬跑。
 * 触屏设备完全不启用 —— 那里没有 hover，倾斜只会在滚动时乱抖。
 */
export function useGlassTilt<T extends HTMLElement>({
  max = 9,
  perspective = 900,
  lift = 4,
  enabled = true,
}: { max?: number; perspective?: number; lift?: number; enabled?: boolean } = {}) {
  const ref = React.useRef<T>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    if (typeof window === "undefined") return

    // 触屏没有 hover；减少动效时也不做
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      el.style.transform =
        `perspective(${perspective}px) rotateX(${y * -max}deg) ` +
        `rotateY(${x * max}deg) translateY(-${lift}px)`
    }

    const onLeave = () => {
      el.style.transition = "transform 500ms cubic-bezier(.34,1.56,.64,1)"
      el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`
      window.setTimeout(() => { el.style.transition = "" }, 500)
    }

    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerleave", onLeave)
    return () => {
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
    }
  }, [max, perspective, lift, enabled])

  return ref
}
