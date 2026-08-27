# 自托管指南

这份文档带你把手上这个包变成 GitHub 上一个能跑 CI、能对外分发 registry 的仓库。

从这一步开始，项目归你自己维护——所以除了推送步骤，
后面还写了改动之后该跑什么、CI 挡的是什么、出问题从哪查。

---

## 为什么最后一步要你自己跑

这个包是在 Anthropic 的云端沙箱里做出来的。沙箱有 GitHub 凭据，
但它是**仓库级绑定**的：git proxy 只对「会话已授权的仓库集合」注入凭据。
`jint2020/shadcn-glasscn` 不在那个集合里，所以：

```
gh repo create  →  403  sessions are bound to their configured repositories
git push        →  403  not in this session's authorized repository set
POST /user/repos →  403  同上
```

三条路都堵死。能做的都做完了——仓库初始化、7 个提交、CI 与 Pages 配置、
本地完整跑通一遍——只差把 commit 推上去这一下。

---

## 0. 环境要求

| 工具 | 版本 | 用途 |
|---|---|---|
| Node | ≥ 22 | 构建与验证脚本 |
| pnpm | 10.x | workspace 管理（`package.json` 里 `packageManager` 钉的是 10.28.0） |
| gh | 任意较新版 | 可选，用来一条命令建仓 |

没装 pnpm：`npm i -g pnpm@10`

---

## 1. 先在本地确认包是完整的

推之前跑一遍，省得把坏的东西推上去再回滚。

```bash
tar xzf shadcn-glasscn.tar.gz
cd shadcn-glasscn

pnpm install
pnpm exec playwright install chromium   # 验证脚本要用，只需装一次

pnpm registry:build   # 生成 registry 产物
pnpm verify           # 32 项浏览器断言
pnpm dev              # 起预览站，浏览器打开看一眼
```

`pnpm verify` 全绿应该是这样：

```
  ✓  白色中性：card 填充无色调                  rgb(255 255 255) a=0.08
  ✓  五套暗色调色的玻璃填充完全一致                 rgba(255, 255, 255, 0.08)
  ✓  五套暗色调色的光斑各不相同                   #c2410c #06b6d4 #c084fc …
  ✓  四档模糊严格递增                         16 < 20 < 24 < 28
  ✓  按钮 / 输入框 / 徽章是药丸                 btn=999 input=999 badge=999
  ✓  主按钮没有 backdrop-filter（实心，不是玻璃）   none
  ✓  对比度（实测像素）：卡片标题 ≥ 4.5            14.51:1
  ✓  打印：所有揭示元素可见（否则整页印成白纸）           11/11 可见
  ...
  32/32 通过
```

预览站默认 <http://localhost:5173>。左上角能切材质预设、背景、深浅色、性能降级。

---

## 2. 推到 GitHub

### 装了 gh：一条命令

```bash
gh repo create jint2020/shadcn-glasscn --public --source=. --remote=origin --push
```

建仓、加 remote、推 main，7 个提交一起上去。

### 没装 gh

先在 github.com 建一个**空仓库**——不要勾 README / .gitignore / LICENSE，
勾了会和本地历史冲突，第一次 push 就被拒。

```bash
git remote add origin https://github.com/jint2020/shadcn-glasscn.git
git push -u origin main
```

### 用 bundle 也行

`shadcn-glasscn.bundle` 是同一份历史的单文件形态，适合传输：

```bash
git clone shadcn-glasscn.bundle shadcn-glasscn
cd shadcn-glasscn
git remote set-url origin https://github.com/jint2020/shadcn-glasscn.git
git push -u origin main
```

---

## 3. 开 Pages（必做，不做 CI 会红）

registry 靠 GitHub Pages 分发。这个开关只能手动开一次：

> **Settings → Pages → Build and deployment → Source 选 `GitHub Actions`**

不是选 "Deploy from a branch"——workflow 用的是 `actions/deploy-pages`，
必须走 GitHub Actions 那个模式。

开完后重新触发一次 CI（Actions 页面点 `Re-run all jobs`，或者随便推一个提交）。

---

## 4. 验收

CI 绿了之后，这三处应该都通：

```bash
# 预览站
open https://jint2020.github.io/shadcn-glasscn/

# registry 入口
curl -s https://jint2020.github.io/shadcn-glasscn/r/registry.json | head -20

# 主题 item（应该有 61 个 light 变量、29 个 dark、28 个 css 顶层键）
curl -s https://jint2020.github.io/shadcn-glasscn/r/glass-theme.json \
  | node -e 'const t=JSON.parse(require("fs").readFileSync(0));
      console.log(Object.keys(t.cssVars.light).length, "light /",
                  Object.keys(t.cssVars.dark).length, "dark /",
                  Object.keys(t.css).length, "css keys")'
```

最后找个真实的 shadcn 项目试一次端到端：

```bash
shadcn registry add @glasscn=https://jint2020.github.io/shadcn-glasscn/r/{name}.json
shadcn add @glasscn/glass-theme
```

装完记得在 `globals.css` 里补一行：

```css
@import "./glass-fallback.css";
```

降级层是 `@media` / `@supports` 顶层规则，必须落在 unlayered 作用域
才压得过 `cssVars` 写进 `:root` 的值，所以它走的是 registry 的 `files`
而不是 `css` 字段，CLI 不会自动帮你加这个 import。

> 这一步是整个项目**唯一没在沙箱里验证过**的环节——沙箱访问不到
> ui.shadcn.com，真实 CLI 装的那一路没跑通。别的都验过。

---

## 5. 日常维护

### 改了 CSS 之后

```bash
pnpm registry:build   # registry.json 是从 CSS 反推生成的，必须重跑
pnpm verify           # 确认没破坏降级路径和对比度
git add -A && git commit && git push
```

