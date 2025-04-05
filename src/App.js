// src/App.js

import React from "react";
import TripTracker from "./components/TripTracker";
import Container from "react-bootstrap/Container"; // Import Container
// import "bootstrap/dist/css/bootstrap.min.css"; // You can remove this line

function App() {
  return (
    <main className="bg-light min-vh-100">
      <Container fluid className="py-3">
        {" "}
        {/* Use Container */}
        <TripTracker />
      </Container>
    </main>
  );
}

export default App;
