# Coach Booking System

A mobile-responsive web application for coaches to manage booking slots and for clients to book available time slots.

## Features

- **Coach Dashboard**: Create, view, and manage booking slots
- **Client Booking**: Simple booking interface accessible via shareable links
- **Google Calendar Integration**: Sync with Google Calendar to show busy times and create events
- **Shared Class Bookings**: Clients can opt to share classes, automatically pairing with other participants
- **Mobile Responsive**: Optimized for mobile devices (iPhone compatible)
- **Authentication**: Secure login/registration for coaches
- **Real-time Availability**: Check slot availability before booking
- **Batch Slot Creation**: Create multiple slots at once with day-by-day configuration

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Authentication**: JWT tokens

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install all dependencies:
```bash
npm run install-all
```

2. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend development server on `http://localhost:3000`

### Manual Setup

If you prefer to set up manually:

**Backend:**
```bash
cd server
npm install
npm run dev
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

## Usage

1. **Register/Login**: Create a coach account or login at `http://localhost:3000/login`

2. **Create Slots**: 
   - Go to the Dashboard
   - Click on "Slots" tab
   - Fill in the slot details (start time, end time, duration)
   - Click "Create Slot"

3. **Share Booking Link**:
   - After creating a slot, click "Copy Booking Link"
   - Share this link with your clients

4. **Client Booking**:
   - Clients visit the booking link
   - Fill in their details
   - Confirm the booking

5. **View Bookings**:
   - Go to the "Bookings" tab in the dashboard
   - See all confirmed bookings

## Project Structure

```
coach-booking-system/
├── server/
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   ├── database.js      # Database setup
│   └── index.js         # Server entry point
├── client/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context
│   │   └── App.jsx      # Main app component
│   └── vite.config.js   # Vite configuration
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new coach
- `POST /api/auth/login` - Login coach

### Slots
- `GET /api/slots` - Get all slots (authenticated)
- `POST /api/slots` - Create new slot (authenticated)
- `GET /api/slots/link/:bookingLink` - Get slot by booking link (public)
- `PUT /api/slots/:id` - Update slot (authenticated)
- `DELETE /api/slots/:id` - Delete slot (authenticated)

### Bookings
- `POST /api/bookings` - Create booking (public, supports `willing_to_share` option)
- `GET /api/bookings/:id` - Get booking details

### Google Calendar
- `GET /api/google/auth` - Start Google OAuth flow (authenticated)
- `GET /api/google/callback` - OAuth callback
- `GET /api/google/status` - Check Google Calendar connection status (authenticated)
- `GET /api/google/busy?date=YYYY-MM-DD` - Get busy times for a date (authenticated)

### Coach
- `GET /api/coach/profile` - Get coach profile (authenticated)
- `GET /api/coach/bookings` - Get all bookings (authenticated)

## Environment Variables

Create a `.env` file in the `server` directory:

```
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/google/callback
```

### Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3001/api/google/callback` to Authorized redirect URIs
6. Add your Google account as a test user in OAuth consent screen
7. Copy the Client ID and Client Secret to your `.env` file

## Production Deployment

1. Build the frontend:
```bash
cd client
npm run build
```

2. Serve the built files from the `client/dist` directory

3. Set up proper environment variables for production

4. Use a production database (PostgreSQL recommended for production)

## License

MIT

