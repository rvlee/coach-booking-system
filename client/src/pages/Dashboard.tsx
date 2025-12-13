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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    try {
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

  const handleSlotDeleted = (slotId: number): void => {
    setSlots(slots.filter(s => s.id !== slotId));
    setSlotsRefreshTrigger(prev => prev + 1);
  };

  const handleSlotUpdated = (updatedSlot: Slot): void => {
    setSlots(slots.map(s => s.id === updatedSlot.id ? updatedSlot : s));
    setSlotsRefreshTrigger(prev => prev + 1);
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
            />
            <SlotsList
              slots={slots}
              onSlotDeleted={handleSlotDeleted}
              onSlotUpdated={handleSlotUpdated}
            />
          </>
        )}

        {activeTab === 'bookings' && (
          <BookingsList bookings={bookings} />
        )}

        {activeTab === 'settings' && (
          <Settings />
        )}
      </div>
    </div>
  );
}

export default Dashboard;

