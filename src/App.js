// src/App.js

import React, { useState, useEffect } from "react";
import TripTracker from "./components/TripTracker";
import Login from "./components/Login"; // Import the Login component
import Container from "react-bootstrap/Container";
import { getAuth, onAuthStateChanged } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        console.log("User is signed in:", authUser);
      } else {
        setUser(null);
        console.log("User is signed out");
      }
    });

    return () => unsubscribe(); // Cleanup the listener
  }, [auth]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  return (
    <main className="bg-light min-vh-100">
      <Container fluid className="py-3">
        {user ? <TripTracker /> : <Login onLoginSuccess={handleLoginSuccess} />}
      </Container>
    </main>
  );
}

export default App;
