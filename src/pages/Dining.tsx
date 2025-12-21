import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dining() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to menu page
    navigate('/menu');
  }, [navigate]);

  return null;
}
