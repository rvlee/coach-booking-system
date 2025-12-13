import { useState, useEffect } from 'react';
import axios from 'axios';
import { SlotsListProps, Slot, SlotEditData, BookingLinkResponse } from '../types';
import './SlotsList.css';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

interface DateTimeInput {
  date: string;
  time: string;
}

function formatDateTimeForInput(dateString: string): DateTimeInput {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`
  };
}

function SlotsList({ slots, onSlotDeleted, onSlotUpdated }: SlotsListProps) {
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});
  const [editing, setEditing] = useState<Record<number, boolean>>({});
  const [editData, setEditData] = useState<Record<number, SlotEditData>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [coachBookingLink, setCoachBookingLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState<boolean>(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingLink = async (): Promise<void> => {
      // Small delay to ensure auth context is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        setLinkLoading(true);
        setLinkError(null);
        
        // Ensure we have a token
        const token = localStorage.getItem('token');
        if (!token) {
          setLinkError('Please log in to view booking link');
          setLinkLoading(false);
          return;
        }

        // Use axios with explicit headers
        const response = await axios.get<BookingLinkResponse>('/api/coach/booking-link', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data && response.data.booking_link) {
          setCoachBookingLink(response.data.booking_link);
        } else {
          setLinkError('Booking link not found');
        }
      } catch (err: any) {
        console.error('Failed to fetch booking link:', err);
        console.error('Error details:', err.response);
        
        let errorMsg = 'Failed to load booking link';
        
        if (err.response) {
          // Server responded with error
          const status = err.response.status;
          const serverError = err.response.data?.error;
          
          if (status === 404) {
            errorMsg = serverError || 'Coach not found. Please log out and log back in.';
          } else if (status === 401) {
            errorMsg = 'Please log in to view booking link';
          } else if (status === 403) {
            errorMsg = 'Session expired. Please log in again.';
          } else if (status === 500) {
            errorMsg = serverError || 'Server error. Check server console for details.';
          } else {
            errorMsg = serverError || `Server error (${status})`;
          }
        } else if (err.request) {
          // Request made but no response
          errorMsg = 'No response from server. Is the server running on port 3001?';
        } else {
          errorMsg = err.message || 'Failed to load booking link';
        }
        
        setLinkError(errorMsg);
      } finally {
        setLinkLoading(false);
      }
    };
    fetchBookingLink();
  }, []);

  const handleDelete = async (slotId: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this slot?')) return;

    setDeleting({ ...deleting, [slotId]: true });
    try {
      await axios.delete(`/api/slots/${slotId}`);
      onSlotDeleted(slotId);
    } catch (error) {
      alert('Failed to delete slot');
    } finally {
      setDeleting({ ...deleting, [slotId]: false });
    }
  };

  const handleEdit = (slot: Slot): void => {
    const start = formatDateTimeForInput(slot.start_time);
    const end = formatDateTimeForInput(slot.end_time);
    setEditing({ ...editing, [slot.id]: true });
    setEditData({
      ...editData,
      [slot.id]: {
        start_date: start.date,
        start_time: start.time,
        end_time: end.time,
        duration_minutes: slot.duration_minutes
      }
    });
  };

  const handleCancelEdit = (slotId: number): void => {
    const newEditing = { ...editing };
    const newEditData = { ...editData };
    delete newEditing[slotId];
    delete newEditData[slotId];
    setEditing(newEditing);
    setEditData(newEditData);
  };

  const handleSaveEdit = async (slotId: number): Promise<void> => {
    const data = editData[slotId];
    if (!data) return;

    // Build ISO datetime strings - use start_date for both since sessions are on the same day
    const startDateTime = new Date(`${data.start_date}T${data.start_time}`).toISOString();
    const endDateTime = new Date(`${data.start_date}T${data.end_time}`).toISOString();

    setSaving({ ...saving, [slotId]: true });
    try {
      const response = await axios.put<Slot>(`/api/slots/${slotId}`, {
        start_time: startDateTime,
        end_time: endDateTime,
        duration_minutes: parseInt(String(data.duration_minutes), 10)
      });
      
      if (onSlotUpdated) {
        onSlotUpdated(response.data);
      }
      
      handleCancelEdit(slotId);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update slot');
    } finally {
      setSaving({ ...saving, [slotId]: false });
    }
  };

  const handleEditChange = (slotId: number, field: keyof SlotEditData, value: string | number): void => {
    setEditData({
      ...editData,
      [slotId]: {
        ...editData[slotId],
        [field]: value
      }
    });
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const copyBookingLink = (): void => {
    if (coachBookingLink) {
      const fullLink = `${window.location.origin}/book/${coachBookingLink}`;
      navigator.clipboard.writeText(fullLink);
      alert('Booking link copied to clipboard!');
    }
  };

  const renderBookingLink = (): JSX.Element => (
    <div className="booking-link-section-top">
      <div className="booking-link-display">
        <span className="booking-link-label">Your Booking Link:</span>
        {linkLoading ? (
          <div className="booking-link-loading">Loading booking link...</div>
        ) : linkError ? (
          <div className="booking-link-error">
            {linkError}
              <button 
                onClick={async () => {
                  setLinkLoading(true);
                  setLinkError(null);
                  try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                      setLinkError('Please log in to view booking link');
                      setLinkLoading(false);
                      return;
                    }
                    const res = await axios.get<BookingLinkResponse>('/api/coach/booking-link', {
                      headers: {
                        Authorization: `Bearer ${token}`
                      }
                    });
                    if (res.data && res.data.booking_link) {
                      setCoachBookingLink(res.data.booking_link);
                    } else {
                      setLinkError('Booking link not found');
                    }
                  } catch (err: any) {
                    console.error('Retry failed:', err);
                    const errorMsg = err.response?.data?.error || err.message || 'Failed to load booking link';
                    if (err.response?.status === 404) {
                      setLinkError('Route not found. Please restart the server.');
                    } else {
                      setLinkError(errorMsg);
                    }
                  } finally {
                    setLinkLoading(false);
                  }
                }}
                className="retry-link-btn"
              >
                Retry
              </button>
          </div>
        ) : coachBookingLink ? (
          <div className="booking-link-input-group">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/book/${coachBookingLink}`}
              className="booking-link-input-small"
            />
            <button onClick={copyBookingLink} className="copy-link-btn-small">
              Copy
            </button>
          </div>
        ) : (
          <div className="booking-link-error">No booking link available</div>
        )}
      </div>
    </div>
  );

  if (slots.length === 0) {
    return (
      <div className="slots-list">
        <h2>Your Slots</h2>
        {renderBookingLink()}
        <div className="slots-empty">
          <p>No slots created yet. Create your first slot above!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="slots-list">
      <h2>Your Slots</h2>
      {renderBookingLink()}
      <div className="slots-grid">
        {slots.map((slot) => (
          <div key={slot.id} className="slot-card">
            {editing[slot.id] ? (
              <div className="slot-edit-form">
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={editData[slot.id]?.start_date || ''}
                      onChange={(e) => handleEditChange(slot.id, 'start_date', e.target.value)}
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={editData[slot.id]?.start_time || ''}
                      onChange={(e) => handleEditChange(slot.id, 'start_time', e.target.value)}
                    />
                  </div>
                </div>
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={editData[slot.id]?.end_time || ''}
                      onChange={(e) => handleEditChange(slot.id, 'end_time', e.target.value)}
                    />
                  </div>
                  <div className="edit-form-group duration-group">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={editData[slot.id]?.duration_minutes || ''}
                      onChange={(e) => handleEditChange(slot.id, 'duration_minutes', e.target.value)}
                    />
                  </div>
                </div>
                <div className="edit-actions">
                  <button
                    onClick={() => handleSaveEdit(slot.id)}
                    className="save-btn"
                    disabled={saving[slot.id]}
                  >
                    {saving[slot.id] ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => handleCancelEdit(slot.id)}
                    className="cancel-btn"
                    disabled={saving[slot.id]}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="slot-content-compact">
                  <div className="slot-main-info">
                    <div className="slot-time-compact">
                      {formatDateTime(slot.start_time)} - {new Date(slot.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                    <div className="slot-meta-compact">
                      <span className="slot-duration-compact">{slot.duration_minutes} min</span>
                      <span className={`slot-status-compact ${slot.is_booked ? 'booked' : 'available'}`}>
                        {slot.is_booked ? 'Booked' : 'Available'}
                      </span>
                    </div>
                  </div>
                  <div className="slot-actions-compact">
                    <button
                      onClick={() => handleEdit(slot)}
                      className="edit-btn-compact"
                      disabled={!!slot.is_booked}
                      title="Edit slot"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      className="delete-btn-compact"
                      disabled={!!deleting[slot.id] || !!slot.is_booked}
                      title="Delete slot"
                    >
                      {deleting[slot.id] ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SlotsList;


