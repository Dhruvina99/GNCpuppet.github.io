import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVENT_TYPES } from "@shared/schema";

interface EventSelectorProps {
  eventType: string | null | undefined;
  eventCustom: string | null | undefined;
  onEventTypeChange: (value: string) => void;
  onEventCustomChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  JJ: "JJ - Janma Jayanti",
  Janmashtami: "Janmashtami",
  Holi: "Holi",
  Other: "Other",
};

export function EventSelector({
  eventType,
  eventCustom,
  onEventTypeChange,
  onEventCustomChange,
  disabled = false,
  required = false,
}: EventSelectorProps) {
  const showCustomInput = eventType === "Other";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="event-type">
          Event {required && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={eventType || ""}
          onValueChange={onEventTypeChange}
          disabled={disabled}
        >
          <SelectTrigger id="event-type">
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {EVENT_LABELS[type] || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showCustomInput && (
        <div className="space-y-2">
          <Label htmlFor="event-custom">Custom Event Name</Label>
          <Input
            id="event-custom"
            placeholder="Enter custom event name"
            value={eventCustom || ""}
            onChange={(e) => onEventCustomChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

export function getEventDisplayName(eventType: string | null | undefined, eventCustom: string | null | undefined): string {
  if (!eventType) return "";
  if (eventType === "Other" && eventCustom) {
    return eventCustom;
  }
  return EVENT_LABELS[eventType] || eventType;
}
