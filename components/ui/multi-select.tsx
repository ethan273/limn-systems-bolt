"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface Option {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxCount?: number
  emptyIndicator?: React.ReactNode
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  disabled = false,
  maxCount = 3,
  emptyIndicator,
  ...props
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleUnselect = React.useCallback((item: string) => {
    onChange(selected.filter((i) => i !== item))
  }, [onChange, selected])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = e.target as HTMLInputElement
    if (input.value === "") {
      if (e.key === "Backspace") {
        onChange(selected.slice(0, -1))
      }
    }
  }, [onChange, selected])

  const selectables = options.filter((option) => !selected.includes(option.value))

  return (
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal",
            !selected.length && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length > 0 ? (
              <>
                {selected.slice(0, maxCount).map((item) => {
                  const option = options.find((option) => option.value === item)
                  const IconComponent = option?.icon
                  return (
                    <Badge
                      variant="secondary"
                      key={item}
                      className="mr-1 mb-1"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleUnselect(item)
                      }}
                    >
                      {IconComponent && (
                        <IconComponent className="h-4 w-4 mr-1" />
                      )}
                      {option?.label}
                      <button
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUnselect(item)
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleUnselect(item)
                        }}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  )
                })}
                {selected.length > maxCount && (
                  <Badge
                    variant="secondary"
                    className="mr-1 mb-1"
                  >
                    +{selected.length - maxCount} more
                  </Badge>
                )}
              </>
            ) : (
              placeholder
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            ref={(input) => {
              if (input) {
                input.focus()
              }
            }}
            placeholder="Search..."
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleKeyDown}
          />
          <CommandEmpty>
            {emptyIndicator ? emptyIndicator : "No results found."}
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {selectables.map((option) => {
              const IconComponent = option.icon
              return (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    setInputValue("")
                    onChange([...selected, option.value])
                  }}
                >
                  {IconComponent && (
                    <IconComponent className="mr-2 h-4 w-4" />
                  )}
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selected.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

MultiSelect.displayName = "MultiSelect"

export { MultiSelect }