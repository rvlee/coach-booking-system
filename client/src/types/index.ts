// User/Coach types
export interface Coach {
  id: number;
  email: string;
  name: string;
  coach_booking_link?: string;
  timezone?: string;
  daily_booking_limit?: number | null;
  language?: string;
  created_at?: string;
}

// Settings types
export interface CoachSettings {
  timezone: string;
  daily_booking_limit: number | null;
  language: 'en' | 'zh-TW';
}

// Slot types
export interface Slot {
  id: number;
  coach_id: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_available: number | boolean;
  booking_link: string;
  created_at?: string;
  google_event_id?: string | null;
  is_booked?: number | boolean;
  booking_count?: number;
  shareable_bookings?: number;
  shared_bookings?: number;
}

// Booking types
export interface Booking {
  id: number;
  slot_id: number;
  coach_id: number;
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  notes?: string | null;
  status: string;
  willing_to_share: number | boolean;
  is_shared: number | boolean;
  shared_with_booking_id?: number | null;
  created_at?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  booking_link?: string;
  coach_name?: string;
  shared_with_name?: string;
  shared_with_email?: string;
}

// Auth context types
export interface AuthContextType {
  user: Coach | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

// Form data types
export interface BookingFormData {
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string;
  willing_to_share: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
  name?: string;
}

// Google Calendar types
export interface GoogleCalendarStatus {
  connected: boolean;
  calendar_id: string | null;
}

export interface BusyPeriod {
  start: string;
  end: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface CoachSlotsResponse {
  coach_name: string;
  slots: Slot[];
}

// Component prop types
export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export interface CreateSlotProps {
  onSlotCreated: (slots: Slot | Slot[]) => void;
  slotsRefreshTrigger?: number;
}

export interface SlotsListProps {
  slots: Slot[];
  onSlotDeleted: (slotId: number) => void;
  onSlotUpdated: (slot: Slot) => void;
}

export interface BookingsListProps {
  bookings: Booking[];
}

export interface WeeklyCalendarProps {
  weekDays: string[];
  selectedDays: Set<string>;
  onToggleDay: (dateStr: string) => void;
  busyByDate: Record<string, BusyPeriod[]>;
}

// Day slot configuration
export interface DaySlotConfig {
  date: string;
  enabled: boolean;
  timeRanges: TimeRange[];
}

export interface TimeRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  duration: number;
}

// Edit data types for SlotsList
export interface SlotEditData {
  start_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | string;
}

export interface BookingLinkResponse {
  booking_link: string;
}

// CreateSlot types
export interface TimeSlotConfig {
  startTime: string;
  endTime: string;
  duration: number;
}

export interface DaySetting {
  enabled: boolean;
  timeSlots: TimeSlotConfig[];
}

export interface GoogleCalendarStatus {
  connected: boolean;
  calendar_id: string | null;
}

export interface BusyPeriodWithFlag extends BusyPeriod {
  isCreatedSlot?: boolean;
}

export interface DaySlot {
  start: string;
  end: string;
  duration: number;
  date?: string;
}

