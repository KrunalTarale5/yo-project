import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './App.css';

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Separate states for each practitioner's slots
  const [availableSlots, setAvailableSlots] = useState({
    ashish: {},
    tanuj: {}
  });
  
  // Modified booking states
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState({
    name: '',
    email: ''
  });
  const [bookingStatus, setBookingStatus] = useState({
    loading: false,
    error: null
  });

  // Practitioner data, hardcoded for now
  const practitioners = {
    ashish: {
      name: "Ashish Pandey",
      eventId: 1526454
    },
    tanuj: {
      name: "Tanuj Srivastava",
      eventId: 1526492
    }
  };

  const fetchAvailableSlots = async () => {
    setLoading(true);
    setError(null);
    
    const startTimeString = selectedDate.toISOString().split('T')[0];
    const endTimeString = selectedDate.toISOString().split('T')[0];
    
    try {
      // Fetch slots for both practitioners
      const results = await Promise.all([
        fetchPractitionerSlots(practitioners.ashish.eventId, startTimeString, endTimeString),
        fetchPractitionerSlots(practitioners.tanuj.eventId, startTimeString, endTimeString)
      ]);

      setAvailableSlots({
        ashish: results[0],
        tanuj: results[1]
      });
      
      setDisplayDate(selectedDate);
    } catch (error) {
      setError('Failed to fetch available slots');
    } finally {
      setLoading(false);
    }
  };

  const fetchPractitionerSlots = async (eventId, startTime, endTime) => {
    const url = `https://api.cal.com/v2/slots/available?startTime=${startTime}T03%3A30%3A00.000Z&endTime=${endTime}T16%3A30%3A00.000Z&eventTypeId=${eventId}&slotFormat=range`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'cal_live_45350ef1407c97c53da828c9b90127f1',
      }
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.status === 'success' ? data.data.slots : {};
  };

  const handleBookSlot = (slot, practitionerId) => {
    setSelectedSlot(slot);
    setSelectedPractitioner(practitioners[practitionerId]);
    setShowConfirmation(true);
    setBookingData({ name: '', email: '' });
    setBookingStatus({ loading: false, error: null });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const confirmBooking = async () => {
    if (!bookingData.name.trim() || !bookingData.email.trim()) {
      setBookingStatus({
        loading: false,
        error: 'Please fill in all fields.'
      });
      return;
    }

    setBookingStatus({ loading: true, error: null });

    try {
      const response = await fetch('https://api.cal.com/v2/bookings', {
        method: 'POST',
        headers: {
          'Authorization': 'cal_live_45350ef1407c97c53da828c9b90127f1',
          'Content-Type': 'application/json',
          'cal-api-version': '2024-08-13'
        },
        body: JSON.stringify({
          eventTypeId: selectedPractitioner.eventId,    // this is hardcoded for now, event type is hardcoded for now
          start: selectedSlot.startTime,
          attendee: {
            name: bookingData.name,
            email: bookingData.email,
            timeZone: 'Asia/Kolkata'
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to book appointment');
      }

      alert('Booking confirmed successfully!');
      setShowConfirmation(false);
      fetchAvailableSlots();
    } catch (error) {
      setBookingStatus({
        loading: false,
        error: error.message
      });
    }
  };

  const formatTimeToIST = (utcTimeString) => {
    try {
      const date = new Date(utcTimeString);
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }).format(date);
    } catch (error) {
      console.error('Error formatting time:', error);
      return utcTimeString;
    }
  };

  const renderConfirmationModal = () => {
    if (!showConfirmation) return null;

    return (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Book Appointment with {selectedPractitioner.name}</h3>
          <p>Selected Date:</p>
          <p className="booking-date">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p>Selected time slot:</p>
          <p className="booking-time">
            {selectedSlot && `${formatTimeToIST(selectedSlot.startTime)} - ${formatTimeToIST(selectedSlot.endTime)}`}
          </p>
          
          <form className="booking-form">
            <div className="form-group">
              <label htmlFor="name">Name:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={bookingData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={bookingData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            {bookingStatus.error && (
              <p className="error-message">{bookingStatus.error}</p>
            )}
          </form>

          <div className="modal-buttons">
            <button 
              onClick={() => setShowConfirmation(false)}
              disabled={bookingStatus.loading}
            >
              Cancel
            </button>
            <button 
              onClick={confirmBooking} 
              className="confirm-button"
              disabled={bookingStatus.loading}
            >
              {bookingStatus.loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getAvailableSlotsForDate = (slots, date) => {
    const dateString = date.toISOString().split('T')[0];
    return slots[dateString] || [];
  };

  return (
    <div className="App">
      <h1 className="page-title">Schedule Consultation</h1>
      
      <div className="booking-container">
        {/* Left Section - Calendar */}
        <div className="calendar-section">
          <div className="calendar-header">
            <h2 className="calendar-title">Select a Date</h2>
            <div className="timezone-selector">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="6" x2="12" y2="12"/>
                <line x1="12" y1="12" x2="16" y2="14"/>
              </svg>
              <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
          </div>

          <DatePicker
            selected={selectedDate}
            onChange={async (date) => {
              setSelectedDate(date);
              setLoading(true);
              try {
                await fetchAvailableSlots();
              } catch (error) {
                setError('Failed to fetch slots');
              }
            }}
            inline
            calendarClassName="calendar-custom"
            minDate={new Date()}
            showPopperArrow={false}
            monthsShown={1}
            fixedHeight
          />

          <button 
            className={`check-slots-button ${loading ? 'loading' : ''}`}
            onClick={fetchAvailableSlots}
            disabled={loading}
          >
            {loading ? <span className="loading-spinner"></span> : 'Check Available Slots'}
          </button>
        </div>

        {/* Right Section - Available Times */}
        {displayDate && (
          <div className="slots-section">
            <div className="slots-header">
              <h2 className="slots-title">Available Times</h2>
              <p className="selected-date">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="practitioners-tabs">
              {Object.entries(practitioners).map(([id, practitioner], index) => (
                <button
                  key={id}
                  className={`tab-button ${(!selectedPractitioner && index === 0) || selectedPractitioner?.eventId === practitioner.eventId ? 'active' : ''}`}
                  onClick={() => setSelectedPractitioner(practitioner)}
                >
                  {practitioner.name}
                </button>
              ))}
            </div>

            <div className="time-slots-container">
              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading available slots...</p>
                </div>
              ) : (
                <div className="slots-grid">
                  {Object.entries(practitioners).map(([id, practitioner]) => {
                    if ((!selectedPractitioner && id === 'ashish') || 
                        (selectedPractitioner?.eventId === practitioner.eventId)) {
                      const availableSlotsList = getAvailableSlotsForDate(availableSlots[id], displayDate);
                      return availableSlotsList.length > 0 ? (
                        availableSlotsList.map((slot, idx) => (
                          <button
                            key={idx}
                            className="time-slot"
                            onClick={() => handleBookSlot(slot, id)}
                          >
                            {formatTimeToIST(slot.startTime)}
                          </button>
                        ))
                      ) : (
                        <div key={id} className="no-slots-message">
                          No available slots for this date.
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}
      {renderConfirmationModal()}
    </div>
  );
}

export default App;