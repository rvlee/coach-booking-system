import { Booking, BookingsListProps } from '../types';
import './BookingsList.css';

function BookingsList({ bookings }: BookingsListProps) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const monthBookings = bookings.filter((b) => {
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

  if (bookings.length === 0) {
    return (
      <div className="bookings-empty">
        <p>No bookings yet. Share your booking links with clients!</p>
      </div>
    );
  }

  return (
    <div className="bookings-list">
      <h2>Bookings This Month</h2>
      {summary.length === 0 ? (
        <div className="bookings-empty">
          <p>No bookings yet this month.</p>
        </div>
      ) : (
        <div className="bookings-summary-grid">
          {summary.map((item) => (
            <div key={item.email} className="booking-summary-card">
              <div className="summary-header">
                <div className="summary-name">{item.name}</div>
                <div className="summary-count">{item.count} booking{item.count > 1 ? 's' : ''}</div>
              </div>
              <div className="summary-email">{item.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BookingsList;


