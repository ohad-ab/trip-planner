import { useEffect, useState } from "react";
import { port } from "../../config";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/**
 * Register component for user signup.
 * Redirects to home if already authenticated.
 */
function Register() {
  const [isAuth, setIsAuth] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    axios(port, { withCredentials: true }).then((response) => {
      if (response.data.user) {
        navigate('/');
      } else {
        setIsAuth(false);
      }
    }).catch(() => setIsAuth(false)); // Assume unauthenticated on error
  }, [navigate]);

  function handleSubmit(e) {
    e.preventDefault();

    // Password match validation
    if (password !== repeatPassword) {
      alert("Please repeat the password correctly");
      return;
    }

    // Send registration data to server
    axios.post(
      `${port}/register`,
      { username, password, repeatedPassword: repeatPassword, email },
      { withCredentials: true }
    ).then((response) => {
      if (response.data.success) {
        navigate('/');
      } else {
        alert(response.data.message);
      }
    }).catch((error) => {
      alert("Registration failed: " + error.message);
    });
  }

  if (isAuth) return null; // Show nothing while checking auth

  return (
    <>
      <h2>REGISTER</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="User Name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Repeat Password"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          required
        />
        <button type="submit">Submit</button>
      </form>
    </>
  );
}

export default Register;
