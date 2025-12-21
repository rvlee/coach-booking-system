import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run } from '../database.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Register coach
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if coach already exists
    const existing = await get('SELECT * FROM coaches WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Coach with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create coach
    const result = await run(
      'INSERT INTO coaches (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name]
    );

    const coach = await get('SELECT id, email, name FROM coaches WHERE id = ?', [result.lastID]);

    // Generate token
    const token = jwt.sign(
      { id: coach.id, email: coach.email },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    res.status(201).json({ coach, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login coach
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find coach
    const coach = await get('SELECT * FROM coaches WHERE email = ?', [email]);
    if (!coach) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, coach.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: coach.id, email: coach.email },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    res.json({
      coach: { id: coach.id, email: coach.email, name: coach.name },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate token and return user info
router.get('/validate', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Get fresh user data from database
      const coach = await get('SELECT id, email, name, coach_booking_link FROM coaches WHERE id = ?', [decoded.id]);
      if (!coach) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        valid: true,
        coach: { id: coach.id, email: coach.email, name: coach.name, coach_booking_link: coach.coach_booking_link }
      });
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

