import { format } from "date-fns";

// Shown in the viewer's local time zone
export const formatTime = (ms: number) => format(new Date(ms), "MMM d, h:mm a");
