# Setting Up GitHub Repository

Follow these steps to create a GitHub repository for your project:

## Step 1: Install Git (if not already installed)

1. Download Git from: https://git-scm.com/download/win
2. Install it with default settings
3. Restart your terminal/PowerShell

## Step 2: Verify Git Installation

Open PowerShell and run:
```powershell
git --version
```

## Step 3: Initialize Git Repository

Navigate to your project directory and initialize Git:

```powershell
cd C:\Users\royle\OneDrive\Desktop\coach-booking-system
git init
```

## Step 4: Add All Files

```powershell
git add .
```

## Step 5: Create Initial Commit

```powershell
git commit -m "Initial commit: Coach booking system with Google Calendar integration and shared class features"
```

## Step 6: Create GitHub Repository

1. Go to https://github.com and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name it: `coach-booking-system` (or any name you prefer)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 7: Connect Local Repository to GitHub

GitHub will show you commands. Use these (replace `YOUR_USERNAME` with your GitHub username):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/coach-booking-system.git
git branch -M main
git push -u origin main
```

## Step 8: Verify

Check your GitHub repository - all your files should be there!

## Future Updates

To push future changes:

```powershell
git add .
git commit -m "Description of your changes"
git push
```

## Important Notes

- The `.gitignore` file is already set up to exclude:
  - `node_modules/`
  - `.env` files (sensitive data)
  - Database files (`.sqlite`, `.sqlite3`)
  - Build files (`dist/`, `build/`)

- **Never commit** your `.env` file - it contains sensitive credentials!


