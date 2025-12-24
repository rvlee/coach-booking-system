import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Slot, BookingFormData, CoachSlotsResponse } from '../types';
import { useLanguage } from '../context/LanguageContext';
import './BookingPage.css';

function BookingPage() {
  const { t } = useLanguage();
  const { bookingLink } = useParams<{ bookingLink: string }>();
  const navigate = useNavigate();
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [coachName, setCoachName] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isCoachLink, setIsCoachLink] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [formData, setFormData] = useState<BookingFormData>({
    client_name: '',
    client_email: '',
    client_phone: '',
    notes: '',
    willing_to_share: false
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (bookingLink) {
      fetchData();
    }
  }, [bookingLink]);

  const fetchData = async (): Promise<void> => {
    if (!bookingLink) return;
    
    try {
      setLoading(true);
      setError('');
      // Try to fetch as coach link first
      try {
        const coachResponse = await axios.get<CoachSlotsResponse>(`/api/slots/coach/${bookingLink}`);
        setIsCoachLink(true);
        setSlots(coachResponse.data.slots || []);
        setCoachName(coachResponse.data.coach_name || '');
        if (coachResponse.data.slots.length === 0) {
          setError('No available slots at this time');
        }
      } catch (coachErr: any) {
        console.log('Coach link fetch failed, trying individual slot link:', coachErr.response?.data || coachErr.message);
        // If coach link fails, try individual slot link
        try {
          const slotResponse = await axios.get<Slot>(`/api/slots/link/${bookingLink}`);
          setIsCoachLink(false);
          setSlot(slotResponse.data);
          setSelectedSlotId(slotResponse.data.id);
        } catch (slotErr: any) {
          console.error('Both coach and slot link failed:', slotErr.response?.data || slotErr.message);
          setError(slotErr.response?.data?.error || 'Slot not found');
        }
      }
    } catch (err: any) {
      console.error('Error fetching booking data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load booking page');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    
    if (isCoachLink && !selectedSlotId) {
      setError(t.bookingPage.selectTimeSlot);
      return;
    }

    if (!slot && !selectedSlotId) {
      setError('No slot selected');
      return;
    }

    setSubmitting(true);

    try {
      const slotId = isCoachLink ? selectedSlotId! : slot!.id;
      await axios.post('/api/bookings', {
        slot_id: slotId,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
        notes: formData.notes,
        willing_to_share: formData.willing_to_share
      });
      setSuccess(true);
      // Update the slot to mark as booked
      if (isCoachLink) {
        setSlots(slots.filter(s => s.id !== slotId));
        setSelectedSlotId(null);
      } else if (slot) {
        setSlot({ ...slot, is_booked: true });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to book slot';
      // Check if it's a daily limit error and translate it
      if (errorMsg.includes('Daily booking limit reached')) {
        const limitMatch = errorMsg.match(/Maximum (\d+) bookings per day/);
        if (limitMatch) {
          const limit = limitMatch[1];
          const translatedMsg = t.bookingPage.dailyLimitReached.replace(/\{\{limit\}\}/g, limit);
          setError(translatedMsg);
        } else {
          setError(errorMsg);
        }
      } else {
        setError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Group slots by date and filter available ones
  const availableSlotsByDate = useMemo(() => {
    const grouped: Record<string, Slot[]> = {};
    slots
      .filter((s) => {
        const bookingCount = s.booking_count ?? 0;
        const shareable = s.shareable_bookings ?? 0;
        // Available if empty OR has 1-3 bookings that are all willing to share
        return bookingCount === 0 || (bookingCount > 0 && bookingCount < 4 && shareable === bookingCount);
      })
      .forEach((s) => {
        const dateStr = getDateString(new Date(s.start_time));
        if (!grouped[dateStr]) {
          grouped[dateStr] = [];
        }
        grouped[dateStr].push(s);
      });
    return grouped;
  }, [slots]);

  // Get available dates
  const availableDates = useMemo(() => {
    return Object.keys(availableSlotsByDate).sort();
  }, [availableSlotsByDate]);

  // Get slots for selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return availableSlotsByDate[selectedDate] || [];
  }, [selectedDate, availableSlotsByDate]);

  // Calendar helpers
  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Add days from previous month to fill first week
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    
    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    // Add days from next month to fill last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }
    
    return days;
  };

  const isDateAvailable = (date: Date): boolean => {
    const dateStr = getDateString(date);
    return availableDates.includes(dateStr);
  };

  const isDateSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return getDateString(date) === selectedDate;
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
  };

  const handleDateClick = (date: Date): void => {
    const dateStr = getDateString(date);
    if (isDateAvailable(date)) {
      setSelectedDate(dateStr);
      setSelectedSlotId(null);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next'): void => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  if (loading) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="loading">{t.bookingPage.loading}</div>
        </div>
      </div>
    );
  }

  const getSelectedSlot = (): Slot | undefined => {
    if (isCoachLink) {
      return slots.find(s => s.id === selectedSlotId);
    }
    return slot || undefined;
  };

  if (error && !slot && slots.length === 0) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="error-state">
            <h2>{t.bookingPage.slotNotAvailable}</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    const bookedSlot = getSelectedSlot();
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h2>{t.bookingPage.confirmed}</h2>
            <p>{t.bookingPage.confirmationMessage}</p>
            <div className="booking-summary">
              <h3>{t.bookingPage.details}</h3>
              <p><strong>{t.bookingPage.name}</strong> {formData.client_name}</p>
              <p><strong>{t.bookingPage.email}:</strong> {formData.client_email}</p>
              {bookedSlot && (
                <>
                  <p><strong>{t.bookingPage.time}</strong> {formatDateTime(bookedSlot.start_time)}</p>
                  <p><strong>{t.bookingPage.duration}</strong> {bookedSlot.duration_minutes} {t.bookingPage.minutes}</p>
                  {formData.willing_to_share && (
                    <p><strong>{t.bookingPage.type}</strong> {bookedSlot.is_shared ? t.bookings.sharedClass : t.bookings.willingToShare}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <h1>{t.bookingPage.title}</h1>
          <p className="coach-name">{t.bookingPage.with} {isCoachLink ? coachName : slot?.coach_name}</p>
        </div>

        {isCoachLink ? (
          <>
            {slots.length === 0 ? (
              <div className="already-booked">
                <h2>{t.bookingPage.noSlots}</h2>
                <p>{t.bookingPage.allSlotsBooked} {t.bookingPage.checkBackLater}</p>
              </div>
            ) : (
              <>
                {slots.length > 0 && (
                  <>
                    <div className="calendar-section">
                      <h3>{t.bookingPage.selectDate}</h3>
                      <div className="calendar-container">
                        <div className="calendar-header">
                          <button 
                            type="button" 
                            className="calendar-nav-btn"
                            onClick={() => navigateMonth('prev')}
                            aria-label="Previous month"
                          >
                            ‹
                          </button>
                          <h4 className="calendar-month">
                            {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                          </h4>
                          <button 
                            type="button" 
                            className="calendar-nav-btn"
                            onClick={() => navigateMonth('next')}
                            aria-label="Next month"
                          >
                            ›
                          </button>
                        </div>
                        <div className="calendar-weekdays">
                          <div className="calendar-weekday">{t.calendar.sun}</div>
                          <div className="calendar-weekday">{t.calendar.mon}</div>
                          <div className="calendar-weekday">{t.calendar.tue}</div>
                          <div className="calendar-weekday">{t.calendar.wed}</div>
                          <div className="calendar-weekday">{t.calendar.thu}</div>
                          <div className="calendar-weekday">{t.calendar.fri}</div>
                          <div className="calendar-weekday">{t.calendar.sat}</div>
                        </div>
                        <div className="calendar-days">
                          {getDaysInMonth(currentMonth).map((date, idx) => {
                            const dateStr = getDateString(date);
                            const available = isDateAvailable(date);
                            const selected = isDateSelected(date);
                            const currentMonthDay = isCurrentMonth(date);
                            
                            return (
                              <button
                                key={idx}
                                type="button"
                                className={`calendar-day ${!currentMonthDay ? 'other-month' : ''} ${available ? 'available' : ''} ${selected ? 'selected' : ''}`}
                                onClick={() => handleDateClick(date)}
                                disabled={!available}
                                aria-label={`${date.toLocaleDateString()} ${available ? 'Available' : 'Not available'}`}
                              >
                                <span className="calendar-day-number">{date.getDate()}</span>
                                {available && (
                                  <span className="calendar-day-badge">
                                    {availableSlotsByDate[dateStr]?.length || 0}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {selectedDate && slotsForSelectedDate.length > 0 && (
                      <div className="slots-selection">
                        <h3>{t.bookingPage.availableTimes} {new Date(selectedDate).toLocaleDateString(t.language === 'zh-TW' ? 'zh-TW' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                        <div className="slots-grid">
                          {slotsForSelectedDate
                            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                            .map((s) => {
                              const bookingCount = s.booking_count ?? 0;
                              const isShareable = bookingCount > 0 && bookingCount < 4;

                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  className={`slot-option ${selectedSlotId === s.id ? 'selected' : ''} ${isShareable ? 'shareable' : ''}`}
                                  onClick={() => setSelectedSlotId(s.id)}
                                >
                                  <div className="slot-option-time">{formatTime(s.start_time)}</div>
                                  <div className="slot-option-duration">{s.duration_minutes} min</div>
                                  {isShareable && (
                                    <div className="slot-option-shareable">
                                      {t.bookingPage.sharedFriendly} ({bookingCount}/4 {t.bookingPage.spotsTaken})
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {selectedDate && slotsForSelectedDate.length === 0 && (
                      <div className="no-slots-message">
                        <p>{t.bookingPage.noSlotsForDate}</p>
                      </div>
                    )}

                    {!selectedDate && (
                      <div className="select-date-message">
                        <p>{t.bookingPage.selectDateMessage}</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="booking-form">
                  <div className="form-group">
                    <label>{t.bookingPage.fullName}</label>
                    <input
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      required
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="form-group">
                    <label>{t.bookingPage.email}</label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      required
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>{t.bookingPage.phone}</label>
                    <input
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="form-group">
                    <label>{t.bookingPage.notes}</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any special requests or information..."
                      rows={4}
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.willing_to_share}
                        onChange={(e) => setFormData({ ...formData, willing_to_share: e.target.checked })}
                      />
                      <span>{t.bookingPage.willingToShare}</span>
                    </label>
                    <small className="checkbox-hint">
                      {t.bookingPage.willingToShareHint}
                    </small>
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <button type="submit" className="submit-booking-btn" disabled={submitting || !selectedSlotId}>
                    {submitting ? t.bookingPage.booking : t.bookingPage.confirm}
                  </button>
                    </form>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {slot?.is_booked ? (
              <div className="already-booked">
                <h2>{t.bookingPage.alreadyBooked}</h2>
                <p>{t.bookingPage.contactCoach}</p>
              </div>
            ) : (
              <>
                <div className="slot-info-card">
                  <h3>{t.bookingPage.sessionDetails}</h3>
                  <div className="slot-details">
                    <div className="detail-row">
                      <span className="detail-label">{t.bookingPage.dateTime}</span>
                      <span className="detail-value">{slot ? formatDateTime(slot.start_time) : ''}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">{t.bookingPage.duration}</span>
                      <span className="detail-value">{slot?.duration_minutes} {t.bookingPage.minutes}</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="booking-form">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      required
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      required
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="form-group">
                    <label>Notes (Optional)</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any special requests or information..."
                      rows={4}
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.willing_to_share}
                        onChange={(e) => setFormData({ ...formData, willing_to_share: e.target.checked })}
                      />
                      <span>I'm willing to share this class with someone else</span>
                    </label>
                    <small className="checkbox-hint">
                      If checked, you may be paired with another participant. If paired, the session will be extended to 90 minutes.
                    </small>
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <button type="submit" className="submit-booking-btn" disabled={submitting}>
                    {submitting ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default BookingPage;


