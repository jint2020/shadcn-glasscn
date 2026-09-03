#!/usr/bin/env node
// 本地发版编排:gate → bump → 打 tag → push;CI(release.yml)见到 v* tag 后
// 用 OIDC 免密发布 glasscn-core、自动建 GitHub Release。
//
// 用法:
//   pnpm release:core <patch|minor|major|x.y.z>          正常发版(推荐,日常只用这条)
//   pnpm release:core:direct <patch|minor|major|x.y.z>   应急:本地直发 npm(需 npm login)
//
// 可选开关:
//   --skip-verify   仅应急模式允许:跳过 pnpm verify(浏览器断言)
//   --allow-branch  不强制在 main 上发版(明确越权时才用)
//
// 设计要点见 self-managed.md §5。gate 一律在打 tag 之前跑:tag 一旦存在就代表真通过,
// 不会留下"发了一半"的死 tag。

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const direct = args.includes("--direct");
const skipVerify = args.includes("--skip-verify");
const allowBranch = args.includes("--allow-branch");
const level = args.find((a) => !a.startsWith("--"));

const CORE = "packages/core";
const REPO = "jint2020/shadcn-glasscn";
const VALID = ["patch", "minor", "major"];

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}
function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: "inherit", ...opts });
}
function capture(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", ...opts }).trim();
}

// 0. 参数校验 ----------------------------------------------------------------
if (!level) {
  die("缺少版本级别。用法:pnpm release:core <patch|minor|major>(应急加 :direct)");
}
if (!VALID.includes(level) && !/^\d+\.\d+\.\d+$/.test(level)) {
  die(`非法版本级别「${level}」。只接受 patch / minor / major 或具体的 x.y.z。`);
}
if (skipVerify && !direct) {
  die("--skip-verify 只允许在应急模式(:direct)下使用。正常发版不许跳过 verify。");
}

console.log(
  `\n▶ ${direct ? "应急直发" : "正常发版"}模式,级别:${level}${skipVerify ? "(跳过 verify)" : ""}\n`,
);

// 1. 工作区必须干净 ----------------------------------------------------------
if (capture("git status --porcelain")) {
  die("工作区不干净。先提交或 stash 再发版(发版基于一个明确的已提交状态)。");
}

// 2. 分支必须是 main(除非 --allow-branch)-----------------------------------
const branch = capture("git rev-parse --abbrev-ref HEAD");
if (branch !== "main" && !allowBranch) {
  die(`当前在「${branch}」而非 main。切回 main 再发版(确需越权则加 --allow-branch)。`);
}

// 3. registry 漂移检查:重建后 registry.json 不应有变化 -----------------------
//    registry.json 是入库的单一事实源;它一变就说明有人改了 CSS 却没重跑
//    registry:build 并提交 —— npm 和 shadcn registry 两条渠道会对不上。
console.log("▶ 检查 registry 与 CSS 是否同步…");
run("pnpm registry:build");
if (capture("git status --porcelain -- registry.json")) {
  die(
    "registry.json 与源码 CSS 漂移了(已为你重新生成并留在工作区)。\n" +
      "   请 review 后 `git add registry.json && git commit`,再重新发版。",
  );
}

// 4. 浏览器像素断言(正常路径必跑)-------------------------------------------
if (skipVerify) {
  console.log("\n⚠ 已跳过 pnpm verify(应急模式)。你在为没过断言的产物负责。");
} else {
  console.log("\n▶ 跑 pnpm verify(建站 + 浏览器像素断言,约 1–2 分钟)…");
  run("pnpm verify");
}

// 5. bump 版本 → 生成 commit + tag ------------------------------------------
console.log(`\n▶ bump 版本(${level})并打 tag…`);
run(`npm version ${level} -m "chore: 发布 glasscn-core v%s"`, { cwd: CORE });
const version = JSON.parse(readFileSync(resolve(CORE, "package.json"), "utf8")).version;
const tag = `v${version}`;
console.log(`\n✔ 已生成提交与标签 ${tag}`);

// 6. 应急直发分支:本地 publish(OIDC 只在 CI 成立,本地必须有凭据)----------
if (direct) {
  console.log("\n▶ 应急直发:检查 npm 登录态…");
  try {
    console.log(`  已登录 npm:${capture("npm whoami")}`);
  } catch {
    console.log("  未登录 —— 拉起交互式 npm login(要过 2FA/OTP)…");
    run("npm login");
  }
  console.log("\n▶ 本地发布到 npm(应急,无 provenance)…");
  try {
    run("npm publish --access public", { cwd: CORE });
  } catch {
    die(
      `本地发布失败,但 commit 与 tag ${tag} 已生成。\n` +
        `   修好登录/网络后,手动:cd ${CORE} && npm publish --access public\n` +
        `   然后回到根目录:git push --follow-tags(让 CI 补建 Release)。`,
    );
  }
}

// 7. 推送 commit + tag。tag 触发 release.yml;正常路径由它 OIDC 发布 --------
console.log("\n▶ 推送提交与标签…");
try {
  run("git push --follow-tags");
} catch {
  die(
    `推送失败。本地 commit 与 tag ${tag} 已生成${direct ? "、npm 也已发布" : ""}。\n` +
      `   修好网络后手动 \`git push --follow-tags\` 即可${direct ? "(CI 会补建 Release)" : "(CI 会接手发布)"}。`,
  );
}

// 8. 收尾 -------------------------------------------------------------------
if (direct) {
  console.log(
    `\n✅ 应急发布完成:glasscn-core@${version} 已上 npm。\n` +
      `   CI 见版本已存在会跳过重复发布,只补建 GitHub Release。`,
  );
} else {
  console.log(
    `\n✅ 已推送 ${tag}。GitHub Actions 接手:gate → OIDC 发布 → 建 Release。\n` +
      `   进度:https://github.com/${REPO}/actions`,
  );
}
