import { useEffect, useState } from "react";
import { port } from "../../config";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/**
 * Login component allows users to authenticate with their email and password.
 * It checks if the user is already logged in on mount and redirects accordingly.
 * Displays a login form if not authenticated.
 *
 * @component
 * @returns {JSX.Element|null} Login form UI or null while checking auth status.
 */
function Login() {
  const [isAuth, setIsAuth] = useState(true); // Initially assume user is authenticated until checked
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Check if user is already authenticated on component mount
  useEffect(() => {
    axios(port, { withCredentials: true })
      .then((response) => {
        if (response.data.user) {
          navigate('/'); // Redirect if already logged in
        } else {
          setIsAuth(false); // Show login form if not authenticated
        }
      })
      .catch(() => {
        setIsAuth(false); // In case of error, show login form
      });
  }, [navigate]);

  // Handle login form submission
  function handleLogin(e) {
    e.preventDefault();

    axios.post(
      `${port}/login`,
      { username: email, password },
      { withCredentials: true }
    )
    .then((response) => {
      if (response.data.success) {
        navigate('/'); // Redirect after successful login
      } else {
        alert(response.data.message); // Show error message
      }
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
    });
  }

  // Render login form only if user is not authenticated
  if (isAuth) {
    return null; // or a loading indicator if you want
  }

  return (
    <>
      <h2>LOGIN</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          value={password}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      <button onClick={() => navigate('/register')}>Register</button>
    </>
  );
}

export default Login;
