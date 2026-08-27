import * as React from "react"
import { cn } from "@/lib/utils"

const Table = ({ className, ...p }: React.ComponentProps<"table">) => (
  <div data-slot="table-container" className="relative w-full overflow-x-auto rounded-lg border">
    <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...p} />
  </div>
)
const TableHeader = ({ className, ...p }: React.ComponentProps<"thead">) => <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...p} />
const TableBody = ({ className, ...p }: React.ComponentProps<"tbody">) => <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...p} />
const TableRow = ({ className, ...p }: React.ComponentProps<"tr">) => <tr data-slot="table-row" className={cn("hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors", className)} {...p} />
const TableHead = ({ className, ...p }: React.ComponentProps<"th">) => <th data-slot="table-head" className={cn("text-foreground h-10 px-3 text-left align-middle font-medium whitespace-nowrap", className)} {...p} />
const TableCell = ({ className, ...p }: React.ComponentProps<"td">) => <td data-slot="table-cell" className={cn("p-3 align-middle whitespace-nowrap", className)} {...p} />
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
