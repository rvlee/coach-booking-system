# Testing Guide for Coach Booking System

This guide will help you test all features of the booking system on localhost.

## Prerequisites

1. **Install Dependencies** (if not already done):
   ```bash
   npm run install-all
   ```

2. **Environment Variables** (for Google Calendar):
   - Make sure `server/.env` exists with:
     ```
     GOOGLE_CLIENT_ID=your_client_id
     GOOGLE_CLIENT_SECRET=your_client_secret
     JWT_SECRET=your_jwt_secret
     ```

## Starting the Application

### Option 1: Start Both Servers Together (Recommended)
```bash
npm run dev
```

This starts:
- **Backend**: `http://localhost:3001`
- **Frontend**: `http://localhost:3000`

### Option 2: Start Servers Separately

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

## Accessing the Application

1. Open your browser and go to: **http://localhost:3000**
2. You should see the login page

## Testing Scenarios

### 1. Coach Login/Registration

**Test Login:**
- The system auto-logs in with default credentials:
  - Email: `roylee0628@gmail.com`
  - Password: `kanjani8`
- Or manually log in if you've registered

**Test Registration:**
- Click "Register" tab
- Fill in: Name, Email, Password
- Click "Register"
- You should be redirected to the dashboard

### 2. Coach Dashboard - Create Slots

1. **Navigate to Dashboard:**
   - After login, you'll see the dashboard with tabs: Slots, Bookings, Settings

2. **Create Slots:**
   - Go to "Slots" tab
   - Use the weekly calendar to select days
   - For each day:
     - Check the day checkbox
     - Click "+ Add time slot"
     - Set start time (e.g., 09:00)
     - Set end time (e.g., 17:00)
     - Set duration (e.g., 60 minutes)
   - Click "Create All Slots"
   - Slots should appear in "Your Slots" section

3. **View Booking Link:**
   - In "Your Slots" section, you'll see "Your Booking Link"
   - Copy this link - you'll use it to test client booking

### 3. Test Client Booking (Single Slot)

1. **Get Booking Link:**
   - From the dashboard, copy the booking link
   - Format: `http://localhost:3000/book/[booking-link]`

2. **Open Booking Page:**
   - Open the booking link in a new browser tab/window (or incognito mode)
   - You should see available slots

3. **Book a Slot:**
   - Select a time slot
   - Fill in booking form:
     - Full Name: `Test Client`
     - Email: `test@example.com`
     - Phone: `+1 (555) 123-4567` (optional)
     - Notes: `Test booking` (optional)
   - Click "Confirm Booking"
   - You should see a success message

4. **Verify Booking:**
   - Go back to coach dashboard
   - Check "Bookings" tab
   - You should see the new booking

### 4. Test Shared Class Booking

1. **First Client Books with "Willing to Share":**
   - Open booking link
   - Select a slot
   - Check "I'm willing to share this class with someone else"
   - Fill in form and book
   - Slot should still show as available (60 minutes)

2. **Second Client Books Same Slot:**
   - Open the same booking link again
   - Select the same slot
   - Check "I'm willing to share this class with someone else"
   - Fill in form and book
   - Should see success message indicating shared class

3. **Verify Shared Class:**
   - Go to coach dashboard → Bookings tab
   - You should see both bookings marked as "Shared Class"
   - The slot should now be 90 minutes
   - Both clients should be listed

### 5. Test Google Calendar Integration

**Prerequisites:**
- Google Calendar API credentials set up in `server/.env`
- Google OAuth configured

**Steps:**

1. **Connect Google Calendar:**
   - In coach dashboard → Slots tab
   - Click "Connect" button in the Google Calendar banner
   - Authorize the application
   - You should see "Google Calendar connected"

2. **View Busy Times:**
   - After connecting, busy times from Google Calendar should appear on the weekly calendar
   - They'll show as purple blocks

3. **Test Slot Creation with Google Calendar:**
   - Create a slot that overlaps with a busy time
   - You should see an error preventing creation

4. **Verify Calendar Event Creation:**
   - Create a new slot
   - Check your Google Calendar
   - You should see an event titled "Available Slot"

5. **Test Booking Calendar Update:**
   - Book a slot as a client
   - Check Google Calendar
   - Event should update to "Booked: [Client Name]"
   - Client should receive a calendar invite

