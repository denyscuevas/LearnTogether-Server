LearnTogether Backend API
============================

### Overview

**LearnTogether** is a sophisticated tutoring exchange and social platform designed specifically for the University of Windsor community. While the frontend provides a seamless interface, this backend orchestrates complex matchmaking algorithms, securing student data with industry-standard encryption, and managing real-time communication tunnels.

By centralizing student tutoring needs and abilities, this API facilitates meaningful academic collaborations, ensuring that every match is backed by data and every message is protected by privacy-first engineering.

* * * * *

### Key Features

-   **Secure Authentication:** Implements JWT-based stateless authentication with **Refresh Token** support and **HttpOnly cookies** to prevent XSS and CSRF attacks.

-   **Encrypted Messaging:** Every student communication is protected using **AES-256-GCM encryption**. We utilize unique Initialization Vectors (IVs) and Authentication Tags (Seals) to ensure data at rest is unreadable and tamper-proof.

-   **Image Management:** Integrated with **Cloudinary** for secure cloud storage and optimized delivery of student profile pictures.

-   **High-Performance Caching:** Integrated **Redis** layer to cache user profiles and matchmaking results, reducing PostgreSQL load and providing sub-millisecond response times.

-   **Real-Time Engine:** Powered by **Socket.io** to facilitate instant notifications, "typing" indicators, and live chat.

* * * * *

### Built With

-   **Node.js & Express:** The core runtime and web framework.

-   **TypeScript:** For type-safety across the entire API surface.

-   **PostgreSQL & Prisma:** Relational database storage with a type-safe ORM.

-   **Redis:** In-memory data store for distributed caching.

-   **Cloudinary:** Media management for profile imagery.

-   **Nodemailer/Ethereal:** For transactional email testing and password resets.

-   **Socket.io:** For bi-directional, real-time communication.

* * * * *

### Setup & Installation

Follow these steps to deploy the backend on a local development machine.

#### 1\. Clone & Install

Bash

```
git clone https://github.com/TejBaidwan/LearnTogether-Server.git

cd LearnTogether_Server
npm install

```

#### 2\. Environment Configuration

Create a `.env` file in the root directory and populate it with your local credentials (referencing your provided keys):

Plaintext

```
# Database Connection
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/learntogether"
DIRECT_URL="postgresql://USER:PASSWORD@localhost:5432/learntogether"

# Server & CORS
PORT=8080
CLIENT_URL="http://localhost:5173"
API_BASE_LOCAL="http://localhost:8080"
NODE_ENV="development"

# Security (JWT & Encryption)
JWT_SECRET="your_primary_jwt_secret"
JWT_REFRESH_SECRET="your_refresh_token_secret"
MESSAGE_ENCRYPT_SECRET="your_aes_256_encryption_key"

# Caching
REDIS_URL="redis://localhost:6379"

# Email (Ethereal for Testing)
ETHEREAL_USER="your_ethereal_username"
ETHEREAL_PASSWORD="your_ethereal_password"

# Image Hosting (Cloudinary)
CLOUDINARY_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
CLOUDINARY_URL="your_full_cloudinary_url"

```

#### 3\. Database Initialization

Bash

```
# Push the schema to your local database
npx prisma migrate dev --name init

# Generate the Prisma client
npx prisma generate

```

#### 4\. Run the Server

Bash

```
# For development (with auto-reload)
npm run dev

# For production build
npm run build
npm start

```

* * * * *

### Common Issues & Fixes

| **Issue** | **Potential Cause** | **Fix** |
| --- | --- | --- |
| **Images not appearing** | Cloudinary credentials missing or incorrect. | Verify `CLOUDINARY_URL` in `.env` matches your dashboard. |
| **Prisma "Target database does not exist"** | The Postgres DB hasn't been created yet. | Run `CREATE DATABASE learntogether;` in your Postgres terminal before migrating. If you decide to use a cloud database service like Supabase, paste your database keys here instead. |
| **Emails not sending** | Ethereal account credentials expired. | Visit [Ethereal.email](https://ethereal.email/) to generate a fresh test account. |
| **Redis Connection Refused** | Redis server is not running on port 6379. | Start your local Redis service or check the `REDIS_URL` in `.env`. |
| **CORS "Origin Not Allowed"** | `CLIENT_URL` doesn't match your frontend. | Ensure `.env` matches your Vite URL (usually `http://localhost:5173`). |

* * * * *

### Handoff Notes for Future Teams

-   **Encryption Secret:** The `MESSAGE_ENCRYPT_SECRET` is used for AES-256 decryption. If this is changed or lost, **all existing messages in the database will be unrecoverable.**

-   **Cloudinary:** Ensure the Cloudinary account remains active, or images will fail to upload/display.

-   **Handoff to Production:** When moving from Local to the VM, ensure you update the `CLIENT_URL` to the `https` domain and verify that the Apache `wstunnel` is active for Socket.io. The app is currently running with our version at https://learntogether.cs.uwindsor.ca/ and is only accessible through the GlobalProtect VPN after authenticating thorugh the school portal.
