import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const Popover = (p: React.ComponentProps<typeof PopoverPrimitive.Root>) => <PopoverPrimitive.Root data-slot="popover" {...p} />
const PopoverTrigger = (p: React.ComponentProps<typeof PopoverPrimitive.Trigger>) => <PopoverPrimitive.Trigger data-slot="popover-trigger" {...p} />
const PopoverAnchor = (p: React.ComponentProps<typeof PopoverPrimitive.Anchor>) => <PopoverPrimitive.Anchor data-slot="popover-anchor" {...p} />

function PopoverContent({ className, align = "center", sideOffset = 6, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn("bg-popover text-popover-foreground z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-lg outline-hidden", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger }
