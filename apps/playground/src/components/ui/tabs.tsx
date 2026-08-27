import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const Tabs = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.Root>) => <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...p} />
const TabsList = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.List>) => <TabsPrimitive.List data-slot="tabs-list" className={cn("bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]", className)} {...p} />
const TabsTrigger = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn("text-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none [&_svg:not([class*='size-'])]:size-4", className)} {...p} />
const TabsContent = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.Content>) => <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...p} />
export { Tabs, TabsList, TabsTrigger, TabsContent }
