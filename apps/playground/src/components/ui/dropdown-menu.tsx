import * as React from "react"
import { DropdownMenu as DM } from "radix-ui"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const DropdownMenu = (p: React.ComponentProps<typeof DM.Root>) => <DM.Root data-slot="dropdown-menu" {...p} />
const DropdownMenuTrigger = (p: React.ComponentProps<typeof DM.Trigger>) => <DM.Trigger data-slot="dropdown-menu-trigger" {...p} />
const DropdownMenuGroup = (p: React.ComponentProps<typeof DM.Group>) => <DM.Group data-slot="dropdown-menu-group" {...p} />

function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn("bg-popover text-popover-foreground z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-y-auto rounded-md border p-1 shadow-lg", className)}
        {...props}
      />
    </DM.Portal>
  )
}

function DropdownMenuItem({ className, inset, variant = "default", ...props }: React.ComponentProps<typeof DM.Item> & { inset?: boolean; variant?: "default" | "destructive" }) {
  return <DM.Item data-slot="dropdown-menu-item" data-inset={inset} data-variant={variant} className={cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive [&_svg:not([class*='size-'])]:size-4", className)} {...props} />
}

function DropdownMenuCheckboxItem({ className, children, checked, ...props }: React.ComponentProps<typeof DM.CheckboxItem>) {
  return (
    <DM.CheckboxItem data-slot="dropdown-menu-checkbox-item" checked={checked} className={cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}>
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DM.ItemIndicator><CheckIcon className="size-4" /></DM.ItemIndicator>
      </span>
      {children}
    </DM.CheckboxItem>
  )
}

const DropdownMenuLabel = ({ className, inset, ...p }: React.ComponentProps<typeof DM.Label> & { inset?: boolean }) => <DM.Label data-slot="dropdown-menu-label" data-inset={inset} className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)} {...p} />
const DropdownMenuSeparator = ({ className, ...p }: React.ComponentProps<typeof DM.Separator>) => <DM.Separator data-slot="dropdown-menu-separator" className={cn("bg-border -mx-1 my-1 h-px", className)} {...p} />
const DropdownMenuShortcut = ({ className, ...p }: React.ComponentProps<"span">) => <span data-slot="dropdown-menu-shortcut" className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)} {...p} />

export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger }
