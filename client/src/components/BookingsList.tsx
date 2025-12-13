import { Booking, BookingsListProps } from '../types';
import './BookingsList.css';

function BookingsList({ bookings }: BookingsListProps) {
  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (bookings.length === 0) {
    return (
      <div className="bookings-empty">
        <p>No bookings yet. Share your booking links with clients!</p>
      </div>
    );
  }

  return (
    <div className="bookings-list">
      <h2>All Bookings</h2>
      <div className="bookings-grid">
        {bookings.map((booking: Booking) => (
          <div key={booking.id} className="booking-card">
            <div className="booking-header">
              <h3>{booking.client_name}</h3>
              <span className={`booking-status ${booking.status}`}>
                {booking.status}
              </span>
            </div>

            <div className="booking-details">
              {booking.is_shared && (
                <div className="shared-badge">
                  <span>👥 Shared Class</span>
                  {booking.shared_with_name && (
                    <span className="shared-with">with {booking.shared_with_name}</span>
                  )}
                </div>
              )}
              {booking.willing_to_share && !booking.is_shared && (
                <div className="shareable-badge">
                  <span>✓ Willing to Share</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <span className="detail-value">{booking.client_email}</span>
              </div>
              {booking.client_phone && (
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{booking.client_phone}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Session Time</span>
                <span className="detail-value">
                  {formatDateTime(booking.start_time)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Duration</span>
                <span className="detail-value">{booking.duration_minutes} minutes</span>
              </div>
              {booking.notes && (
                <div className="detail-item">
                  <span className="detail-label">Notes</span>
                  <span className="detail-value">{booking.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BookingsList;


