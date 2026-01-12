# Next-SMS Platform

Next-SMS is a robust SaaS solution for businesses to send WhatsApp messages, manage campaigns, handle payments, and automate communication workflows. It combines a modern React frontend with a scalable Node.js/Express backend, integrating WhatsApp messaging, payment processing, and admin controls.

## Project Overview

Next-SMS enables businesses to:
- **Connect WhatsApp accounts** via QR code and manage sessions securely.
- **Send single or bulk WhatsApp messages** (text and media) to customers, leads, or contacts.
- **Create and manage campaigns** for marketing, notifications, or customer engagement.
- **Purchase plans and credits** using Razorpay, with automated credit assignment and plan expiry.
- **Access messaging via API keys** for integration with external systems or automation.
- **Upload and send media files** (images, documents) with messages.
- **Track message and campaign history** for analytics and compliance.
- **Admin dashboard** for managing businesses, plans, and contact submissions.
- **Secure authentication** with JWT and Google OAuth.
- **Background processing** for campaigns using BullMQ and Redis for reliability and scalability.

## Key Features

- **WhatsApp Session Management:** Connect, monitor, and disconnect WhatsApp sessions for each business account.
- **Messaging:** Send individual or bulk messages, including media, with real-time credit deduction.
- **Campaigns:** Launch and monitor campaigns, with background processing and delivery stats.
- **Payments:** Integrated Razorpay payment gateway for plan purchases, with webhook handling for secure credit assignment.
- **API Integration:** Generate API keys for programmatic access to messaging endpoints.
- **Media Uploads:** Securely upload and serve media files for use in messages and campaigns.
- **Admin Controls:** Manage businesses, plans, and contact submissions with role-based access.
- **History & Analytics:** View detailed logs of sent messages and campaigns.
- **Security:** JWT-based authentication, admin protection, and secure session handling.
- **Scalability:** Uses BullMQ and Redis for scalable background job processing.

## Use Cases

- Marketing campaigns via WhatsApp
- Automated notifications and reminders
- Customer support and engagement
- Integrating WhatsApp messaging into existing business workflows
- Managing multiple business accounts and plans

## Architecture

- **Backend:** Node.js, Express, MongoDB, BullMQ (Redis), whatsapp-web.js, Razorpay
- **Frontend:** React, React Router, Tailwind CSS
- **Payments:** Razorpay integration
- **Messaging:** whatsapp-web.js for WhatsApp automation
- **Authentication:** JWT, Google OAuth

## Setup

1. **Clone the repository**
2. **Install dependencies**
   - Backend: `cd next_sms/server && npm install`
   - Frontend: `cd next_sms/client && npm install`
3. **Configure environment variables**
   - Copy `.env.example` to `.env` and fill in credentials (MongoDB, JWT, Razorpay, etc.)
4. **Start backend**
   - `npm run dev` (nodemon)
5. **Start frontend**
   - `npm run dev`
6. **Redis**
   - Required for BullMQ (campaigns). Ensure Redis is running.

## API Endpoints

See [`server/endpoints.md`](./next_sms/server/endpoints.md) for full API documentation.

## Folder Structure

- `next_sms/server/` - Express backend, controllers, models, routes, workers
- `next_sms/client/` - React frontend, pages, components, hooks

## License

MIT

