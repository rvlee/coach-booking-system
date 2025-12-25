import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';
import WeeklyCalendar from './WeeklyCalendar';
import { CreateSlotProps, Slot, DaySetting, TimeSlotConfig, GoogleCalendarStatus, BusyPeriodWithFlag, DaySlot } from '../types';
import { useLanguage } from '../context/LanguageContext';
import './CreateSlot.css';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

interface TimeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

// Custom time selector component that only allows :00 or :30
function TimeSelector({ value, onChange, label }: TimeSelectorProps) {
  const [hours, minutes] = value.split(':').map(Number);
  
  const handleHourChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const newHour = parseInt(e.target.value, 10);
    onChange(`${pad(newHour)}:${pad(minutes)}`);
  };
  
  const handleMinuteChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const newMinute = parseInt(e.target.value, 10);
    onChange(`${pad(hours)}:${pad(newMinute)}`);
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="time-selector">
        <select value={hours} onChange={handleHourChange} className="time-hour">
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{pad(i)}</option>
          ))}
        </select>
        <span className="time-separator">:</span>
        <select value={minutes} onChange={handleMinuteChange} className="time-minute">
          <option value={0}>00</option>
          <option value={30}>30</option>
        </select>
      </div>
    </div>
  );
}

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + Number(minutesToAdd || 0);
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${pad(nh)}:${pad(nm)}`;
}

function buildIso(dateStr: string, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  // Create a date object in local timezone
  // dateStr is in format YYYY-MM-DD, time is in format HH:MM
  const dt = new Date(dateStr + 'T' + String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':00');
  // Return ISO string - this will convert to UTC, but the calendar will convert back to local for display
  return dt.toISOString();
}

function CreateSlot({ onSlotCreated, slotsRefreshTrigger = 0, onWeekChange }: CreateSlotProps) {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const [weekStart, setWeekStart] = useState<string>(getWeekStart(today));
  const [daySettings, setDaySettings] = useState<Record<string, DaySetting>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus>({ connected: false, calendar_id: null });
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [busyByDate, setBusyByDate] = useState<Record<string, BusyPeriodWithFlag[]>>({});
  const [busyLoading, setBusyLoading] = useState<boolean>(false);
  const [busyError, setBusyError] = useState<string>('');
  const [createdSlots, setCreatedSlots] = useState<Slot[]>([]);
  const [copyToSourceDate, setCopyToSourceDate] = useState<string | null>(null);
  const [copyToTargetDates, setCopyToTargetDates] = useState<Set<string>>(new Set());
  const [copyToCalendarMonth, setCopyToCalendarMonth] = useState<Date>(new Date());
  const [timeSettingHeight, setTimeSettingHeight] = useState<number>(400);
  const [isResizingTimeSetting, setIsResizingTimeSetting] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const weekDays = getWeekDays(weekStart);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Initialize day settings when week changes (preserve existing, don't create defaults)
  useEffect(() => {
    const settings = { ...daySettings };
    weekDays.forEach((date) => {
      if (!settings[date]) {
        settings[date] = {
          enabled: false,
          timeSlots: []
        };
      }
    });
    // Don't remove dates outside current week - they might be copied to dates
    // The dates will be cleaned up after slots are created
    setDaySettings(settings);
  }, [weekStart]);

  // Round time to nearest :00 or :30
  const roundToHalfHour = (timeStr: string): string => {
    const [h, m] = timeStr.split(':').map(Number);
    const rounded = m < 15 ? 0 : m < 45 ? 30 : 0;
    const hours = m >= 45 ? h + 1 : h;
    return `${pad(hours % 24)}:${pad(rounded)}`;
  };

  const handleTimeChange = (date: string, slotIndex: number, field: keyof TimeSlotConfig, value: string): void => {
    // Value is already in HH:MM format from TimeSelector, just ensure it's valid
    const [h, m] = value.split(':').map(Number);
    const validTime = `${pad(h % 24)}:${pad(m === 0 || m === 30 ? m : 0)}`;
    const settings = { ...daySettings };
    const day = settings[date] || { enabled: false, timeSlots: [] };
    const slots = [...(day.timeSlots || [])];
    slots[slotIndex] = {
      ...slots[slotIndex],
      [field]: validTime
    };
    settings[date] = {
      ...day,
      timeSlots: slots
    };
    setDaySettings(settings);
  };

  const updateDaySetting = (date: string, field: keyof DaySetting, value: boolean | TimeSlotConfig[]): void => {
    const current = daySettings[date] || { enabled: false, timeSlots: [] };
    setDaySettings({
      ...daySettings,
      [date]: {
        ...current,
        [field]: value
      }
    });
  };

  const addTimeSlot = (date: string): void => {
    const settings = { ...daySettings };
    const day = settings[date] || { enabled: false, timeSlots: [] };
    const slots = [...(day.timeSlots || [])];
    slots.push({
      startTime: '09:00',
      endTime: '17:00',
      duration: 60
    });
    settings[date] = {
      ...day,
      enabled: true,
      timeSlots: slots
    };
    setDaySettings(settings);
  };

  const removeTimeSlot = (date: string, slotIndex: number): void => {
    const settings = { ...daySettings };
    const day = settings[date] || { enabled: false, timeSlots: [] };
    const slots = [...(day.timeSlots || [])];
    slots.splice(slotIndex, 1);
    settings[date] = {
      ...day,
      timeSlots: slots,
      enabled: slots.length > 0
    };
    setDaySettings(settings);
  };

  const copyDaySettings = (fromDate: string, toDates: string[]): void => {
    const settings = { ...daySettings };
    const sourceDay = settings[fromDate];
    
    if (!sourceDay || !sourceDay.timeSlots || sourceDay.timeSlots.length === 0) {
      // If source day has no slots, just set target days with empty slots
      toDates.forEach(toDate => {
        settings[toDate] = {
          enabled: false,
          timeSlots: []
        };
      });
    } else {
      // Deep copy the time slots array
      const copiedSlots = sourceDay.timeSlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: slot.duration
      }));
      
      // Copy to all target dates
      toDates.forEach(toDate => {
        settings[toDate] = {
          enabled: sourceDay.enabled,
          timeSlots: [...copiedSlots]
        };
      });
    }
    
    setDaySettings(settings);
  };

  const handleCopyToClick = (sourceDate: string): void => {
    setCopyToSourceDate(sourceDate);
    setCopyToTargetDates(new Set());
  };

  const handleCopyToToggleDay = (targetDate: string): void => {
    // Don't allow selecting the source date
    if (targetDate === copyToSourceDate) return;
    
    const newTargets = new Set(copyToTargetDates);
    if (newTargets.has(targetDate)) {
      newTargets.delete(targetDate);
    } else {
      newTargets.add(targetDate);
    }
    setCopyToTargetDates(newTargets);
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Add days from previous month to fill the first week
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push(prevDate);
    }
    
    // Add all days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    // Add days from next month to fill the last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }
    
    return days;
  };

  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isDateInPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === copyToCalendarMonth.getMonth() && 
           date.getFullYear() === copyToCalendarMonth.getFullYear();
  };

  const navigateCopyToMonth = (direction: 'prev' | 'next'): void => {
    setCopyToCalendarMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Resize handlers for time setting section
  const handleTimeSettingMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault();
    setIsResizingTimeSetting(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (isResizingTimeSetting) {
        const createSlot = document.querySelector('.create-slot');
        if (createSlot) {
          const rect = createSlot.getBoundingClientRect();
          const newHeight = e.clientY - rect.top;
          // Allow scaling down to 200px minimum, and up to 1200px maximum
          if (newHeight >= 200 && newHeight <= 1200) {
            setTimeSettingHeight(newHeight);
          }
        }
      }
    };

    const handleMouseUp = (): void => {
      setIsResizingTimeSetting(false);
    };

    if (isResizingTimeSetting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingTimeSetting]);

  const handleCopyToConfirm = (): void => {
    if (copyToSourceDate && copyToTargetDates.size > 0) {
      copyDaySettings(copyToSourceDate, Array.from(copyToTargetDates));
      setCopyToSourceDate(null);
      setCopyToTargetDates(new Set());
    }
  };

  const handleCopyToCancel = (): void => {
    setCopyToSourceDate(null);
    setCopyToTargetDates(new Set());
    setCopyToCalendarMonth(new Date());
  };

  const generateSlots = (start: string, end: string, dur: number): DaySlot[] => {
    const slots: DaySlot[] = [];
    const startRounded = roundToHalfHour(start);
    const endRounded = roundToHalfHour(end);
    
    let current = startRounded;
    while (true) {
      const [h, m] = current.split(':').map(Number);
      const currentMinutes = h * 60 + m;
      
      const [eh, em] = endRounded.split(':').map(Number);
      const endMinutes = eh * 60 + em;
      
      if (currentMinutes + dur > endMinutes) {
        break;
      }
      
      const slotEnd = addMinutesToTime(current, dur);
      slots.push({
        start: current,
        end: slotEnd,
        duration: dur
      });
      
      current = slotEnd;
    }
    
    return slots;
  };

  const getSlotsForDay = (date: string): DaySlot[] => {
    const settings = daySettings[date];
    if (!settings || !settings.enabled || !settings.timeSlots || settings.timeSlots.length === 0) return [];
    
    const allSlots: DaySlot[] = [];
    settings.timeSlots.forEach((slotConfig) => {
      const slots = generateSlots(slotConfig.startTime, slotConfig.endTime, slotConfig.duration);
      allSlots.push(...slots);
    });
    return allSlots;
  };

  const getAllSlots = (): DaySlot[] => {
    const allSlots: DaySlot[] = [];
    // Include all dates in daySettings, not just current week
    // This allows copying to dates outside the current week
    const allDates = Object.keys(daySettings);
    allDates.forEach((date) => {
      const daySlots = getSlotsForDay(date);
      daySlots.forEach((slot) => {
        allSlots.push({
          ...slot,
          date
        });
      });
    });
    return allSlots;
  };

  // Initial load: fetch Google status and slots on mount
  useEffect(() => {
    const initLoad = async (): Promise<void> => {
      // Fetch Google status and slots in parallel
      const [statusRes, slots] = await Promise.all([
        axios.get<GoogleCalendarStatus>('/api/google/status').catch(() => ({ data: { connected: false, calendar_id: null } })),
        fetchWeekSlots(weekStart)
      ]);
      
      const status = statusRes.data || { connected: false, calendar_id: null };
      setGoogleStatus(status);
      setIsInitialized(true);
      
      // Always display slots immediately, regardless of Google status
      if (status.connected) {
        await fetchWeekBusy(weekStart, slots);
      } else {
        updateBusyBlocksWithSlots({}, slots);
      }
    };
    
    initLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent when week changes
  useEffect(() => {
    if (onWeekChange) {
      onWeekChange(weekStart);
    }
  }, [weekStart, onWeekChange]);

  // Reload when week changes, slots are updated, or Google status changes
  useEffect(() => {
    // Skip if not initialized yet (handled by initLoad)
    if (!isInitialized) return;
    
    const loadWeekData = async (): Promise<void> => {
      // Always fetch slots first
      const slots = await fetchWeekSlots(weekStart);
      
      // Then fetch Google busy if connected, or just update with slots
      if (googleStatus.connected) {
        await fetchWeekBusy(weekStart, slots);
      } else {
        // If Google not connected, just show created slots
        // Pass slots directly to avoid race condition with state updates
        updateBusyBlocksWithSlots({}, slots);
      }
    };
    
    loadWeekData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, googleStatus.connected, slotsRefreshTrigger, isInitialized]);

  const updateBusyBlocksWithSlots = (googleBusy: Record<string, BusyPeriodWithFlag[]>, slotsToUse: Slot[] | null = null): void => {
    const combined: Record<string, BusyPeriodWithFlag[]> = { ...googleBusy };
    
    // Use provided slots or fall back to state
    const slots = slotsToUse !== null ? slotsToUse : createdSlots;
    
    // Add created slots to the busy blocks
    if (slots && slots.length > 0) {
      // Group slots by date first to see what we're working with
      const slotsByDate: Record<string, Slot[]> = {};
      slots.forEach((slot) => {
        if (!slot.start_time || !slot.end_time) {
          console.warn('Invalid slot:', slot);
          return;
        }
        
        const slotDate = new Date(slot.start_time).toISOString().slice(0, 10);
        if (!slotsByDate[slotDate]) {
          slotsByDate[slotDate] = [];
        }
        slotsByDate[slotDate].push(slot);
      });
      
      // Now add all slots for each date
      Object.keys(slotsByDate).forEach((date) => {
        if (!combined[date]) {
          combined[date] = [];
        }
        // Add all slots for this date
        slotsByDate[date].forEach((slot) => {
          combined[date].push({
            start: slot.start_time,
            end: slot.end_time,
            isCreatedSlot: true
          });
        });
      });
    }

    setBusyByDate(combined);
  };

  const fetchGoogleStatus = async (): Promise<void> => {
    try {
      const res = await axios.get<GoogleCalendarStatus>('/api/google/status');
      setGoogleStatus(res.data);
    } catch (err) {
      // ignore
    }
  };

  const fetchWeekSlots = async (weekStartDate: string): Promise<Slot[]> => {
    try {
      const days = getWeekDays(weekStartDate);
      const weekStart = new Date(days[0] + 'T00:00:00');
      const weekEnd = new Date(days[6] + 'T23:59:59.999');
      
      const response = await axios.get<Slot[]>('/api/slots');
      const allSlots = response.data || [];
      
      // Filter slots that fall within the current week
      const weekSlots = allSlots.filter((slot) => {
        if (!slot.start_time) return false;
        const slotDate = new Date(slot.start_time);
        return slotDate >= weekStart && slotDate <= weekEnd;
      });
      
      setCreatedSlots(weekSlots);
      return weekSlots; // Return slots for immediate use
    } catch (err) {
      console.error('Error fetching slots:', err);
      setCreatedSlots([]);
      return [];
    }
  };

  const fetchWeekBusy = async (weekStartDate: string, slotsToMerge: Slot[] | null = null): Promise<void> => {
    try {
      setBusyLoading(true);
      setBusyError('');
      const days = getWeekDays(weekStartDate);
      const responses = await Promise.all(
        days.map((d) =>
          axios
            .get<{ busy: BusyPeriod[] }>('/api/google/busy', { params: { date: d } })
            .then((res) => ({ date: d, busy: res.data.busy || [] }))
            .catch((err) => {
              console.error(`Error fetching busy times for ${d}:`, err);
              return { date: d, busy: [] };
            })
        )
      );
      const map: Record<string, BusyPeriodWithFlag[]> = {};
      responses.forEach((r) => {
        // Mark Google Calendar busy blocks so we can distinguish them from created slots
        map[r.date] = (r.busy || []).map(busy => ({
          ...busy,
          isCreatedSlot: false // This is from Google Calendar
        }));
      });
      
      // Merge with created slots - use provided slots or current state
      const slots = slotsToMerge !== null ? slotsToMerge : createdSlots;
      const combined: Record<string, BusyPeriodWithFlag[]> = { ...map };
      
      // Group slots by date to ensure all are added
      const slotsByDate: Record<string, Slot[]> = {};
      slots.forEach((slot) => {
        if (!slot.start_time || !slot.end_time) return;
        // Get the date in local timezone, not UTC
        const slotDateObj = new Date(slot.start_time);
        const year = slotDateObj.getFullYear();
        const month = String(slotDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(slotDateObj.getDate()).padStart(2, '0');
        const slotDate = `${year}-${month}-${day}`;
        if (!slotsByDate[slotDate]) {
          slotsByDate[slotDate] = [];
        }
        slotsByDate[slotDate].push(slot);
      });
      
      // Add all slots for each date
      Object.keys(slotsByDate).forEach((date) => {
        if (!combined[date]) {
          combined[date] = [];
        }
        slotsByDate[date].forEach((slot) => {
          combined[date].push({
            start: slot.start_time,
            end: slot.end_time,
            isCreatedSlot: true
          });
        });
      });
      
      setBusyByDate(combined);
    } catch (err: any) {
      setBusyError(err.response?.data?.error || 'Failed to load busy times');
    } finally {
      setBusyLoading(false);
    }
  };

  const connectGoogle = async (): Promise<void> => {
    try {
      const res = await axios.get<{ url: string }>('/api/google/auth');
      const url = res.data.url;
      const popup = window.open(url, '_blank', 'width=500,height=700');
      const poll = setInterval(async () => {
        if (popup && popup.closed) {
          clearInterval(poll);
          await fetchGoogleStatus();
          // Fetch slots first, then merge with Google busy times
          const slots = await fetchWeekSlots(weekStart);
          await fetchWeekBusy(weekStart, slots);
        }
      }, 1000);
    } catch (err) {
      setError('Failed to start Google auth');
    }
  };

  // Check if a time range overlaps with any busy blocks
  const checkOverlap = (slotStart: string, slotEnd: string, busyBlocks: BusyPeriodWithFlag[]): boolean => {
    if (!busyBlocks || busyBlocks.length === 0) return false;
    
    const slotStartTime = new Date(slotStart).getTime();
    const slotEndTime = new Date(slotEnd).getTime();
    
    return busyBlocks.some((busy) => {
      const busyStart = new Date(busy.start).getTime();
      const busyEnd = new Date(busy.end).getTime();
      
      // Check if slots overlap (they overlap if one starts before the other ends)
      return (slotStartTime < busyEnd && slotEndTime > busyStart);
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const allSlots = getAllSlots();

      if (allSlots.length === 0) {
        setError(t.createSlot.enableDaysError);
        setLoading(false);
        return;
      }

      // Filter out slots that overlap with existing created slots
      // Collect warnings for Google Calendar overlaps
      const googleCalendarWarnings: string[] = [];
      const filteredSlots = allSlots.filter((slot) => {
        if (!slot.date) return false;
        const slotDate = slot.date;
        const slotStart = buildIso(slot.date, slot.start);
        const slotEnd = buildIso(slot.date, slot.end);
        const busyBlocks = busyByDate[slotDate] || [];
        
        // Check overlaps with existing created slots (from "Your Slots")
        // If overlaps with existing slot, filter it out (don't create it)
        const existingSlots = busyBlocks.filter((busy) => {
          return busy.isCreatedSlot === true;
        });
        
        if (checkOverlap(slotStart, slotEnd, existingSlots)) {
          // Skip this slot - it overlaps with an existing created slot
          return false;
        }
        
        // Check overlaps with Google Calendar busy times if connected
        // Show warning but still allow creation
        if (googleStatus.connected) {
          const googleBusyBlocks = busyBlocks.filter((busy) => {
            return !busy.isCreatedSlot;
          });
          
          if (checkOverlap(slotStart, slotEnd, googleBusyBlocks)) {
            const slotDateObj = new Date(slotDate);
            const dateStr = slotDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const slotTime = `${slot.start} - ${slot.end}`;
            const warningStr = `${dateStr} at ${slotTime} (overlaps with Google Calendar event)`;
            if (!googleCalendarWarnings.includes(warningStr)) {
              googleCalendarWarnings.push(warningStr);
            }
          }
        }
        
        return true; // Include this slot
      });

      // Show warnings for Google Calendar overlaps but continue
      if (googleCalendarWarnings.length > 0) {
        const warningTemplate = t.createSlot.googleCalendarWarning || 'Warning: The following times overlap with Google Calendar events:\n{{warnings}}\n\nThese slots will still be created.';
        const warningMessage = warningTemplate.replace(/\{\{warnings\}\}/g, googleCalendarWarnings.join('\n'));
        alert(warningMessage);
      }

      // Check if we have any slots to create after filtering
      if (filteredSlots.length === 0) {
        setError(t.createSlot.allOverlapError);
        setLoading(false);
        return;
      }

      // If some slots were filtered out, show info message
      if (filteredSlots.length < allSlots.length) {
        const skippedCount = allSlots.length - filteredSlots.length;
        const infoTemplate = t.createSlot.slotsSkippedInfo || '{{skipped}} slot(s) were skipped because they overlap with existing slots. {{created}} slot(s) will be created.';
        const infoMessage = infoTemplate
          .replace(/\{\{skipped\}\}/g, String(skippedCount))
          .replace(/\{\{created\}\}/g, String(filteredSlots.length));
        setInfo(infoMessage);
        // Clear info after 5 seconds
        setTimeout(() => setInfo(''), 5000);
      } else {
        setInfo('');
      }

      const slotsPayload = filteredSlots.map((slot) => ({
        start_time: buildIso(slot.date!, slot.start),
        end_time: buildIso(slot.date!, slot.end),
        duration_minutes: Number(slot.duration)
      }));

      console.log('Creating slots:', slotsPayload.length, 'slots');
      if (slotsPayload.length > 0) {
        console.log('First slot:', slotsPayload[0]);
        console.log('Last slot:', slotsPayload[slotsPayload.length - 1]);
      }

      const response = await axios.post<{ slots: Slot[] }>('/api/slots/batch', { slots: slotsPayload });
      
      if (response.data?.slots) {
        console.log('Created slots:', response.data.slots.length);
        console.log('Sample created slots:', response.data.slots.slice(0, 3));
      }
      if (response.data?.slots) {
        onSlotCreated(response.data.slots);
        // Refresh slots to show them on the calendar
        const updatedSlots = await fetchWeekSlots(weekStart);
        // Update calendar with new slots
        if (googleStatus.connected) {
          await fetchWeekBusy(weekStart, updatedSlots);
        } else {
          updateBusyBlocksWithSlots({}, updatedSlots);
        }
        
        // Reset form - only reset dates in current week, preserve dates outside current week
        // (they will be cleaned up naturally or can be manually cleared)
        const resetSettings: Record<string, DaySetting> = { ...daySettings };
        weekDays.forEach((date) => {
          resetSettings[date] = {
            enabled: false,
            timeSlots: []
          };
        });
        // Clean up dates outside current week that were just used for copying
        // Only remove if they were enabled (meaning they were just copied to)
        Object.keys(resetSettings).forEach((date) => {
          if (!weekDays.includes(date) && resetSettings[date].enabled) {
            // Check if slots were actually created for this date
            const wasCreated = response.data.slots.some((slot: Slot) => {
              if (!slot.start_time) return false;
              const slotDate = new Date(slot.start_time);
              const year = slotDate.getFullYear();
              const month = String(slotDate.getMonth() + 1).padStart(2, '0');
              const day = String(slotDate.getDate()).padStart(2, '0');
              const slotDateStr = `${year}-${month}-${day}`;
              return slotDateStr === date;
            });
            // Only remove if slots were created (to clean up after copy)
            if (wasCreated) {
              delete resetSettings[date];
            }
          }
        });
        setDaySettings(resetSettings);
        setError('');
        setInfo('');
      }
    } catch (err: any) {
      console.error('Batch create error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create slot';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const totalSlots = getAllSlots().length;

  return (
    <div className={`create-slot ${isMinimized ? 'minimized' : ''}`} style={{ height: isMinimized ? 'auto' : `${timeSettingHeight}px` }}>
      <div className="create-slot-header">
        <h2>{t.createSlot.title}</h2>
        <button
          type="button"
          className="minimize-btn"
          onClick={() => setIsMinimized(!isMinimized)}
          aria-label={isMinimized ? 'Expand' : 'Minimize'}
        >
          {isMinimized ? '▼' : '▲'}
        </button>
      </div>
      {!isMinimized && (
      <div className="slot-grid resizable-section">
        <div className="calendar-panel">
          <div className="week-nav">
            <button type="button" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}>
              ← Previous
            </button>
            <div className="week-label">{formatWeekRange(weekStart)}</div>
            <button type="button" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
              Next →
            </button>
          </div>
          <WeeklyCalendar
            weekDays={weekDays}
            selectedDays={new Set(weekDays.filter((d) => daySettings[d]?.enabled))}
            onToggleDay={() => {}}
            busyByDate={busyByDate}
          />
        </div>

        <form onSubmit={handleSubmit} className="slot-form">
          {!googleStatus.connected && (
            <div className="google-banner">
              <div>
                <strong>{t.createSlot.connectGoogle}</strong>
                <p>Sync slots to a dedicated calendar and see busy blocks.</p>
              </div>
              <button type="button" className="connect-btn" onClick={connectGoogle}>
                Connect
              </button>
            </div>
          )}

          {googleStatus.connected && (
            <div className="google-banner connected">
              <div>
                <strong>{t.createSlot.googleConnected}</strong>
                <p>Busy times are loaded for this week.</p>
              </div>
              <button type="button" className="secondary-btn" onClick={() => fetchWeekBusy(weekStart)} disabled={busyLoading}>
                {busyLoading ? t.createSlot.refreshing : t.createSlot.refreshBusy}
              </button>
            </div>
          )}

          <div className="days-list">
            {weekDays.map((date, idx) => {
              const d = new Date(date);
              const dayName = dayNames[idx];
              const settings = daySettings[date] || { enabled: false, timeSlots: [] };
              const timeSlots = settings.timeSlots || [];
              const daySlots = getSlotsForDay(date);
              const busy = busyByDate[date] || [];

              return (
                <div key={date} className="day-row">
                  <div className="day-row-header">
                    <div className="day-info">
                      <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(e) => updateDaySetting(date, 'enabled', e.target.checked)}
                        className="day-checkbox"
                      />
                      <label className="day-label">
                        <strong>{dayName}</strong>
                        <span className="day-date">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </label>
                    </div>
                    <div className="day-actions">
                      {settings.enabled && timeSlots.length > 0 && (
                        <button
                          type="button"
                          className="copy-to-btn"
                          onClick={() => handleCopyToClick(date)}
                          title={t.createSlot.copyTo}
                        >
                          {t.createSlot.copyTo}
                        </button>
                      )}
                      {busy.length > 0 && (
                        <span className="busy-badge">{busy.length} busy</span>
                      )}
                      {settings.enabled && daySlots.length > 0 && (
                        <span className="slots-badge">{daySlots.length} slots</span>
                      )}
                    </div>
                  </div>

                  {settings.enabled && (
                    <div className="day-time-slots">
                      {timeSlots.map((slotConfig, slotIdx) => {
                        const slotPreview = generateSlots(slotConfig.startTime, slotConfig.endTime, slotConfig.duration);
                        return (
                          <div key={slotIdx} className="time-slot-config">
                            <div className="time-slot-fields">
                              <TimeSelector
                                label="Start time"
                                value={slotConfig.startTime}
                                onChange={(newTime) => handleTimeChange(date, slotIdx, 'startTime', newTime)}
                              />
                              <TimeSelector
                                label="End time"
                                value={slotConfig.endTime}
                                onChange={(newTime) => handleTimeChange(date, slotIdx, 'endTime', newTime)}
                              />
                              <div className="form-group">
                                <label>Duration (min)</label>
                                <select
                                  value={slotConfig.duration}
                                  onChange={(e) => {
                                    const settings = { ...daySettings };
                                    const day = settings[date] || { enabled: false, timeSlots: [] };
                                    const slots = [...(day.timeSlots || [])];
                                    slots[slotIdx] = {
                                      ...slots[slotIdx],
                                      duration: parseInt(e.target.value, 10)
                                    };
                                    settings[date] = {
                                      ...day,
                                      timeSlots: slots
                                    };
                                    setDaySettings(settings);
                                  }}
                                >
                                  <option value="15">15</option>
                                  <option value="30">30</option>
                                  <option value="45">45</option>
                                  <option value="60">60</option>
                                  <option value="90">90</option>
                                  <option value="120">120</option>
                                </select>
                              </div>
                              <button
                                type="button"
                                className="remove-slot-btn"
                                onClick={() => removeTimeSlot(date, slotIdx)}
                                aria-label="Remove time slot"
                              >
                                ✕
                              </button>
                            </div>
                            {slotPreview.length > 0 && (
                              <div className="slot-preview-mini">
                                {slotPreview.length} slot{slotPreview.length !== 1 ? 's' : ''}: {slotPreview.slice(0, 2).map(s => `${s.start}-${s.end}`).join(', ')}
                                {slotPreview.length > 2 && ` +${slotPreview.length - 2} more`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        className="add-time-slot-btn"
                        onClick={() => addTimeSlot(date)}
                      >
                        + Add time slot
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Copy To Modal */}
          {copyToSourceDate && (
            <div className="copy-to-modal-overlay" onClick={handleCopyToCancel}>
              <div className="copy-to-modal" onClick={(e) => e.stopPropagation()}>
                <div className="copy-to-modal-header">
                  <h3>{t.createSlot.copyToTitle}</h3>
                  <button
                    type="button"
                    className="copy-to-close-btn"
                    onClick={handleCopyToCancel}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="copy-to-modal-body">
                  <p className="copy-to-source-info">
                    {t.createSlot.copyToSource}: <strong>{dayNames[weekDays.indexOf(copyToSourceDate)]}</strong> ({new Date(copyToSourceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                  </p>
                  <p className="copy-to-instruction">{t.createSlot.copyToInstruction}</p>
                  <div className="copy-to-calendar-container">
                    <div className="copy-to-calendar-header">
                      <button 
                        type="button" 
                        className="copy-to-calendar-nav-btn"
                        onClick={() => navigateCopyToMonth('prev')}
                        aria-label="Previous month"
                      >
                        ‹
                      </button>
                      <h4 className="copy-to-calendar-month">
                        {copyToCalendarMonth.toLocaleString(t.language === 'zh-TW' ? 'zh-TW' : 'en-US', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button 
                        type="button" 
                        className="copy-to-calendar-nav-btn"
                        onClick={() => navigateCopyToMonth('next')}
                        aria-label="Next month"
                      >
                        ›
                      </button>
                    </div>
                    <div className="copy-to-calendar-weekdays">
                      <div className="copy-to-calendar-weekday">{t.calendar.sun}</div>
                      <div className="copy-to-calendar-weekday">{t.calendar.mon}</div>
                      <div className="copy-to-calendar-weekday">{t.calendar.tue}</div>
                      <div className="copy-to-calendar-weekday">{t.calendar.wed}</div>
                      <div className="copy-to-calendar-weekday">{t.calendar.thu}</div>
                      <div className="copy-to-calendar-weekday">{t.calendar.fri}</div>
                      <div className="copy-to-calendar-weekday">{t.calendar.sat}</div>
                    </div>
                    <div className="copy-to-calendar-days">
                      {getDaysInMonth(copyToCalendarMonth).map((date, idx) => {
                        const dateStr = getDateString(date);
                        const isPast = isDateInPast(date);
                        const isSourceDate = dateStr === copyToSourceDate;
                        const isSelected = copyToTargetDates.has(dateStr);
                        const currentMonthDay = isCurrentMonth(date);
                        
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`copy-to-calendar-day ${!currentMonthDay ? 'other-month' : ''} ${isPast ? 'past' : ''} ${isSourceDate ? 'source-date' : ''} ${isSelected ? 'selected' : ''}`}
                            onClick={() => !isPast && !isSourceDate && handleCopyToToggleDay(dateStr)}
                            disabled={isPast || isSourceDate}
                            aria-label={`${date.toLocaleDateString()} ${isSelected ? 'Selected' : 'Not selected'}`}
                          >
                            <span className="copy-to-calendar-day-number">{date.getDate()}</span>
                            {isSelected && (
                              <span className="copy-to-calendar-day-check">✓</span>
                            )}
                            {isSourceDate && (
                              <span className="copy-to-calendar-day-source">源</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="copy-to-modal-footer">
                  <button
                    type="button"
                    className="copy-to-cancel-btn"
                    onClick={handleCopyToCancel}
                  >
                    {t.createSlot.cancel}
                  </button>
                  <button
                    type="button"
                    className="copy-to-confirm-btn"
                    onClick={handleCopyToConfirm}
                    disabled={copyToTargetDates.size === 0}
                  >
                    {t.createSlot.copyToConfirm} ({copyToTargetDates.size})
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {info && <div className="info-message">{info}</div>}

          <div className="submit-section">
            <div className="slot-count">
              {totalSlots > 0 ? `${totalSlots} ${t.createSlot.slotsReady}` : t.createSlot.enableDays}
            </div>
            <button type="submit" className="create-btn" disabled={loading || totalSlots === 0}>
              {loading ? t.createSlot.creating : t.createSlot.createAll}
            </button>
          </div>
        </form>
      </div>
      )}
      {!isMinimized && (
      <div 
        className="resize-handle"
        onMouseDown={handleTimeSettingMouseDown}
        style={{ cursor: 'ns-resize' }}
      >
        <div className="resize-handle-line"></div>
      </div>
      )}
    </div>
  );
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0-6 (Sun-Sat)
  const diff = d.getDate() - day + 1; // start Monday
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function getWeekDays(weekStartStr: string): string[] {
  const days: string[] = [];
  const start = new Date(weekStartStr);
  for (let i = 0;  i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function shiftWeek(weekStartStr: string, delta: number): string {
  const d = new Date(weekStartStr);
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

function formatWeekRange(weekStartStr: string): string {
  const start = new Date(weekStartStr);
  const end = new Date(weekStartStr);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}`;
}

export default CreateSlot;


