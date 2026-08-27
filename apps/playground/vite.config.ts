import path from "node:path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  // GitHub Pages 部署在 /shadcn-glasscn/ 子路径下。
  // 本地开发和 CI 里的 vite preview 走 "/"，靠 BASE_PATH 环境变量切换。
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
