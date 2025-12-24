# How to Make Google OAuth Available to Anyone

By default, Google OAuth apps are in "Testing" mode, which only allows specific test users. To make your booking system available to anyone, you need to **publish your OAuth app**.

## Step-by-Step Guide

### Step 1: Go to Google Cloud Console

1. Go to **https://console.cloud.google.com/**
2. Select your project (the one you created for the booking system)

### Step 2: Navigate to OAuth Consent Screen

1. In the left sidebar, go to **"APIs & Services"** → **"OAuth consent screen"**
2. You should see your app configuration

### Step 3: Complete Required Information

Before publishing, make sure all required fields are filled:

1. **App Information:**
   - ✅ App name: "Coach Booking System" (or your preferred name)
   - ✅ User support email: Your email address
   - ✅ App logo: (Optional but recommended)

2. **App Domain:**
   - ✅ Application home page: `https://your-frontend-domain.com`
   - ✅ Application privacy policy link: (Required for publishing)
   - ✅ Application terms of service link: (Required for publishing)
   - ✅ Authorized domains: Add your domain (e.g., `yourdomain.com`)

3. **Developer Contact Information:**
   - ✅ Email addresses: Your email

4. **Scopes:**
   - ✅ Make sure `https://www.googleapis.com/auth/calendar` is listed

### Step 4: Create Privacy Policy and Terms of Service

**You need to create these pages before publishing:**

#### Option A: Simple Pages (Quick Solution)

Create two simple HTML pages and host them:

**Privacy Policy** (`privacy.html`):
```html
<!DOCTYPE html>
<html>
<head>
    <title>Privacy Policy - Coach Booking System</title>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p>Last updated: [Date]</p>
    <h2>Data Collection</h2>
    <p>We collect the following information:</p>
    <ul>
        <li>Name and email address for booking purposes</li>
        <li>Google Calendar access (with your permission) to manage appointments</li>
    </ul>
    <h2>Data Usage</h2>
    <p>Your data is used solely for:</p>
    <ul>
        <li>Managing your bookings</li>
        <li>Sending calendar invitations</li>
        <li>Communicating about your appointments</li>
    </ul>
    <h2>Data Storage</h2>
    <p>Your data is stored securely and is not shared with third parties.</p>
    <h2>Contact</h2>
    <p>For questions, contact: [your-email@example.com]</p>
</body>
</html>
```

**Terms of Service** (`terms.html`):
```html
<!DOCTYPE html>
<html>
<head>
    <title>Terms of Service - Coach Booking System</title>
</head>
<body>
    <h1>Terms of Service</h1>
    <p>Last updated: [Date]</p>
    <h2>Acceptance of Terms</h2>
    <p>By using this service, you agree to these terms.</p>
    <h2>Service Description</h2>
    <p>This service allows you to book coaching sessions and manage your appointments through Google Calendar.</p>
    <h2>User Responsibilities</h2>
    <ul>
        <li>Provide accurate booking information</li>
        <li>Respect scheduled appointment times</li>
        <li>Cancel appointments in advance when necessary</li>
    </ul>
    <h2>Limitations</h2>
    <p>We reserve the right to cancel or modify bookings as necessary.</p>
    <h2>Contact</h2>
    <p>For questions, contact: [your-email@example.com]</p>
</body>
</html>
```