**`registry.json` 不要手改。** 它由 `packages/registry/build-registry.mjs`
从 `packages/core/src/**/*.css` 解析生成。手改一次就会漂移：
下次谁跑了 `registry:build`，你的手改就没了；
或者你改了 CSS 忘了重跑，用户 `shadcn add` 拿到的是旧规则——而且不报错。

### CI 挡的是什么

`.github/workflows/ci.yml` 里那步「校验 registry 结构」设了四道闸：

| 检查 | 挡的是 |
|---|---|
| 变量 ≥ 90 / theme ≥ 10 | CSS 选择器结构变了，生成器静默少解析了一批变量 |
| `--glass-fill*` 不含颜色值 | 玻璃填充带上了色调 —— 这套设计最核心的规则被破 |
| `--glass-white` 必须是 `255 255 255` | 同上，从另一个角度挡 |
| css 顶层键 ≥ 25 | `@utility` 没收全 |
| 必须有 `@layer components` | shadcn 自动桥没进 registry，装完不生效 |
| 必须有 `glass-fallback.css` | 降级层丢了——这个最危险 |
| `registry.json` 不含 `localhost` | 本地调试的 base URL 忘了重置就发出去了 |

以后往 CSS 里加变量只会让数字变大，不会误报。
但如果哪天你**故意**精简了 token 体系，记得同步调低这几个阈值，
否则 CI 会拦着不让你合。

### 换调色 / 加调色

调色文件在 `packages/core/src/palettes/`。每套只需要八个值：
底色两级、三个光斑、强调色两级、文字色调。**不要动玻璃填充** ——
六套里它必须完全一致，`pnpm verify` 和 CI 都会挡。

加一套新的：复制一个现有文件改值，然后在 `switchable.css` 里追加同样的块。

### 换域名 / 换仓库名

base URL 只有一处真源，在 `packages/registry/build-registry.mjs`：

```js
const HOMEPAGE = "https://jint2020.github.io/shadcn-glasscn"
```

改完重跑 `pnpm registry:build`。另外两处也要跟着改：
`.github/workflows/ci.yml` 里的 `BASE_PATH`，和 `README.md` 里的链接与徽标。

### 发 npm 包

`packages/core` 是纯 CSS，没有构建步骤，`files` 字段只发 `src`（npm 会另外自动带上
`README.md` 和 `LICENSE`）。包名是无 scope 的 `glasscn-core`，所以不用建组织、
也不用 `--access public`：

```bash
npm login          # 首次发布前，交互式登录（要过 2FA）
cd packages/core
npm publish        # 无 scope 公开包，默认就是 public
```

之后每次发新版：改 `packages/core/package.json` 的 `version`（或 `npm version patch`），
再 `npm publish`。改了 CSS 先 `pnpm registry:build`，让 registry 和 npm 两条渠道同步。

想换成带 scope 的名字（个人 `@你的用户名/glasscn-core`，或自建组织后用 `@glasscn/core`），
改 `packages/core/package.json` 的 `name`，同时同步 `apps/playground` 的依赖键和
`src/styles/app.css` 里两行 `@import`，然后 `pnpm install` 重新链接。

---

## 6. 排错

**`pnpm install` 报 lockfile 校验失败**

`pnpm-lock.yaml` 是沙箱里用 pnpm 10.28.0 生成的。你本地版本不同的话：

```bash
pnpm install --no-frozen-lockfile
git add pnpm-lock.yaml && git commit -m "chore: 更新 lockfile"
```

CI 用的是 `--frozen-lockfile`，所以更新后的 lockfile 要提交上去。

**`pnpm verify` 报找不到 Chromium**

```bash
pnpm exec playwright install chromium
```

**`pnpm verify` 一堆 locator timeout**

多半是上一次构建带了 `BASE_PATH`，页面资源 404 了。
`verify` 现在会自己先跑一次根路径构建，理论上不会再出现；
真遇到就手动 `pnpm build` 再试。

**Pages 上线了但页面全白**

看浏览器控制台，如果资源请求打的是 `/assets/...` 而不是
`/shadcn-glasscn/assets/...`，说明 CI 的 Pages 构建那步没带上 `BASE_PATH`。
检查 workflow 里「构建 Pages 产物」那一步的 `env`。

**registry 地址 404**

- Pages 是不是选了 `GitHub Actions` 而不是 `Deploy from a branch`
- CI 的 deploy job 有没有真的跑（它有 `if: github.ref == 'refs/heads/main'`，
  PR 上不会跑）
- `apps/playground/public/r` 在 `.gitignore` 里，产物由 CI 现场生成，
  本地看不到不代表线上没有

**CI 的 deploy 步骤报权限错**

workflow 里已经声明了 `pages: write` 和 `id-token: write`。
如果还是报错，看 Settings → Actions → General → Workflow permissions，
确认不是设成了 `Read repository contents permission`。

---

## 附：包里有什么

```
shadcn-glasscn/
├── packages/core/          纯 CSS 主题层（1457 行），发 npm 的就是这个
│   └── src/
│       ├── tokens/         材质原语 / 高度阶梯 / shadcn 变量桥
│       ├── primitives/     表面 / 交互 / 背景 / 降级
│       ├── bridge/         data-slot 零侵入层
│       └── presets/        四套材质
├── packages/registry/      registry 生成器（从 CSS 反推，不手抄）
├── apps/playground/        预览站 + 20 个 shadcn 组件
├── scripts/                verify（17 项断言）/ screenshot
├── docs/screenshots/       README 用的示例图
├── .github/workflows/      CI：构建 → 校验 registry → 验证 → 部署 Pages
└── registry.json           生成产物，别手改
```

架构决策和踩过的坑写在 `README.md` 里。
