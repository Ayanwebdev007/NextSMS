# Next-SMS API Endpoints Documentation

This document describes all API endpoints for the Next-SMS platform, grouped by feature. Each section lists the route, HTTP method, authentication requirements, parameters, and expected responses.

---

## Authentication (`/api/auth`)
- **POST `/register`**  
  Register a new business user.  
  **Body:** `{ name, email, password }`  
  **Response:** User object, JWT token.

- **POST `/login`**  
  Authenticate a business user.  
  **Body:** `{ email, password }`  
  **Response:** User object, JWT token.

- **POST `/google`**  
  Google OAuth login.  
  **Body:** `{ token }`  
  **Response:** User object, JWT token.

- **GET `/me`**  
  Get authenticated user's profile.  
  **Auth:** Bearer token  
  **Response:** User object.

---

## Plans (`/api/plans`)
- **GET `/`**  
  Get all active plans.  
  **Response:** Array of plan objects.

- **POST `/order`**  
  Create Razorpay order for a plan.  
  **Auth:** Bearer token  
  **Body:** `{ planId }`  
  **Response:** Razorpay order object.

- **POST `/webhook`**  
  Razorpay webhook for payment confirmation.  
  **Body:** Raw Razorpay webhook payload  
  **Response:** `{ status: "ok" }`

---

## Payments (`/api/payment`)
- **POST `/create-order`**  
  Create Razorpay order for a plan.  
  **Auth:** Bearer token  
  **Body:** `{ planId }`  
  **Response:** Razorpay order object.

- **POST `/webhook`**  
  Razorpay webhook for payment confirmation.  
  **Body:** Raw Razorpay webhook payload  
  **Response:** `{ status: "ok" }`

---

## WhatsApp Session (`/api/session`)
- **POST `/connect`**  
  Start WhatsApp session, get QR code.  
  **Auth:** Bearer token  
  **Response:** `{ qrCodeUrl }`

- **GET `/status`**  
  Get WhatsApp session status.  
  **Auth:** Bearer token  
  **Response:** `{ status }`

- **DELETE `/disconnect`**  
  Disconnect WhatsApp session.  
  **Auth:** Bearer token  
  **Response:** `{ message }`

---

## Messaging (`/api/message`)
- **POST `/send`**  
  Send WhatsApp message (text/media).  
  **Auth:** Bearer token  
  **Body:** `{ recipient, text, mediaUrl?, filePath? }`  
  **Response:** `{ message }`

---

## Campaigns (`/api/campaign`)
- **POST `/start`**  
  Start a bulk messaging campaign.  
  **Auth:** Bearer token  
  **Body:** `{ name, recipients[], message, filePath? }`  
  **Response:** `{ campaignId }`

---

## API Key Messaging (`/api/whatsapp/send`)
- **GET `/send`**  
  Send WhatsApp message using API key.  
  **Auth:** API key in header  
  **Query:** `receiver`, `msgtext`, `mediaUrl?`  
  **Response:** `{ status, message }`

---

## Business (`/api/business`)
- **POST `/apikey`**  
  Generate API key for business.  
  **Auth:** Bearer token  
  **Response:** `{ apiKey }`

---

## Admin (`/api/admin`)
- **GET `/businesses`**  
  Get all businesses.  
  **Auth:** Admin token  
  **Response:** Array of businesses.

- **PUT `/businesses/:id`**  
  Update business status.  
  **Auth:** Admin token  
  **Body:** `{ status }`  
  **Response:** Updated business.

- **GET `/plans`**  
  Get all plans.  
  **Auth:** Admin token  
  **Response:** Array of plans.

- **POST `/plans`**  
  Create a new plan.  
  **Auth:** Admin token  
  **Body:** Plan details  
  **Response:** Created plan.

- **PUT `/plans/:id`**  
  Update a plan.  
  **Auth:** Admin token  
  **Body:** Plan details  
  **Response:** Updated plan.

- **GET `/submissions`**  
  Get contact form submissions.  
  **Auth:** Admin token  
  **Response:** Array of submissions.

---

## History (`/api/history`)
- **GET `/campaigns`**  
  Get campaign history for business.  
  **Auth:** Bearer token  
  **Response:** Array of campaigns.

- **GET `/messages`**  
  Get single message history for business.  
  **Auth:** Bearer token  
  **Response:** Array of messages.

---

## Contact (`/api/contact`)
- **POST `/`**  
  Submit contact form.  
  **Body:** Contact form fields  
  **Response:** Submission status.

---

## Media (`/api/media`)
- **POST `/upload`**  
  Upload media file.  
  **Auth:** Bearer token  
  **FormData:** `media`  
  **Response:** `{ filePath }`

---

## Static Files
- **GET `/uploads/:filename`**  
  Serve uploaded media files.

---

## Worker
- **`messageWorker.js`**  
  Background processor for sending WhatsApp messages via BullMQ. Handles message sending, credits, logs, and campaign stats.

---

## Middleware
- **`authMiddleware.js`**  
  JWT authentication for business users.

- **`adminAuth.js`**  
  Admin authentication.

- **`apiKeyAuth.js`**  
  API key authentication.

---

## Models
- **`plan.model.js`**  
  Plan schema: name, price, credits, validity, active status.

---

## Notes
- All protected routes require JWT token in `Authorization: Bearer <token>`.
- Admin routes require admin authentication.
- Payment webhook route uses raw body for Razorpay signature verification.
- All endpoints return JSON responses.

