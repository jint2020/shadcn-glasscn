import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Slider({ className, defaultValue = [50], max = 100, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root data-slot="slider" defaultValue={defaultValue} max={max} className={cn("relative flex w-full touch-none items-center select-none", className)} {...props}>
      <SliderPrimitive.Track data-slot="slider-track" className="bg-muted relative h-1.5 w-full grow overflow-hidden rounded-full">
        <SliderPrimitive.Range data-slot="slider-range" className="bg-primary absolute h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb data-slot="slider-thumb" className="border-primary bg-background block size-4 shrink-0 rounded-full border shadow-sm focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-hidden" />
    </SliderPrimitive.Root>
  )
}
export { Slider }
