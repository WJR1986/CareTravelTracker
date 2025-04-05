import React, { useState, useEffect, useCallback } from "react";
import { db, auth } from "../firebaseConfig"; // Import auth
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"; // Import query and where
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert"; // Import Bootstrap Alert
import { useGoogleMaps } from "./googleMapsApi"; // Import the hook
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserXmark } from "@fortawesome/free-solid-svg-icons";
import {
  faHouseMedicalFlag,
  faCar,
  faStopCircle,
} from "@fortawesome/free-solid-svg-icons"; // Import new icons

const TripTracker = ({ user, onSignOut }) => {
  const [startTime, setStartTime] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [startAddress, setStartAddress] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [status, setStatus] = useState("Ready to track your trips");
  const [isLoading, setIsLoading] = useState(false);
  const google = useGoogleMaps(); // Use the hook to get the google object

  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  const showAlertHandler = useCallback((message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
    }, 3000); // Alert disappears after 3 seconds
  }, []);

  const toMiles = useCallback((km) => km * 0.621371, []);

  const getDistanceInMiles = useCallback(
    (start, end) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371; // Earth's radius in km

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
      if (!google || !google.maps) {
        return "Google Maps API not loaded yet";
      }
      const geocoder = new google.maps.Geocoder();
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
    [google]
  );

  const fetchTrips = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const q = query(
        collection(db, "trips"),
        where("userId", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const trips = querySnapshot.docs.map((doc) => doc.data());

      // Sort trips by startTime in descending order (newest first)
      trips.sort((a, b) => b.startTime.seconds - a.startTime.seconds);

      setTripHistory(trips);
      console.log(
        "Fetched and Sorted Trip History for user:",
        currentUser.uid,
        trips
      );
    } else {
      setTripHistory([]); // Clear the trip history if no user is logged in
      console.log("No user logged in, clearing trip history.");
    }
  }, [setTripHistory]);

  const handleStartTrip = useCallback(() => {
    console.log("handleStartTrip called");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStartTime(new Date());
        setStartCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus("Trip in progress...");
        console.log("status set to:", status);
        setIsLoading(true); // Set isLoading to true after setting status

        try {
          const addressPromise = getAddressFromCoords(
            position.coords.latitude,
            position.coords.longitude
          );
          addressPromise
            .then((address) => {
              setStartAddress(address);
            })
            .catch((error) => {
              console.error("Error fetching address:", error);
              showAlertHandler("Error fetching address.", "danger"); // Use Bootstrap Alert
              // We don't set setIsLoading to false here because the trip is still considered in progress
            });
        } catch (error) {
          console.error("Error during getAddressFromCoords promise:", error);
          // We don't set setIsLoading to false here because the trip is still considered in progress
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        showAlertHandler(
          "Unable to access location. Please allow location services.",
          "danger"
        ); // Use Bootstrap Alert
        setIsLoading(false); // Set loading to false if initial geolocation fails
        setStatus("Ready to track your trips"); // Reset status if start fails
      }
    );
  }, [getAddressFromCoords, status, showAlertHandler]);

  const handleEndTrip = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const endTime = new Date();
        const endCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (!startCoords) {
          showAlertHandler(
            "Start location not set. Please start the trip first.",
            "danger"
          ); // Use Bootstrap Alert
          return;
        }

        const distance = getDistanceInMiles(startCoords, endCoords);
        const reimbursement = distance * 0.45;

        const address = await getAddressFromCoords(
          position.coords.latitude,
          position.coords.longitude
        );
        // setEndAddress(address);
        console.log("End Address fetched:", address);

        const currentUser = auth.currentUser; // Get the current user here
        if (currentUser) {
          const tripDataToSave = {
            startTime,
            endTime,
            startCoordinates: startCoords,
            endCoordinates: endCoords,
            startAddress,
            endAddress: address, // Explicitly use the fetched 'address' here
            distance: distance.toFixed(2),
            reimbursement: reimbursement.toFixed(2),
            userId: currentUser.uid, // Add the user ID
          };

          console.log("Data being saved to Firestore:", tripDataToSave); // Add this line

          addDoc(collection(db, "trips"), tripDataToSave).then(() => {
            showAlertHandler("Trip saved!", "success"); // Use Bootstrap Alert
            setStatus("Trip ended");
            setIsLoading(false); // Set isLoading to false when the trip ends
            fetchTrips();
            setStartAddress(null);
            setEndAddress(null);
            setStartCoords(null);
            setStartTime(null);
          });
        } else {
          showAlertHandler("You must be logged in to save trips.", "danger");
          return;
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        showAlertHandler(
          "Unable to access location. Please allow location services.",
          "danger"
        ); // Use Bootstrap Alert
      }
    );
  }, [
    startCoords,
    getDistanceInMiles,
    getAddressFromCoords,
    fetchTrips,
    startTime,
    startAddress,
    showAlertHandler,
  ]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      fetchTrips();
    });
    return unsubscribe; // Cleanup the listener when the component unmounts
  }, [fetchTrips]);

  console.log("Current tripHistory state:", tripHistory); // Add this line
  return (
    <Container className="my-4">
      <style type="text/css">
        {`
         .overlay-alert {
          position: fixed; /* Or absolute */
          top: 40px;   /* Adjust as needed */
          left: 50%;   /* Center horizontally */
          transform: translateX(-50%); /* Adjust for centering */
          z-index: 1050; /* Higher than most other elements */
          width: 25%;  /* Adjust width as needed */
         }
        `}
      </style>
      <Row className="justify-content-center mb-2 align-items-center">
        {" "}
        {/* Added align-items-center */}
        <Col md={8} className="text-center">
          {user && (
            <p className="text-muted mb-0">
              {" "}
              {/* Adjusted margin-bottom */}
              Signed in as: <strong>{user.displayName || user.email}</strong>
              <FontAwesomeIcon
                icon={faUserXmark}
                onClick={onSignOut}
                style={{
                  marginLeft: "10px",
                  cursor: "pointer",
                  fontSize: "1em",
                  color: "grey",
                }}
                title="Log Out" // Add a title for accessibility
              />
            </p>
          )}
        </Col>
      </Row>
      <Row className="justify-content-center mb-4">
        <Col md={8} className="text-center">
          <h1 className="display-5">
            <FontAwesomeIcon icon={faHouseMedicalFlag} className="me-2" />{" "}
            Personal Mileage Tracker
          </h1>
          <p className="lead text-muted">
            {status}
            {console.log(
              "Checking spinner condition: status =",
              status,
              ", isLoading =",
              isLoading
            )}{" "}
            {/* Add this */}
            {status === "Trip in progress..." && isLoading && (
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="ms-2"
              />
            )}
          </p>
          {showAlert && (
            <Alert
              variant={alertType}
              onClose={() => setShowAlert(false)}
              dismissible
              className="overlay-alert"
            >
              {alertMessage}
            </Alert>
          )}
        </Col>
      </Row>

      <Row className="justify-content-center gap-3 mb-4">
        <Col xs="auto">
          <Button
            variant="success"
            size="lg"
            onClick={handleStartTrip}
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faCar} className="me-2" /> Start Trip
          </Button>
        </Col>
        <Col xs="auto">
          <Button variant="danger" size="lg" onClick={handleEndTrip}>
            <FontAwesomeIcon icon={faStopCircle} className="me-2" /> End Trip
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
