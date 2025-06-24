export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: "workout" | "progress" | "achievement";
  completed?: boolean;
}

export interface CalendarDay {
  date: string;
  events: CalendarEvent[];
  isSelected?: boolean;
}

export interface CalendarViewProps {
  events: CalendarEvent[];
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
  onEventPress?: (event: CalendarEvent) => void;
}
