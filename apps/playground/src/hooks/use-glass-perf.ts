import * as React from "react"

/**
 * useGlassPerf —— 帧率探测，掉帧时自动整站降级。
 *
 * backdrop-filter 是逐帧重绘的合成层。低端安卓、长列表、虚拟滚动里
 * 很容易从 60fps 掉到 20fps。这个 hook 采样若干帧，低于阈值就在
 * <html> 上挂 data-glass-perf="lite"，整棵子树退回纯色 + 阴影，
 * 布局完全不变，只是没有折射。
 *
 * 唯一一处 JS。不用也完全可以——纯 CSS 那套照常工作。
 */
export function useGlassPerf({
  threshold = 45,
  samples = 60,
  enabled = true,
}: { threshold?: number; samples?: number; enabled?: boolean } = {}) {
  const [lite, setLite] = React.useState(false)

  React.useEffect(() => {
    if (!enabled) return
    if (typeof window === "undefined") return

    // 用户已经明确要求减少动效/透明度时，不必再测——直接降级由 CSS 处理
    if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return

    let frames = 0
    let raf = 0
    const start = performance.now()

    const tick = () => {
      frames += 1
      if (frames < samples) {
        raf = requestAnimationFrame(tick)
        return
      }
      const fps = (frames * 1000) / (performance.now() - start)
      if (fps < threshold) {
        document.documentElement.dataset.glassPerf = "lite"
        setLite(true)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [threshold, samples, enabled])

  return lite
}
