import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dining() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to menu page - Dining and Menu are the same
    navigate('/menu', { replace: true });
  }, [navigate]);

  return null;
}