**Host these pages:**
- Upload to your Vercel frontend (create `privacy.html` and `terms.html` in `client/public/`)
- Or host on a simple static hosting service
- Or use a service like [Privacy Policy Generator](https://www.privacypolicygenerator.info/)

#### Option B: Use a Privacy Policy Generator

1. Go to **https://www.privacypolicygenerator.info/**
2. Fill out the form
3. Generate and download the privacy policy
4. Do the same for terms of service
5. Host them on your website

### Step 5: Add Privacy Policy and Terms Links

1. In **OAuth consent screen**, scroll to **"App domain"** section
2. Add:
   - **Application privacy policy link**: `https://your-frontend-domain.com/privacy.html`
   - **Application terms of service link**: `https://your-frontend-domain.com/terms.html`
3. Click **"Save and Continue"**

### Step 6: Review and Publish

1. Review all sections:
   - ✅ App information
   - ✅ Scopes
   - ✅ Test users (if any)
   - ✅ Summary

2. Click **"BACK TO DASHBOARD"** if you're on the summary page

3. At the top of the OAuth consent screen, you should see:
   - Status: **"Testing"**
   - A button: **"PUBLISH APP"**

4. Click **"PUBLISH APP"**

5. Confirm the action:
   - A warning will appear: "Publishing will make your app available to any user with a Google Account"
   - Click **"CONFIRM"**

### Step 7: Wait for Review (If Required)

**For some scopes, Google may require verification:**

- If you see "Verification required" or "In production" with a warning:
  - Google may need to review your app
  - This can take **1-7 days**
  - You'll receive an email when approved

- **For `calendar` scope specifically:**
  - If your app is used by fewer than 100 users, it may not require verification
  - If it requires verification, you'll need to:
    1. Complete the OAuth verification form
    2. Provide a video showing how your app uses the calendar
    3. Wait for Google's review

### Step 8: Verify Publishing Status

1. Go back to **OAuth consent screen**
2. You should see:
   - Status: **"In production"** (green)
   - Or: **"Verification required"** (if review is needed)

### Step 9: Test with a Different Account

1. Use a Google account that is **NOT** in your test users list
2. Try to connect Google Calendar
3. It should work without any restrictions

## Important Notes

### Testing Mode vs Production Mode

- **Testing Mode**: Only test users can use the app
- **Production Mode**: Anyone with a Google account can use the app

### Verification Requirements

Google may require verification if:
- Your app requests sensitive scopes (like `calendar`)
- Your app has many users
- Your app is used by users outside your organization

### If Verification is Required

1. **Complete the verification form:**
   - Go to **"APIs & Services"** → **"OAuth consent screen"**
   - Click **"VERIFY"** or follow the verification link
   - Fill out the form with:
     - App purpose
     - How you use the calendar scope
     - Video demonstration (recommended)

2. **Create a video demonstration:**
   - Show how your app uses Google Calendar
   - Demonstrate the booking flow
   - Show calendar event creation
   - Keep it under 5 minutes

3. **Submit and wait:**
   - Google will review (usually 1-7 days)
   - You'll receive email updates

## Troubleshooting

### "Access blocked: This app's request is invalid"

**Solution:**
- App is still in Testing mode
- Publish the app (follow steps above)
- Or add the user as a test user (temporary solution)

### "Verification required"

**Solution:**
- Complete the verification process
- This is required for production use with sensitive scopes

### "App not verified" warning

**Solution:**
- This is normal for unverified apps
- Users will see a warning but can still proceed
- To remove the warning, complete verification

## Quick Checklist

- [ ] All required fields filled in OAuth consent screen
- [ ] Privacy policy page created and hosted
- [ ] Terms of service page created and hosted
- [ ] Privacy policy and terms links added to OAuth consent screen
- [ ] App published (clicked "PUBLISH APP")
- [ ] Status shows "In production" or verification in progress
- [ ] Tested with a non-test-user account

## Alternative: Keep in Testing Mode

If you want to keep it in testing mode but add more users:

1. Go to **OAuth consent screen**
2. Scroll to **"Test users"** section
3. Click **"+ ADD USERS"**
4. Add email addresses of users who should have access
5. Click **"ADD"**

**Note:** This is only practical for a small number of users. For production, publish the app.

---

## Summary

To make Google OAuth available to anyone:

1. ✅ Complete all required fields in OAuth consent screen
2. ✅ Create and host privacy policy and terms of service
3. ✅ Click **"PUBLISH APP"** in Google Cloud Console
4. ✅ Wait for verification (if required)
5. ✅ Test with a non-test-user account

After publishing, anyone with a Google account can connect their calendar to your booking system!




