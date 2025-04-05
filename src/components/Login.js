// src/components/Login.js

import React, { useState, useRef } from "react"; // Import useRef
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import ReCAPTCHA from "react-google-recaptcha"; // Import the reCAPTCHA component

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const recaptchaRef = useRef(null); // Create a ref for the reCAPTCHA instance

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const recaptchaValue = recaptchaRef.current.getValue(); // Get the reCAPTCHA response

    if (!recaptchaValue) {
      setError("Please complete the reCAPTCHA challenge.");
      return;
    }

    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("Login successful:", user);
      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
      // Optionally reset the reCAPTCHA after successful login
      recaptchaRef.current.reset();
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
      // Optionally reset the reCAPTCHA on login failure as well
      recaptchaRef.current.reset();
    }
    // IMPORTANT: You should also verify the recaptchaValue on your backend server
    console.log("reCAPTCHA response:", recaptchaValue);
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <ReCAPTCHA
          sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
          ref={recaptchaRef}
        />
        <button type="submit">Log In</button>
      </form>
    </div>
  );
};

export default Login;
