// src/App.js

import React, { useState, useEffect } from "react";
import TripTracker from "./components/TripTracker";
import Login from "./components/Login";
import Container from "react-bootstrap/Container";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth"; // Import signOut

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

    return () => unsubscribe();
  }, [auth]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <main className="bg-light min-vh-100">
      <Container fluid className="py-3">
        {user ? (
          <TripTracker user={user} onSignOut={handleSignOut} /> // Pass user and onSignOut as props
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </Container>
    </main>
  );
}

export default App;
