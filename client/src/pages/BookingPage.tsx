import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Slot, BookingFormData, CoachSlotsResponse } from '../types';
import './BookingPage.css';

function BookingPage() {
  const { bookingLink } = useParams<{ bookingLink: string }>();
  const navigate = useNavigate();
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [coachName, setCoachName] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isCoachLink, setIsCoachLink] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
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
      setError('Please select a time slot');
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
      setError(err.response?.data?.error || 'Failed to book slot');
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

  if (loading) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="loading">Loading...</div>
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
            <h2>Slot Not Available</h2>
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
            <h2>Booking Confirmed!</h2>
            <p>Your booking has been confirmed. You will receive a confirmation email shortly.</p>
            <div className="booking-summary">
              <h3>Booking Details</h3>
              <p><strong>Name:</strong> {formData.client_name}</p>
              <p><strong>Email:</strong> {formData.client_email}</p>
              {bookedSlot && (
                <>
                  <p><strong>Time:</strong> {formatDateTime(bookedSlot.start_time)}</p>
                  <p><strong>Duration:</strong> {bookedSlot.duration_minutes} minutes</p>
                  {formData.willing_to_share && (
                    <p><strong>Type:</strong> {bookedSlot.is_shared ? 'Shared Class' : 'Willing to Share'}</p>
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
          <h1>Book Your Session</h1>
          <p className="coach-name">with {isCoachLink ? coachName : slot?.coach_name}</p>
        </div>

        {isCoachLink ? (
          <>
            {slots.length === 0 ? (
              <div className="already-booked">
                <h2>No available slots</h2>
                <p>All slots have been booked. Please check back later.</p>
              </div>
            ) : (
              <>
                {slots.length > 0 && (
                  <div className="slots-selection">
                    <h3>Select a Time Slot</h3>
                    <div className="slots-grid">
                      {slots
                        .filter((s) => {
                          const bookingCount = s.booking_count ?? 0;
                          const shareable = s.shareable_bookings ?? 0;
                          const shared = s.shared_bookings ?? 0;
                          // Mirror backend rules: show if no bookings, or 1 booking that is willing_to_share and not yet shared
                          return bookingCount === 0 || (bookingCount === 1 && shareable === 1 && shared === 0);
                        })
                        .map((s) => {
                          const isShareable =
                            (s.booking_count ?? 0) === 1 &&
                            (s.shareable_bookings ?? 0) === 1 &&
                            (s.shared_bookings ?? 0) === 0;

                          return (
                            <button
                              key={s.id}
                              type="button"
                              className={`slot-option ${selectedSlotId === s.id ? 'selected' : ''} ${isShareable ? 'shareable' : ''}`}
                              onClick={() => setSelectedSlotId(s.id)}
                            >
                              <div className="slot-option-time">{formatDateTime(s.start_time)}</div>
                              <div className="slot-option-duration">{s.duration_minutes} min</div>
                              {isShareable && (
                                <div className="slot-option-shareable">
                                  Shared-friendly (1 spot taken)
                                </div>
                              )}
                            </button>
                          );
                        })}
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

                  <button type="submit" className="submit-booking-btn" disabled={submitting || !selectedSlotId}>
                    {submitting ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </form>
              </>
            )}
          </>
        ) : (
          <>
            {slot?.is_booked ? (
              <div className="already-booked">
                <h2>This slot is already booked</h2>
                <p>Please contact the coach for alternative times.</p>
              </div>
            ) : (
              <>
                <div className="slot-info-card">
                  <h3>Session Details</h3>
                  <div className="slot-details">
                    <div className="detail-row">
                      <span className="detail-label">Date & Time</span>
                      <span className="detail-value">{slot ? formatDateTime(slot.start_time) : ''}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Duration</span>
                      <span className="detail-value">{slot?.duration_minutes} minutes</span>
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


