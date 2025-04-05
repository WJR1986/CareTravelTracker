// src/components/Login.js

import React, { useState, useRef } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import ReCAPTCHA from "react-google-recaptcha";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const recaptchaRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const recaptchaValue = recaptchaRef.current.getValue();

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
      recaptchaRef.current.reset();
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
      recaptchaRef.current.reset();
    }
    console.log("reCAPTCHA response:", recaptchaValue);
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <h2 className="text-center mb-4">Login</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleLogin}>
            <Form.Group className="mb-3" controlId="formBasicEmail">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formBasicPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            <div className="mb-3">
              <ReCAPTCHA
                sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                ref={recaptchaRef}
              />
            </div>

            <Button variant="primary" type="submit" className="w-100">
              Log In
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
