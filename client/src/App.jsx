import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/login';
import Register from './pages/Register';
import TripPage from './pages/TripPage';
import { useEffect } from 'react';
import axios from 'axios';
import { port } from '../config';

/**
 * Main App component with routes and auth check
 */
function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is authenticated on mount
    axios.get(port, { withCredentials: true })
      .then((response) => {
        if (response.data.user) {
          // Redirect logged-in users away from login/register pages
          if (location.pathname === '/login' || location.pathname === '/register') {
            navigate('/');
          }
        } else {
          // Redirect non-logged in users to login unless on register page
          if (location.pathname !== '/register') {
            console.log('User not authenticated, redirecting to login');
            navigate('/login');
          }
        }
      })
      .catch((error) => {
        console.error('Auth check failed:', error);
      });
  }, [location.pathname, navigate]); // Add dependencies to be safe

  /**
   * Handles user logout
   */
  function handleLogout(e) {
    e.preventDefault();
    axios.post(`${port}/logout`, {}, { withCredentials: true })
      .then((response) => {
        if (response.data.success) {
          console.log("Logout successful");
          navigate('/login');
        } else {
          alert(response.data.message);
        }
      })
      .catch((error) => {
        alert('Logout failed: ' + error);
      });
  }

  // Show Logout button only when not on login or register pages
  const showLogout = !(location.pathname === '/login' || location.pathname === '/register');

  return (
    <>
      {showLogout && <button onClick={handleLogout}>Logout</button>}
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trips/:id" element={<TripPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </>
  );
}

export default App;
