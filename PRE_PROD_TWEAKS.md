# Pre-Production Tweaks Applied

## Changes Made

### 1. ✅ Booking Slots Now Show Current Week Only

**Problem:** The booking page was showing all available slots regardless of date.

**Solution:** Updated the backend endpoint `/api/slots/coach/:coachLink` to filter slots by the current week (Monday to Sunday).

**File Changed:** `server/routes/slots.js`

**What Changed:**
- Added week boundary calculation (Monday to Sunday of current week)
- Filtered SQL query to only return slots within the current week
- Slots are now ordered by start time within the week

**How It Works:**
- Calculates Monday of the current week
- Calculates Sunday of the current week
- Only returns slots where `start_time` falls between Monday 00:00:00 and Sunday 23:59:59

**Testing:**
- Create slots for different weeks
- Visit booking link
- Only slots from the current week should appear

---

### 2. ✅ Google OAuth Available to Anyone

**Problem:** Google OAuth was restricted to test users only (roylee0628@gmail.com).

**Solution:** Created a guide for publishing the OAuth app in Google Cloud Console.

**File Created:** `GOOGLE_OAUTH_PUBLISH.md`

**What You Need to Do:**

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/
   - Navigate to "APIs & Services" → "OAuth consent screen"

2. **Complete Required Information:**
   - App name, support email
   - Privacy policy URL (required)
   - Terms of service URL (required)

3. **Create Privacy Policy & Terms Pages:**
   - Create simple HTML pages
   - Host them on your website
   - Add links in OAuth consent screen

4. **Publish the App:**
   - Click "PUBLISH APP" button
   - Confirm the action
   - Wait for verification (if required)

**See `GOOGLE_OAUTH_PUBLISH.md` for detailed step-by-step instructions.**

---

## Testing Checklist

Before going to production, test:

### Booking Slots (Current Week)
- [ ] Create slots for current week - should appear in booking link
- [ ] Create slots for next week - should NOT appear in booking link
- [ ] Create slots for last week - should NOT appear in booking link
- [ ] Verify slots are ordered by time within the week

### Google OAuth (Anyone Can Use)
- [ ] Follow steps in `GOOGLE_OAUTH_PUBLISH.md`
- [ ] Publish OAuth app in Google Cloud Console
- [ ] Test with a Google account NOT in test users list
- [ ] Verify calendar connection works
- [ ] Verify calendar events are created

---

## Files Modified

1. `server/routes/slots.js` - Added week filtering to coach slots endpoint
2. `GOOGLE_OAUTH_PUBLISH.md` - Created guide for publishing OAuth app

---

## Next Steps

1. ✅ Test booking slots show only current week
2. ✅ Publish Google OAuth app (follow `GOOGLE_OAUTH_PUBLISH.md`)
3. ✅ Test with different Google accounts
4. ✅ Deploy to production

---

## Notes

- **Week Definition:** Monday 00:00:00 to Sunday 23:59:59 (local time)
- **OAuth Publishing:** May require 1-7 days for Google review if verification is needed
- **Privacy Policy:** Required for OAuth publishing - create simple pages or use a generator

