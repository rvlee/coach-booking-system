import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Coach } from '../types';

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const coachParam = searchParams.get('coach');

    if (token && coachParam) {
      try {
        const coach: Coach = JSON.parse(decodeURIComponent(coachParam));
        
        // Update auth context
        loginWithToken(token, coach);
        
        // Redirect to dashboard
        navigate('/dashboard');
      } catch (err) {
        console.error('Error processing auth callback:', err);
        navigate('/login?error=callback_failed');
      }
    } else {
      navigate('/login?error=missing_token');
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div>Completing sign in...</div>
    </div>
  );
}

export default AuthCallback;

