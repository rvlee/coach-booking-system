import { useState } from 'react';
import axios from 'axios';
import { Booking, BookingsListProps } from '../types';
import { useLanguage } from '../context/LanguageContext';
import './BookingsList.css';

function BookingsList({ bookings, onBookingCancelled }: BookingsListProps) {
  const { t } = useLanguage();
  const [cancelling, setCancelling] = useState<Record<number, boolean>>({});
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const handleCancelBooking = async (bookingId: number): Promise<void> => {
    if (!confirm(t.bookingsList.cancelConfirm)) return;

    setCancelling({ ...cancelling, [bookingId]: true });
    try {
      await axios.delete(`/api/bookings/${bookingId}`);
      if (onBookingCancelled) {
        onBookingCancelled();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || t.bookingsList.cancelError);
    } finally {
      setCancelling({ ...cancelling, [bookingId]: false });
    }
  };

  // Filter to only confirmed bookings
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');

  const monthBookings = confirmedBookings.filter((b) => {
    const date = new Date(b.start_time || b.created_at || '');
    return date >= monthStart && date <= monthEnd;
  });

  // Aggregate per client (by email, with name for display)
  const summaryMap = new Map<string, { name: string; email: string; count: number }>();
  monthBookings.forEach((b) => {
    const key = b.client_email;
    if (!key) return;
    const existing = summaryMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      summaryMap.set(key, {
        name: b.client_name || b.client_email,
        email: b.client_email,
        count: 1
      });
    }
  });

  const summary = Array.from(summaryMap.values()).sort((a, b) => b.count - a.count);

  if (confirmedBookings.length === 0) {
    return (
      <div className="bookings-empty">
        <p>{t.bookingsList.noBookings}</p>
      </div>
    );
  }

  return (
    <div className="bookings-list">
      <h2>{t.bookingsList.thisMonth}</h2>
      {summary.length === 0 ? (
        <div className="bookings-empty">
          <p>{t.bookingsList.noBookingsMonth}</p>
        </div>
      ) : (
        <>
          <div className="bookings-summary-grid">
            {summary.map((item) => (
              <div key={item.email} className="booking-summary-card">
                <div className="summary-header">
                  <div className="summary-name">{item.name}</div>
                  <div className="summary-count">{item.count} {item.count > 1 ? t.bookingsList.bookings : t.bookingsList.booking}</div>
                </div>
                <div className="summary-email">{item.email}</div>
              </div>
            ))}
          </div>
          <div className="bookings-detail-section">
            <h3>{t.bookingsList.allBookings}</h3>
            <div className="bookings-detail-list">
              {confirmedBookings
                .sort((a, b) => {
                  const dateA = new Date(a.start_time || a.created_at || '').getTime();
                  const dateB = new Date(b.start_time || b.created_at || '').getTime();
                  return dateB - dateA;
                })
                .map((booking) => (
                  <div key={booking.id} className="booking-detail-card">
                    <div className="booking-detail-info">
                      <div className="booking-detail-name">{booking.client_name}</div>
                      <div className="booking-detail-email">{booking.client_email}</div>
                      <div className="booking-detail-time">
                        {booking.start_time
                          ? new Date(booking.start_time).toLocaleString(t.language === 'zh-TW' ? 'zh-TW' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })
                          : t.bookingsList.timeTBD}
                      </div>
                      {booking.is_shared && booking.shared_with_name && (
                        <div className="booking-detail-shared">
                          {t.bookingsList.sharedWith} {booking.shared_with_name}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="cancel-booking-btn"
                      disabled={cancelling[booking.id]}
                    >
                      {cancelling[booking.id] ? t.bookingsList.cancelling : t.bookingsList.cancel}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default BookingsList;


