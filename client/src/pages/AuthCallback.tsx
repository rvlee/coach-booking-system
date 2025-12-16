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

    console.log('AuthCallback - token:', token ? 'present' : 'missing');
    console.log('AuthCallback - coach:', coachParam ? 'present' : 'missing');

    if (token && coachParam) {
      try {
        const coach: Coach = JSON.parse(decodeURIComponent(coachParam));
        console.log('AuthCallback - parsed coach:', { id: coach.id, email: coach.email });
        
        // Update auth context
        loginWithToken(token, coach);
        
        // Redirect to dashboard
        navigate('/dashboard');
      } catch (err) {
        console.error('Error processing auth callback:', err);
        console.error('Error details:', err);
        navigate('/login?error=callback_failed');
      }
    } else {
      console.error('AuthCallback - missing token or coach param');
      console.error('Token:', token);
      console.error('Coach:', coachParam);
      navigate('/login?error=missing_token');
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div>Completing sign in...</div>
    </div>
  );
}

export default AuthCallback;

