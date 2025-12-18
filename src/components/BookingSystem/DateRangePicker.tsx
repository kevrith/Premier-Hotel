import { useState } from "react";
import { format, addDays, isBefore, startOfToday } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const DateRangePicker = ({
  checkInDate,
  checkOutDate,
  onCheckInChange,
  onCheckOutChange
}) => {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  
  const today = startOfToday();
  const minCheckOut = checkInDate ? addDays(checkInDate, 1) : addDays(today, 1);

  const handleCheckInSelect = (date) => {
    onCheckInChange(date);
    setCheckInOpen(false);
    
    // If check-out date is before or same as new check-in date, reset it
    if (date && checkOutDate && !isBefore(date, checkOutDate)) {
      onCheckOutChange(addDays(date, 1));
    }
  };

  const handleCheckOutSelect = (date) => {
    onCheckOutChange(date);
    setCheckOutOpen(false);
  };

  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Check-in Date */}
      <div className="space-y-2">
        <Label htmlFor="check-in">Check-in Date</Label>
        <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
          <PopoverTrigger asChild>
            <Button
              id="check-in"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !checkInDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {checkInDate ? format(checkInDate, "PPP") : "Select check-in date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkInDate}
              onSelect={handleCheckInSelect}
              disabled={(date) => isBefore(date, today)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Check-out Date */}
      <div className="space-y-2">
        <Label htmlFor="check-out">Check-out Date</Label>
        <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
          <PopoverTrigger asChild>
            <Button
              id="check-out"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !checkOutDate && "text-muted-foreground"
              )}
              disabled={!checkInDate}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {checkOutDate ? format(checkOutDate, "PPP") : "Select check-out date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkOutDate}
              onSelect={handleCheckOutSelect}
              disabled={(date) => isBefore(date, minCheckOut)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Nights Summary */}
      {checkInDate && checkOutDate && (
        <div className="col-span-1 md:col-span-2 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{calculateNights()} night{calculateNights() !== 1 ? 's' : ''}</span>
            {' '}from {format(checkInDate, "MMM d")} to {format(checkOutDate, "MMM d, yyyy")}
          </p>
        </div>
      )}
    </div>
  );
};