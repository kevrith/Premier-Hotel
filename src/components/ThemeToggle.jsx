import { Moon, Sun, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoTheme } from "@/hooks/useAutoTheme";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { theme, toggleManualTheme, enableAutoTheme, isManual } = useAutoTheme();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="elegant"
          size="icon"
          onClick={isManual ? enableAutoTheme : toggleManualTheme}
          className="rounded-full relative"
        >
          {!isManual && (
            <Clock className="absolute -top-1 -right-1 h-3 w-3 text-accent" />
          )}
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isManual ? "Enable auto theme (day/night)" : "Manual theme control"}</p>
      </TooltipContent>
    </Tooltip>
  );
}