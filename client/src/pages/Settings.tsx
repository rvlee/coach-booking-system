import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { CoachSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';
import './Settings.css';

function Settings() {
  const { t, setLanguage } = useLanguage();
  const [settings, setSettings] = useState<CoachSettings>({
    timezone: 'America/Los_Angeles',
    daily_booking_limit: null,
    language: 'en'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async (): Promise<void> => {
    try {
      const response = await axios.get<CoachSettings>('/api/coach/settings');
      setSettings(response.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await axios.put<CoachSettings>('/api/coach/settings', settings);
      setSettings(response.data);
      // Update language context if language changed
      if (response.data.language !== settings.language) {
        setLanguage(response.data.language);
      }
      setSuccess(t.settings.saved);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || t.settings.error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CoachSettings, value: string | number | null): void => {
    setSettings({
      ...settings,
      [field]: value
    });
  };

  // Get common timezones
  const commonTimezones = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Toronto', label: 'Toronto' },
    { value: 'America/Vancouver', label: 'Vancouver' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
    { value: 'Asia/Taipei', label: 'Taipei' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Australia/Sydney', label: 'Sydney' },
    { value: 'UTC', label: 'UTC' }
  ];

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-container">
          <div className="loading">{t.settings.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h2>{t.settings.title}</h2>
        
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-section">
            <h3>{t.settings.timezone.label}</h3>
            <p className="setting-description">
              {t.settings.timezone.description}
            </p>
            <div className="form-group">
              <label htmlFor="timezone">{t.settings.timezone.label}</label>
              <select
                id="timezone"
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="settings-select"
              >
                {commonTimezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>{t.settings.dailyLimit.label}</h3>
            <p className="setting-description">
              {t.settings.dailyLimit.description}
            </p>
            <div className="form-group">
              <label htmlFor="daily_limit">{t.settings.dailyLimit.label}</label>
              <input
                id="daily_limit"
                type="number"
                min="1"
                value={settings.daily_booking_limit || ''}
                onChange={(e) => handleChange('daily_booking_limit', e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="No limit"
                className="settings-input"
              />
              <small className="setting-hint">
                {t.settings.dailyLimit.hint}
              </small>
            </div>
          </div>

          <div className="settings-section">
            <h3>{t.settings.language.label}</h3>
            <p className="setting-description">
              {t.settings.language.description}
            </p>
            <div className="form-group">
              <label htmlFor="language">{t.settings.language.label}</label>
              <select
                id="language"
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value as 'en' | 'zh-TW')}
                className="settings-select"
              >
                <option value="en">English</option>
                <option value="zh-TW">繁體中文 (Traditional Chinese)</option>
              </select>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="settings-actions">
            <button type="submit" className="save-settings-btn" disabled={saving}>
              {saving ? t.settings.saving : t.settings.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;

