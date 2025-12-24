import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import SlotsList from '../components/SlotsList';
import CreateSlot from '../components/CreateSlot';
import BookingsList from '../components/BookingsList';
import Settings from './Settings';
import { Slot, Booking } from '../types';
import './Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings' | 'settings'>('slots');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [slotsRefreshTrigger, setSlotsRefreshTrigger] = useState<number>(0);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);

  // Helper function to get week start (Monday)
  const getWeekStart = (dateStr: string): string => {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0-6 (Sun-Sat)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().slice(0, 10);
  };

  // Helper function to get week days
  const getWeekDays = (weekStartStr: string): string[] => {
    const days: string[] = [];
    const start = new Date(weekStartStr);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  };

  useEffect(() => {
    fetchData();
    // Set initial week to current week
    const today = new Date().toISOString().slice(0, 10);
    setSelectedWeekStart(getWeekStart(today));
  }, []);

  const fetchData = async (): Promise<void> => {
    try {
      // Sync bookings with Google Calendar first (non-blocking)
      axios.post('/api/google/sync').catch(err => {
        console.log('Sync skipped or failed (non-fatal):', err.response?.data || err.message);
      });
      
      const [slotsRes, bookingsRes] = await Promise.all([
        axios.get<Slot[]>('/api/slots'),
        axios.get<Booking[]>('/api/coach/bookings')
      ]);
      setSlots(slotsRes.data);
      setBookings(bookingsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotCreated = (newSlot: Slot): void => {
    setSlots((prevSlots) => [...prevSlots, newSlot]);
  };

  const handleSlotsCreated = (newSlots: Slot | Slot[]): void => {
    if (Array.isArray(newSlots)) {
      setSlots((prevSlots) => [...prevSlots, ...newSlots]);
    } else {
      handleSlotCreated(newSlots);
    }
    setSlotsRefreshTrigger(prev => prev + 1);
  };

  const handleSlotDeleted = async (slotId: number): Promise<void> => {
    // Update local state immediately for responsive UI
    setSlots(slots.filter(s => s.id !== slotId));
    setSlotsRefreshTrigger(prev => prev + 1);
    
    // Refetch all slots to ensure UI is in sync with server
    try {
      const slotsRes = await axios.get<Slot[]>('/api/slots');
      setSlots(slotsRes.data);
    } catch (error) {
      console.error('Error refreshing slots after deletion:', error);
    }
  };

  const handleSlotUpdated = (updatedSlot: Slot): void => {
    setSlots(slots.map(s => s.id === updatedSlot.id ? updatedSlot : s));
    setSlotsRefreshTrigger(prev => prev + 1);
  };

  const handleWeekChange = (weekStart: string): void => {
    setSelectedWeekStart(weekStart);
  };

  const handleBookingCancelled = async (): Promise<void> => {
    // Refresh both slots and bookings after cancellation
    await fetchData();
  };

  // Filter slots by selected week
  const getWeekSlots = (): Slot[] => {
    if (!selectedWeekStart) {
      // If no week selected yet, show current week
      const today = new Date().toISOString().slice(0, 10);
      const currentWeekStart = getWeekStart(today);
      return filterSlotsByWeek(slots, currentWeekStart);
    }
    return filterSlotsByWeek(slots, selectedWeekStart);
  };

  // Helper function to filter slots by week
  const filterSlotsByWeek = (allSlots: Slot[], weekStartStr: string): Slot[] => {
    const weekDays = getWeekDays(weekStartStr);
    const weekStart = new Date(weekDays[0] + 'T00:00:00');
    const weekEnd = new Date(weekDays[6] + 'T23:59:59.999');
    
    return allSlots.filter((slot) => {
      if (!slot.start_time) return false;
      const slotDate = new Date(slot.start_time);
      return slotDate >= weekStart && slotDate <= weekEnd;
    });
  };

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>{t.dashboard.welcome}, {user?.name}</h1>
          <p className="dashboard-subtitle">{t.dashboard.subtitle}</p>
        </div>
        <button onClick={logout} className="logout-btn">{t.dashboard.logout}</button>
      </header>

      <div className="dashboard-tabs">
        <button
          className={activeTab === 'slots' ? 'active' : ''}
          onClick={() => setActiveTab('slots')}
          type="button"
        >
          {t.dashboard.slots}
        </button>
        <button
          className={activeTab === 'bookings' ? 'active' : ''}
          onClick={() => setActiveTab('bookings')}
          type="button"
        >
          {t.dashboard.bookings}
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
          type="button"
        >
          {t.dashboard.settings}
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'slots' && (
          <>
            <CreateSlot 
              onSlotCreated={handleSlotsCreated}
              slotsRefreshTrigger={slotsRefreshTrigger}
              onWeekChange={handleWeekChange}
            />
            <SlotsList
              slots={getWeekSlots()}
              onSlotDeleted={handleSlotDeleted}
              onSlotUpdated={handleSlotUpdated}
            />
          </>
        )}

        {activeTab === 'bookings' && (
          <BookingsList bookings={bookings} onBookingCancelled={handleBookingCancelled} />
        )}

        {activeTab === 'settings' && (
          <Settings />
        )}
      </div>
    </div>
  );
}

export default Dashboard;

