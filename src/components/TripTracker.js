import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs } from "firebase/firestore";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";

const Maps_API_KEY = process.env.REACT_APP_Maps_API_KEY; // Get API key from .env

const TripTracker = () => {
  const [startTime, setStartTime] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [startAddress, setStartAddress] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [status, setStatus] = useState("Ready to track your trips");
  const [googleMaps, setGoogleMaps] = useState(null);

  const toMiles = useCallback((km) => km * 0.621371, []);
  const getDistanceInMiles = useCallback(
    (start, end) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371;

      const dLat = toRad(end.lat - start.lat);
      const dLon = toRad(end.lng - start.lng);
      const lat1 = toRad(start.lat);
      const lat2 = toRad(end.lat);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = R * c;

      return toMiles(distanceKm);
    },
    [toMiles]
  );

  const getAddressFromCoords = useCallback(
    async (lat, lng) => {
      if (!googleMaps) {
        return "Google Maps API not loaded yet";
      }
      const geocoder = new googleMaps.Geocoder();
      const latlng = { lat: parseFloat(lat), lng: parseFloat(lng) };

      return new Promise((resolve, reject) => {
        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === "OK") {
            if (results[0]) {
              resolve(results[0].formatted_address);
            } else {
              resolve("Address not found");
            }
          } else {
            console.error("Geocoder failed due to:", status);
            resolve("Error fetching address");
          }
        });
      });
    },
    [googleMaps]
  );

  const fetchTrips = useCallback(async () => {
    const querySnapshot = await getDocs(collection(db, "trips"));
    setTripHistory(querySnapshot.docs.map((doc) => doc.data()));
  }, [db, collection, getDocs, setTripHistory]);

  const handleStartTrip = useCallback(() => {
    console.log("Google Maps object in handleStartTrip:", googleMaps);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setStartTime(new Date());
          setStartCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          const address = await getAddressFromCoords(
            position.coords.latitude,
            position.coords.longitude
          );
          setStartAddress(address);
          console.log("Start Address:", address);
          setStatus("Trip in progress...");
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert(
            "Unable to access location. Please ensure location services are enabled."
          );
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }, [getAddressFromCoords]);

  const handleEndTrip = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const endTime = new Date();
          const endCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          if (!startCoords) {
            alert("Start location not set. Please start the trip first.");
            return;
          }

          const distance = getDistanceInMiles(startCoords, endCoords);
          const reimbursement = distance * 0.45;

          const endAddress = await getAddressFromCoords(
            position.coords.latitude,
            position.coords.longitude
          );
          console.log("End Address:", endAddress);

          addDoc(collection(db, "trips"), {
            startTime,
            endTime,
            startCoordinates: startCoords,
            endCoordinates: endCoords,
            startAddress,
            endAddress,
            distance: distance.toFixed(2),
            reimbursement: reimbursement.toFixed(2),
          }).then(() => {
            alert("Trip saved!");
            setStatus("Trip ended");
            setStartAddress(null);
            fetchTrips();
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert(
            "Unable to access location. Please ensure location services are enabled."
          );
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }, [
    startCoords,
    startTime,
    getDistanceInMiles,
    getAddressFromCoords,
    addDoc,
    collection,
    db,
    fetchTrips,
  ]);

  useEffect(() => {
    console.log("TripTracker component mounted");
    console.log("Maps API Key from env:", Maps_API_KEY);
    if (!window.google || !window.google.maps) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${Maps_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setGoogleMaps(window.google.maps);
        console.log("Google Maps API loaded successfully!");
      };
      document.head.appendChild(script);
    } else {
      setGoogleMaps(window.google.maps);
      console.log("Google Maps API was already loaded.");
    }
    fetchTrips();

    return () => {
      console.log("TripTracker component unmounted");
    };
  }, [fetchTrips, Maps_API_KEY]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return (
    <Container className="my-4">
      <Row className="justify-content-center mb-4">
        <Col md={8} className="text-center">
          <h1 className="display-5">📍 Personal Mileage Tracker</h1>
          <p className="lead text-muted">{status}</p>
        </Col>
      </Row>

      <Row className="justify-content-center gap-3 mb-4">
        <Col xs="auto">
          <Button variant="success" size="lg" onClick={handleStartTrip}>
            🚗 Start Trip
          </Button>
        </Col>
        <Col xs="auto">
          <Button variant="danger" size="lg" onClick={handleEndTrip}>
            🛑 End Trip
          </Button>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Card.Header bg="primary" text="white">
          <h2 className="h5 m-0">Trip History</h2>
        </Card.Header>
        <Card.Body className="p-0">
          {tripHistory.length === 0 ? (
            <p className="p-3 text-muted text-center">No trips logged yet.</p>
          ) : (
            <div className="table-responsive">
              <Table striped hover className="m-0">
                <thead className="table-light">
                  <tr>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Start Address</th>
                    <th>End Address</th>
                    <th>Distance (miles)</th>
                    <th>Reimbursement (£)</th>
                  </tr>
                </thead>
                <tbody>
                  {tripHistory.map((trip, index) => (
                    <tr key={index}>
                      <td>
                        {new Date(
                          trip.startTime.seconds * 1000
                        ).toLocaleString()}
                      </td>
                      <td>
                        {new Date(trip.endTime.seconds * 1000).toLocaleString()}
                      </td>
                      <td>{trip.startAddress}</td>
                      <td>{trip.endAddress}</td>
                      <td>{trip.distance}</td>
                      <td>£{trip.reimbursement}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default TripTracker;
