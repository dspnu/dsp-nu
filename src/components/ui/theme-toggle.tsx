"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Moon, Sun, Monitor } from "lucide-react"

type ThemeType = "light" | "dark" | "system"

interface ThemeOption {
  value: ThemeType
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const themes: ThemeOption[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="grid gap-2 grid-cols-3" role="radiogroup" aria-label="Color theme">
      {themes.map((themeOption) => {
        const Icon = themeOption.icon
        const isSelected = theme === themeOption.value

        return (
          <button
            key={themeOption.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setTheme(themeOption.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-transparent bg-muted/50"
            )}
          >
            <Icon className={cn(
              "h-5 w-5",
              isSelected ? "text-primary" : "text-muted-foreground"
            )} aria-hidden />
            <span className={cn(
              "text-xs font-medium",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}>
              {themeOption.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
