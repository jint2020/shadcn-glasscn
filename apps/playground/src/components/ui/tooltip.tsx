import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ delayDuration = 200, ...p }: React.ComponentProps<typeof TooltipPrimitive.Provider>) => <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...p} />
const Tooltip = (p: React.ComponentProps<typeof TooltipPrimitive.Root>) => <TooltipProvider><TooltipPrimitive.Root data-slot="tooltip" {...p} /></TooltipProvider>
const TooltipTrigger = (p: React.ComponentProps<typeof TooltipPrimitive.Trigger>) => <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...p} />

function TooltipContent({ className, sideOffset = 6, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn("bg-popover text-popover-foreground z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md border px-3 py-1.5 text-xs text-balance shadow-lg", className)}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
