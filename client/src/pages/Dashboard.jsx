import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import SlotsList from '../components/SlotsList';
import CreateSlot from '../components/CreateSlot';
import BookingsList from '../components/BookingsList';
import './Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('slots');
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsRefreshTrigger, setSlotsRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [slotsRes, bookingsRes] = await Promise.all([
        axios.get('/api/slots'),
        axios.get('/api/coach/bookings')
      ]);
      setSlots(slotsRes.data);
      setBookings(bookingsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotCreated = (newSlot) => {
    setSlots((prevSlots) => [...prevSlots, newSlot]);
  };

  const handleSlotsCreated = (newSlots) => {
    if (Array.isArray(newSlots)) {
      setSlots((prevSlots) => [...prevSlots, ...newSlots]);
    } else {
      handleSlotCreated(newSlots);
    }
    setSlotsRefreshTrigger(prev => prev + 1); // Trigger calendar refresh
  };

  const handleSlotDeleted = (slotId) => {
    setSlots(slots.filter(s => s.id !== slotId));
    setSlotsRefreshTrigger(prev => prev + 1); // Trigger calendar refresh
  };

  const handleSlotUpdated = (updatedSlot) => {
    setSlots(slots.map(s => s.id === updatedSlot.id ? updatedSlot : s));
    setSlotsRefreshTrigger(prev => prev + 1); // Trigger calendar refresh
  };

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome, {user?.name}</h1>
          <p className="dashboard-subtitle">Manage your booking slots</p>
        </div>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <div className="dashboard-tabs">
        <button
          className={activeTab === 'slots' ? 'active' : ''}
          onClick={() => setActiveTab('slots')}
        >
          Slots
        </button>
        <button
          className={activeTab === 'bookings' ? 'active' : ''}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings
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
      </div>
    </div>
  );
}

export default Dashboard;

