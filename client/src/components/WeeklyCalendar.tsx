import { WeeklyCalendarProps, BusyPeriod } from '../types';
import './WeeklyCalendar.css';

const HOURS_START = 8;
const HOURS_END = 24; // exclusive end (i.e., up to 12am/midnight)

interface DateLabel {
  day: string;
  monthDay: string;
}

function formatDateLabel(dateStr: string): DateLabel {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  const monthDay = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { day, monthDay };
}

function WeeklyCalendar({ weekDays, selectedDays, onToggleDay, busyByDate }: WeeklyCalendarProps) {
  const hours: number[] = [];
  for (let h = HOURS_START; h < HOURS_END; h++) {
    hours.push(h);
  }
  // Add 24 (midnight) if HOURS_END is 24
  if (HOURS_END === 24) {
    hours.push(24);
  }

  const renderBusyBlocks = (dateStr: string): JSX.Element[] => {
    const busy: BusyPeriod[] = busyByDate[dateStr] || [];
    return busy.map((b, idx) => {
      const start = new Date(b.start);
      const end = new Date(b.end);
      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;
      const totalHours = HOURS_END - HOURS_START;
      const topPct = ((startHour - HOURS_START) / totalHours) * 100;
      const heightPct = ((endHour - startHour) / totalHours) * 100;
      return (
        <div
          key={idx}
          className="busy-block"
          style={{ top: `${topPct}%`, height: `${heightPct}%` }}
          title={`${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        />
      );
    });
  };

  return (
    <div className="weekly-calendar">
      <div className="wc-header">
        <span>Weekly view</span>
        <small>Tap days to toggle selection; busy blocks and created slots shown in purple</small>
      </div>
      <div className="wc-grid">
        <div className="wc-time-column">
          <div className="wc-time-header"></div>
          {hours.map((h) => {
            const displayHour = h === 24 ? 12 : (h % 12) === 0 ? 12 : h % 12;
            const period = h === 24 || h < 12 ? 'a' : 'p';
            return (
              <div key={h} className="wc-time-label">
                {`${displayHour}${period}`}
              </div>
            );
          })}
        </div>
        {weekDays.map((dateStr) => {
          const { day, monthDay } = formatDateLabel(dateStr);
          const isSelected = selectedDays.has(dateStr);
          return (
            <div
              key={dateStr}
              className={`wc-day-column ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleDay(dateStr)}
            >
              <div className="wc-day-header">
                <span className="wc-day-name">{day}</span>
                <span className="wc-day-date">{monthDay}</span>
              </div>
              <div className="wc-day-body">
                {renderBusyBlocks(dateStr)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeeklyCalendar;





