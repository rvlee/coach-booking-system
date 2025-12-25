import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SlotsListProps, Slot, SlotEditData, BookingLinkResponse } from '../types';
import { useLanguage } from '../context/LanguageContext';
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
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});
  const [editing, setEditing] = useState<Record<number, boolean>>({});
  const [editData, setEditData] = useState<Record<number, SlotEditData>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [coachBookingLink, setCoachBookingLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState<boolean>(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set());
  const [deletingBatch, setDeletingBatch] = useState<boolean>(false);
  const [slotsListHeight, setSlotsListHeight] = useState<number>(500);
  const [isResizingSlotsList, setIsResizingSlotsList] = useState<boolean>(false);
  const resizeStateRef = React.useRef<{ startY: number; startHeight: number } | null>(null);

  // Resize handlers for slots list section
  const handleSlotsListMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault();
    const slotsList = document.querySelector('.slots-list');
    if (slotsList) {
      const rect = slotsList.getBoundingClientRect();
      resizeStateRef.current = {
        startY: e.clientY,
        startHeight: rect.height
      };
      setIsResizingSlotsList(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (isResizingSlotsList && resizeStateRef.current) {
        // Calculate height change: dragging up (smaller clientY) increases height
        const deltaY = resizeStateRef.current.startY - e.clientY;
        const newHeight = resizeStateRef.current.startHeight + deltaY;
        if (newHeight >= 200 && newHeight <= 1000) {
          setSlotsListHeight(newHeight);
        }
      }
    };

    const handleMouseUp = (): void => {
      setIsResizingSlotsList(false);
      resizeStateRef.current = null;
    };

    if (isResizingSlotsList) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingSlotsList]);

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
      await onSlotDeleted(slotId);
      // Remove from selected if it was selected
      const newSelected = new Set(selectedSlots);
      newSelected.delete(slotId);
      setSelectedSlots(newSelected);
    } catch (error) {
      alert('Failed to delete slot');
    } finally {
      setDeleting({ ...deleting, [slotId]: false });
    }
  };

  const handleToggleSelect = (slotId: number): void => {
    const newSelected = new Set(selectedSlots);
    if (newSelected.has(slotId)) {
      newSelected.delete(slotId);
    } else {
      newSelected.add(slotId);
    }
    setSelectedSlots(newSelected);
  };

  const handleSelectAll = (): void => {
    // Only select available (not booked) slots
    const availableSlots = slots.filter(slot => !slot.is_booked);
    if (selectedSlots.size === availableSlots.length) {
      // Deselect all
      setSelectedSlots(new Set());
    } else {
      // Select all available
      setSelectedSlots(new Set(availableSlots.map(slot => slot.id)));
    }
  };

  const handleDeleteSelected = async (): Promise<void> => {
    if (selectedSlots.size === 0) return;

    const count = selectedSlots.size;
    const confirmTemplate = t.slotsList?.confirmDeleteSelected || 'Are you sure you want to delete {{count}} slot(s)?';
    const confirmMessage = confirmTemplate.replace(/\{\{count\}\}/g, String(count));
    if (!confirm(confirmMessage)) return;

    setDeletingBatch(true);
    try {
      const slotIds = Array.from(selectedSlots);
      const response = await axios.post('/api/slots/delete-batch', { slotIds });
      
      // Remove deleted slots from selection and trigger callbacks
      const deletedIds = response.data.deletedIds || [];
      
      // Call onSlotDeleted for each deleted slot
      // The parent component will handle refreshing the slots list
      for (const id of deletedIds) {
        await onSlotDeleted(id);
      }
      
      // Clear selection
      setSelectedSlots(new Set());
      
      if (response.data.errors && response.data.errors.length > 0) {
        alert(`Deleted ${deletedIds.length} slot(s), but ${response.data.errors.length} failed.`);
      } else {
        alert(`Successfully deleted ${deletedIds.length} slot(s).`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to delete selected slots';
      alert(errorMsg);
    } finally {
      setDeletingBatch(false);
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
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDate = new Date(date);
    slotDate.setHours(0, 0, 0, 0);
    
    const isToday = slotDate.getTime() === today.getTime();
    const isTomorrow = slotDate.getTime() === today.getTime() + 86400000;
    
    if (isToday) {
      return t.language === 'zh-TW' ? '今天' : 'Today';
    } else if (isTomorrow) {
      return t.language === 'zh-TW' ? '明天' : 'Tomorrow';
    }
    
    return date.toLocaleDateString(t.language === 'zh-TW' ? 'zh-TW' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const getDateString = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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
              {t.slotsList.copy}
            </button>
          </div>
        ) : (
          <div className="booking-link-error">{t.slotsList.noBookingLink}</div>
        )}
      </div>
    </div>
  );

  if (slots.length === 0) {
    return (
      <div className="slots-list resizable-section" style={{ height: `${slotsListHeight}px` }}>
        <h2>{t.slotsList.yourSlots}</h2>
        {renderBookingLink()}
        <div className="slots-empty">
          <p>{t.slotsList.noSlots}</p>
        </div>
        <div 
          className="resize-handle"
          onMouseDown={handleSlotsListMouseDown}
          style={{ cursor: 'ns-resize' }}
        >
          <div className="resize-handle-line"></div>
        </div>
      </div>
    );
  }

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const dateKey = getDateString(slot.start_time);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, typeof slots>);

  // Sort dates
  const sortedDates = Object.keys(slotsByDate).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Get available slots for select all functionality
  const availableSlots = slots.filter(slot => !slot.is_booked);
  const allAvailableSelected = availableSlots.length > 0 && availableSlots.every(slot => selectedSlots.has(slot.id));

  return (
    <div className="slots-list" style={{ height: `${slotsListHeight}px` }}>
      <div 
        className="resize-handle"
        onMouseDown={handleSlotsListMouseDown}
        style={{ cursor: 'ns-resize' }}
      >
        <div className="resize-handle-line"></div>
      </div>
      <div style={{ marginTop: '8px' }}>
        <h2>{t.slotsList.yourSlots}</h2>
        {renderBookingLink()}
      {slots.length > 0 && (
        <div className="batch-actions">
          <label className="select-all-checkbox">
            <input
              type="checkbox"
              checked={allAvailableSelected}
              onChange={handleSelectAll}
              disabled={availableSlots.length === 0}
            />
            <span>{t.slotsList.selectAll}</span>
          </label>
          {selectedSlots.size > 0 && (
            <div className="batch-actions-right">
              <span className="selected-count">
                {(t.slotsList?.selectedCount || '{{count}} selected').replace(/\{\{count\}\}/g, String(selectedSlots.size))}
              </span>
              <button
                onClick={handleDeleteSelected}
                className="delete-selected-btn"
                disabled={deletingBatch}
              >
                {deletingBatch ? (t.slotsList?.saving || 'Saving...') : (t.slotsList?.deleteSelected || 'Delete Selected')}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="slots-by-date">
        {sortedDates.map((dateKey) => {
          const daySlots = slotsByDate[dateKey];
          const sortedDaySlots = [...daySlots].sort((a, b) => {
            return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
          });
          
          return (
            <div key={dateKey} className="slots-day-group">
              <div className="slots-day-header">
                <h3 className="slots-day-title">{formatDateHeader(daySlots[0].start_time)}</h3>
                <span className="slots-day-count">
                  {daySlots.length} {daySlots.length === 1 ? (t.slotsList?.slot || 'slot') : (t.slotsList?.slots || 'slots')}
                </span>
              </div>
              <div className="slots-day-grid">
                {sortedDaySlots.map((slot) => (
                  <div key={slot.id} className="slot-card">
                    {editing[slot.id] ? (
                    <div className="slot-edit-form">
                      <div className="edit-form-row">
                        <div className="edit-form-group">
                          <label>{t.slotsList.startDate}</label>
                          <input
                            type="date"
                            value={editData[slot.id]?.start_date || ''}
                            onChange={(e) => handleEditChange(slot.id, 'start_date', e.target.value)}
                          />
                        </div>
                        <div className="edit-form-group">
                          <label>{t.slotsList.startTime}</label>
                          <input
                            type="time"
                            value={editData[slot.id]?.start_time || ''}
                            onChange={(e) => handleEditChange(slot.id, 'start_time', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="edit-form-row">
                        <div className="edit-form-group">
                          <label>{t.slotsList.endTime}</label>
                          <input
                            type="time"
                            value={editData[slot.id]?.end_time || ''}
                            onChange={(e) => handleEditChange(slot.id, 'end_time', e.target.value)}
                          />
                        </div>
                        <div className="edit-form-group duration-group">
                          <label>{t.slotsList.duration}</label>
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
                          {saving[slot.id] ? t.slotsList.saving : t.slotsList.save}
                        </button>
                        <button
                          onClick={() => handleCancelEdit(slot.id)}
                          className="cancel-btn"
                          disabled={saving[slot.id]}
                        >
                          {t.slotsList.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="slot-content-compact">
                        <div className="slot-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedSlots.has(slot.id)}
                            onChange={() => handleToggleSelect(slot.id)}
                            disabled={!!slot.is_booked}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="slot-content-wrapper">
                          <div className="slot-main-info">
                            <div className="slot-time-compact">
                              {formatDateTime(slot.start_time)} - {new Date(slot.end_time).toLocaleTimeString(t.language === 'zh-TW' ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' })}
                            </div>
                            <div className="slot-meta-compact">
                              <span className="slot-duration-compact">{slot.duration_minutes} min</span>
                              <span className={`slot-status-compact ${slot.is_booked ? 'booked' : 'available'}`}>
                                {slot.is_booked ? t.slotsList.booked : t.slotsList.available}
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
                      </div>
                    </>
                  )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

export default SlotsList;




