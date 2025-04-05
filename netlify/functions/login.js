const fetch = require("node-fetch");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, password, recaptchaValue } = JSON.parse(event.body);

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      console.error("RECAPTCHA_SECRET_KEY environment variable not set.");
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Internal Server Error - reCAPTCHA secret key not configured",
        }),
      };
    }

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secretKey}&response=${recaptchaValue}`,
      }
    );

    const data = await response.json();

    if (data.success) {
      // --- PLACEHOLDER FOR YOUR FIREBASE AUTHENTICATION ---
      // Here you would typically:
      // 1. Authenticate the user with Firebase using the provided email and password.
      // 2. If authentication is successful, you might generate a session token or set a cookie.
      // 3. Return a success response to the frontend, potentially with user information or a session identifier.

      console.log("reCAPTCHA verification successful");
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Login successful (reCAPTCHA verified)",
        }), // Modify this with actual auth success response
      };
    } else {
      console.log("reCAPTCHA verification failed", data["error-codes"]);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid reCAPTCHA" }),
      };
    }
  } catch (error) {
    console.error("Error during login function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error - error during login attempt",
      }),
    };
  }
};