6. **Test Shared Class Calendar Update:**
   - Book a slot with "willing to share" (first client)
   - Book the same slot with "willing to share" (second client)
   - Check Google Calendar
   - Event should show "Booked: [Client1] & [Client2] (Shared Class)"
   - Both clients should be attendees
   - Event should be 90 minutes

### 6. Test Settings

1. **Access Settings:**
   - Go to Dashboard → Settings tab

2. **Test Timezone:**
   - Select a timezone (e.g., "America/New_York")
   - Click "Save Settings"
   - Verify it's saved

3. **Test Daily Booking Limit:**
   - Set daily booking limit (e.g., 5)
   - Save settings
   - Try to create more than 5 bookings in one day
   - Should see error when limit is reached

4. **Test Language:**
   - Switch between English and 繁體中文 (Traditional Chinese)
   - Verify UI text changes
   - Save and refresh - language should persist

### 7. Test Slot Management

1. **Edit a Slot:**
   - In "Your Slots" section
   - Click the edit button (✏️) on a slot
   - Change date, time, or duration
   - Click "Save"
   - Verify changes are reflected

2. **Delete a Slot:**
   - Click the delete button (🗑️) on a slot
   - Confirm deletion
   - Slot should be removed

3. **View Booked Slots:**
   - Book a slot as a client
   - In "Your Slots", the slot should show as "Booked"
   - Edit/Delete buttons should be disabled for booked slots

### 8. Test Booking Link Sharing

1. **Get Coach Booking Link:**
   - In "Your Slots" section
   - Copy the booking link

2. **Share with Multiple Clients:**
   - Open the link in multiple browser tabs
   - Each tab shows available slots
   - Book slots from different tabs
   - Verify slots disappear as they're booked

### 9. Test Error Handling

1. **Book Already Booked Slot:**
   - Book a slot
   - Try to book the same slot again
   - Should see error: "This slot is already booked"

2. **Book Slot with Overlap:**
   - Create overlapping slots
   - Should see error preventing creation

3. **Test Daily Limit:**
   - Set daily limit to 1
   - Book one slot
   - Try to book another slot on the same day
   - Should see error about daily limit

## Testing Checklist

- [ ] Coach can log in/register
- [ ] Coach can create slots
- [ ] Coach can view booking link
- [ ] Client can access booking page via link
- [ ] Client can book a slot
- [ ] Booking appears in coach's bookings list
- [ ] Shared class booking works (2 clients)
- [ ] Google Calendar connection works
- [ ] Google Calendar events are created
- [ ] Calendar invites are sent to clients
- [ ] Shared class shows both clients in calendar
- [ ] Settings (timezone, limit, language) work
- [ ] Slot editing works
- [ ] Slot deletion works
- [ ] Daily booking limit is enforced
- [ ] Overlap validation works

## Troubleshooting

### Server Not Starting
- Check if port 3001 is already in use
- Kill the process: `npx kill-port 3001`
- Or change port in `server/index.js`

### Frontend Not Loading
- Check if port 3000 is available
- Verify `npm run dev` is running
- Check browser console for errors

### Google Calendar Not Working
- Verify `.env` file exists in `server/` folder
- Check Google OAuth credentials are correct
- Ensure redirect URI matches: `http://localhost:3001/api/google/callback`

### Database Issues
- Delete `server/database.sqlite` to reset database
- Restart server to recreate tables

### Booking Link Not Working
- Verify server is running on port 3001
- Check that the booking link format is correct
- Ensure the slot exists in the database

## Quick Test Commands

```bash
# Check if servers are running
curl http://localhost:3001/api/health
# Should return: {"status":"ok"}

# Check frontend
# Open: http://localhost:3000
```

## Mobile Testing

To test on mobile device:

1. **Find your computer's IP address:**
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Update Vite config** (temporarily):
   - In `client/vite.config.ts`, add:
     ```typescript
     server: {
       host: '0.0.0.0', // Allow external connections
       port: 3000,
       // ... rest of config
     }
     ```

3. **Access from mobile:**
   - On your phone, go to: `http://[YOUR_IP]:3000`
   - Make sure phone and computer are on same network

## Next Steps

After testing, you can:
- Deploy to production
- Set up environment variables for production
- Configure production Google OAuth redirect URIs
- Set up SSL/HTTPS for production





