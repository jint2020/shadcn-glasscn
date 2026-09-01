# glasscn-core

shadcn/ui 的 Liquid Glass 主题层。暗色优先，纯 CSS，零运行时，不承担任何业务逻辑。

挂在 shadcn 组件的 `data-slot` 属性上，把现有组件就地变成玻璃——不用重新
`shadcn add`，不用改一行 tsx。

> 完整文档、设计决策与在线预览见
> **[GitHub 仓库](https://github.com/jint2020/shadcn-glasscn)** ·
> **[在线预览](https://jint2020.github.io/shadcn-glasscn/)**

## 安装

```bash
npm i glasscn-core
```

需要 Tailwind CSS v4（peer dependency）。

## 用法（零侵入）

在你的 CSS 里，紧跟 shadcn 的变量之后引入：

```css
@import "tailwindcss";
/* ... 你原有的 shadcn :root / .dark 变量 ... */
@import "glasscn-core"; /* ← 加这一行 */
```

```html
<body class="glass-backdrop">
```

顺序很重要：`glasscn-core` 要在 shadcn 变量之后，才能接管 `--card` / `--popover`
等表面 token。

## 降级层已内置（别自己删）

`backdrop-filter` 一旦不生效，半透明面板会变成"几乎看不见的框"，文字直接压在动画背景上——
不可读。所以降级不是锦上添花，是能不能上生产的分界线。主入口 `glasscn-core` 已经
包含 `primitives/fallback.css`，覆盖 `@supports not (backdrop-filter)`、
`prefers-reduced-transparency`、`prefers-contrast`、`prefers-reduced-motion`、
打印、性能降级六种情况。

## 统一主题（替代 palette 体系）

新版默认使用统一玻璃主题，不再以 palette 作为主路径。  
旧项目若仍写了 `data-glass-palette`，会自动回落到同一套统一主题（兼容层）。

## 按需引入

Tailwind v4 只输出实际用到的 `@utility`，工具类天然 tree-shake。CSS 层也按目录拆分：

```css
@import "glasscn-core/headless";              /* 只要工具类，不自动接管 shadcn */
@import "glasscn-core/tokens/primitives.css"; /* 只要材质变量 */
@import "glasscn-core/primitives/surface.css";
```

## 不想装 npm？用 shadcn registry

同一套主题也能通过 shadcn registry 分发，不走 npm 依赖：

```bash
shadcn registry add @glasscn=https://jint2020.github.io/shadcn-glasscn/r/{name}.json
shadcn add @glasscn/glass-theme
```

## License

MIT
