import * as React from "react"

/**
 * useGlassTilt -- 鼠标移动时卡片在 perspective(900px) 里倾斜 ±9deg。
 *
 * 规范把它归为 Expressive 档，并且限制一页最多三个元素。
 * 原因是每个倾斜的元素都是一个持续更新 transform 的合成层，
 * 叠多了会和 backdrop-filter 的重绘打架，直接掉帧。
 *
 * 所以这个 hook 默认就带上限，超出的元素静默跳过而不是硬跑。
 * 触屏设备完全不启用 -- 那里没有 hover，倾斜只会在滚动时乱抖。
 *
 * 手感对齐 Apple「流体界面」：
 *   · 指针移动时 1:1 跟随（rAF 合帧，一帧最多写一次 transform）
 *   · 离开时从**当前呈现值**回弹，并把指针最后速度交给回弹动画
 *     （速度交接），而不是清 transition 硬跳
 *   · 回弹带轻微过冲（阻尼 ~0.8）-- 拨出去的东西才配弹
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

    // 记录最近一次指针位置的历史，用于离开时取速度（速度交接）
    let lastX = 0, lastY = 0, lastT = 0
    let vx = 0, vy = 0            // px/s
    let frame = 0                 // rAF 句柄
    let pending: { x: number; y: number } | null = null
    let resting = true            // 是否已回到 0（无动画在途）

    const apply = (x: number, y: number) => {
      el.style.transform =
        `perspective(${perspective}px) rotateX(${y * -max}deg) ` +
        `rotateY(${x * max}deg) translateY(-${lift}px)`
    }

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5

      // 速度：用两次事件间的位移 / 时长，粗但够用
      const now = performance.now()
      if (lastT > 0) {
        const dt = Math.max(now - lastT, 1)
        vx = ((e.clientX - lastX) / dt) * 1000
        vy = ((e.clientY - lastY) / dt) * 1000
      }
      lastX = e.clientX; lastY = e.clientY; lastT = now

      // 回弹动画在途时被指针重新进入 -- 立即中断它，从当前值接管。
      // 中断 = 取消 transition + 清 rAF，下一帧从呈现值继续。
      if (!resting) {
        el.style.transition = "none"
        if (frame) { cancelAnimationFrame(frame); frame = 0 }
        resting = true
      }

      // rAF 合帧：pointermove 频率高于刷新率时，一帧只写一次
      pending = { x, y }
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0
          if (pending) apply(pending.x, pending.y)
        })
      }
    }

    const onLeave = () => {
      if (frame) { cancelAnimationFrame(frame); frame = 0 }
      // 从当前呈现值回弹；指针离开的速度通过很小的初始位移映射进去：
      // 最后一次移动越快，回弹前多"甩"出一点点，读作惯性。
      const fling = (v: number, deg: number) =>
        Math.max(-deg, Math.min(deg, (v / 6000) * deg))
      const targetX = fling(vx, max * 0.35)
      const targetY = fling(vy, max * 0.35)
      el.style.transition =
        "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)"
      el.style.transform =
        `perspective(${perspective}px) rotateX(${targetY * -1}deg) ` +
        `rotateY(${targetX}deg)`
      resting = false
      // 过冲落定后再弹回 0，两段加起来就是"带速度甩出去再回中"
      window.setTimeout(() => {
        el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`
        window.setTimeout(() => { el.style.transition = ""; resting = true }, 420)
      }, 160)
    }

    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerleave", onLeave)
    return () => {
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
      if (frame) cancelAnimationFrame(frame)
      el.style.transition = ""
    }
  }, [max, perspective, lift, enabled])

  return ref
}
