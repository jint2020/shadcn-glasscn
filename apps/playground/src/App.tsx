import { useEffect, useState } from "react"
import {
  ArrowUpRight, Bell, Check, Command, Copy, LogOut,
  Settings, Sparkles, Trash2, User,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { useGlassReveal } from "@/hooks/use-glass-reveal"

const DENSITIES = ["sheer", "frosted", "heavy"] as const

type Density = (typeof DENSITIES)[number]

function Section({
  eyebrow, title, note, children,
}: { eyebrow: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="glass-reveal space-y-2">
        <p className="text-xs font-medium tracking-(--glass-tracking-caps) uppercase" style={{ color: "var(--glass-accent)" }}>
          {eyebrow}
        </p>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="max-w-2xl text-sm">{note}</p>
      </div>
      {children}
    </section>
  )
}

export default function App() {
  const [density, setDensity] = useState<Density>("frosted")

  useEffect(() => {
    if (density === "frosted") delete document.documentElement.dataset.glassDensity
    else document.documentElement.dataset.glassDensity = density
  }, [density])

  // 滚动揭示：纯 CSS 那条（animation-timeline: view()）在新浏览器里已经接管，
  // 这个 hook 只为不支持的浏览器兜底，内部会自己检测。
  useGlassReveal()

  return (
    <div className="glass-backdrop">
      {/* ---------- 导航：只有下边框，没有投影 ---------- */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
          <span className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4" style={{ color: "var(--glass-accent)" }} />
            glasscn
          </span>
          <span className="text-xs" style={{ color: "var(--glass-text-muted)" }}>
            Liquid Glass for shadcn/ui
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon"><Bell /></Button>
              </TooltipTrigger>
              <TooltipContent>没有新通知</TooltipContent>
            </Tooltip>
            <Button size="sm">
              开始使用 <ArrowUpRight />
            </Button>
          </div>
        </div>
      </header>

      <main className="glass-blob-accent mx-auto max-w-6xl space-y-24 px-6 py-20">
        {/* ---------- Hero ---------- */}
        <section className="glass-reveal space-y-6">
          <Badge variant="outline">
            v0.2 · Unified Glass Theme
          </Badge>
          <h1 className="max-w-4xl">玻璃没有自己的颜色</h1>
          <p className="max-w-2xl text-base">
            它的颜色全部来自背后的光斑，经过模糊和提亮之后透出来。
            设计活在背景里，玻璃只是把它温柔地显出来 —— 所以填充永远是
            <code className="mx-1 rounded px-1.5 py-0.5 text-[0.85em]"
              style={{ background: "rgb(255 255 255 / 0.08)", color: "var(--glass-text-primary)" }}>
              rgba(255,255,255,N)
            </code>
            白色中性，绝不带色调。
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button size="lg">主操作是实心的</Button>
            <Button size="lg" variant="outline">次操作才是玻璃</Button>
          </div>
        </section>

        {/* ---------- 控制台 ---------- */}
        <Card className="glass-premium glass-reveal">
          <CardHeader>
            <CardTitle>统一主题与通透度</CardTitle>
            <CardDescription>
              palette 体系已退出主路径，保留统一玻璃语义与密度轴
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs" style={{ color: "var(--glass-text-muted)" }}>通透度</Label>
              <Tabs value={density} onValueChange={(v) => setDensity(v as Density)}>
                <TabsList>
                  {DENSITIES.map((d) => <TabsTrigger key={d} value={d}>{d}</TabsTrigger>)}
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* ---------- 基础层 ---------- */}
        <Section
          eyebrow="Elevation · raised"
          title="基础层"
          note="卡片 hover 抬 4px、按钮抬 2px —— 按钮更小，抬 4px 会显得跳。微光斜扫过表面是这套设计里最有辨识度的一处动效。"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button>主操作</Button>
            <Button variant="secondary">次操作</Button>
            <Button variant="outline">描边</Button>
            <Button variant="ghost">幽灵</Button>
            <Button variant="destructive"><Trash2 /> 删除</Button>
            <Button size="icon" variant="outline"><Settings /></Button>
            <Button disabled>禁用</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>默认</Badge>
            <Badge variant="secondary">次要</Badge>
            <Badge variant="outline">描边</Badge>
            <Badge variant="destructive">危险</Badge>
          </div>
          <div className="glass-reveal-stagger grid gap-6 sm:grid-cols-3">
            <Card className="glass-shimmer glass-reveal">
              <CardHeader>
                <CardTitle>营收</CardTitle>
                <CardDescription>本月累计</CardDescription>
                <CardAction>
                  <Badge variant="outline">+12.4%</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums">¥ 128,430</div>
              </CardContent>
            </Card>
            <Card className="glass-shimmer glass-reveal">
              <CardHeader>
                <CardTitle>嵌套玻璃</CardTitle>
                <CardDescription>内层自动退回薄玻璃</CardDescription>
              </CardHeader>
              <CardContent>
                <Card className="p-4 text-xs">
                  规范硬约束：模糊层最多叠三层。内层不再二次模糊。
                </Card>
              </CardContent>
            </Card>
            <Card className="glass-reveal">
              <CardHeader><CardTitle>骨架屏</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </CardContent>
            </Card>
          </div>
          <Alert className="glass-reveal">
            <Sparkles />
            <AlertTitle>flat 档</AlertTitle>
            <AlertDescription>
              Alert 用较薄的玻璃，视觉上贴在背景上而不是浮起来。
            </AlertDescription>
          </Alert>
        </Section>

        <Separator />

        {/* ---------- 浮层类 ---------- */}
        <Section
          eyebrow="Elevation · overlay / modal"
          title="浮层类"
          note="统一层级收敛为 floating：浮层与菜单共享更干净的模糊和边缘光，modal 再向上加厚一档。"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild><Button variant="outline">打开 Dialog</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>modal 档</DialogTitle>
                  <DialogDescription>
                    遮罩不是 bg-black/50 的死色块，而是背景被模糊推远，产生真实景深。
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>项目名称</Label><Input placeholder="my-glass-app" /></div>
                  <div className="space-y-2"><Label>说明</Label><Textarea placeholder="用途…" /></div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="ghost">取消</Button></DialogClose>
                  <Button>创建</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Popover>
              <PopoverTrigger asChild><Button variant="outline">Popover</Button></PopoverTrigger>
              <PopoverContent className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">玻璃厚度</h4>
                  <p className="text-xs">改 --glass-blur-base 一个值，四档等比缩放</p>
                </div>
                <Slider defaultValue={[20]} max={48} step={1} />
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline"><User /> 账户</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><Settings /> 设置 <DropdownMenuShortcut>⌘,</DropdownMenuShortcut></DropdownMenuItem>
                <DropdownMenuItem><Copy /> 复制链接</DropdownMenuItem>
                <DropdownMenuItem><Bell /> 通知</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive"><LogOut /> 退出</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild><Button variant="outline"><Command /> Tooltip</Button></TooltipTrigger>
              <TooltipContent>overlay 档，最薄的一块浮层玻璃</TooltipContent>
            </Tooltip>
          </div>
        </Section>

        <Separator />

        {/* ---------- 导航与容器 ---------- */}
        <Section
          eyebrow="Navigation"
          title="导航与容器"
          note="标签页是药丸形状，选中项是浮在容器玻璃之上的更亮的一块 —— 靠明度差而不是描边来区分。"
        >
          <Tabs defaultValue="tiers">
            <TabsList>
              <TabsTrigger value="tiers">高度阶梯</TabsTrigger>
              <TabsTrigger value="why">设计取舍</TabsTrigger>
            </TabsList>
            <TabsContent value="tiers" className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>档位</TableHead>
                    <TableHead>组件</TableHead>
                    <TableHead>模糊</TableHead>
                    <TableHead>填充</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell>base（flat）</TableCell><TableCell>输入框 / 徽章 / 表格</TableCell><TableCell className="tabular-nums">15.84px</TableCell><TableCell className="tabular-nums">.08</TableCell></TableRow>
                  <TableRow><TableCell>raised</TableCell><TableCell>卡片 / 次级按钮</TableCell><TableCell className="tabular-nums">18px</TableCell><TableCell className="tabular-nums">.10</TableCell></TableRow>
                  <TableRow><TableCell>floating（overlay）</TableCell><TableCell>导航 / 浮层 / 侧边栏 / 菜单</TableCell><TableCell className="tabular-nums">23.04px</TableCell><TableCell className="tabular-nums">.14</TableCell></TableRow>
                  <TableRow><TableCell>modal</TableCell><TableCell>对话框 / 抽屉</TableCell><TableCell className="tabular-nums">25.92px</TableCell><TableCell className="tabular-nums">.18</TableCell></TableRow>
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="why" className="pt-6">
              <Accordion type="single" collapsible defaultValue="a">
                <AccordionItem value="a">
                  <AccordionTrigger>为什么主按钮不是玻璃？</AccordionTrigger>
                  <AccordionContent>
                    一屏全是半透明面板时，主按钮再做成玻璃，用户就找不到"该点哪个"。
                    这是可供性问题，不是审美偏好。
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="b">
                  <AccordionTrigger>为什么 backdrop-filter 必须带 saturate？</AccordionTrigger>
                  <AccordionContent>
                    只有 blur 的话，背后的颜色透过来会发灰，看着像磨砂塑料。
                    saturate 让颜色绽出来，这才是玻璃感的真正来源。
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="c">
                  <AccordionTrigger>那 1px 顶边高光真有那么重要？</AccordionTrigger>
                  <AccordionContent>
                    它是"真玻璃"和"一块模糊的板子"之间唯一的区别 ——
                    模拟玻璃的物理厚度接到顶光。去掉之后面板会立刻变平。
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>
          </Tabs>
        </Section>

        <Separator />

        {/* ---------- 表单类 ---------- */}
        <Section
          eyebrow="Elevation · flat"
          title="表单类"
          note="输入框是药丸形状，聚焦时描边提亮到 0.30 并加一圈强调色外环 —— 背景是不可预测的光斑，单层 outline 经常和背景撞色。"
        >
          <Card className="glass-reveal">
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="n">名称</Label><Input id="n" placeholder="请输入" /></div>
              <div className="space-y-2">
                <Label>区域</Label>
                <Select defaultValue="cn-south">
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cn-south">华南</SelectItem>
                    <SelectItem value="cn-east">华东</SelectItem>
                    <SelectItem value="cn-north">华北</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="d">备注</Label>
                <Textarea id="d" placeholder="多行输入不做药丸 —— 文本会贴着圆弧" />
              </div>
              <div className="space-y-3">
                <Label>玻璃厚度</Label>
                <Slider defaultValue={[20]} max={48} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><Switch id="s1" defaultChecked /><Label htmlFor="s1">启用玻璃遮罩</Label></div>
                <div className="flex items-center gap-3"><Checkbox id="c1" defaultChecked /><Label htmlFor="c1">同意条款</Label></div>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-3">
              <Button variant="ghost">重置</Button>
              <Button><Check /> 保存</Button>
            </CardFooter>
          </Card>
        </Section>

        <footer className="pb-8 text-center text-xs" style={{ color: "var(--glass-text-muted)" }}>
          glasscn · 纯样式层，不承担任何业务逻辑
        </footer>
      </main>
    </div>
  )
}
