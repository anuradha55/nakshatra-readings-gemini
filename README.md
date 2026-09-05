# Nakshatra Readings — Next.js + Razorpay + PostgreSQL

This version stores every booking in PostgreSQL and marks it `PAID` only after server-side Razorpay signature verification.

## Architecture

Customer → Next.js booking form → `/api/create-order` → Razorpay → `/api/verify-payment` → PostgreSQL

## 1. Create a Neon PostgreSQL database

Create a PostgreSQL database in Neon and copy its connection string. Prisma supports Neon/serverless PostgreSQL; use the connection string provided by Neon. See Prisma's PostgreSQL/Neon guidance.

Set it in `.env.local`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
```

Never expose `RAZORPAY_KEY_SECRET` or `DATABASE_URL` to client-side code.

## 2. Install dependencies

```bash
npm install
```

## 3. Generate Prisma Client

```bash
npm run db:generate
```

## 4. Create the database table

For local development:

```bash
npm run db:migrate -- --name init
```

For production after migrations have been committed:

```bash
npm run db:deploy
```

The `Booking` table contains:

- customer name, phone and email
- service selected
- birth date/time/place text
- amount/currency
- Razorpay order ID
- Razorpay payment ID
- booking/payment status
- payment verification timestamp
- created/updated timestamps

## 5. Run

```bash
npm run dev
```

## Payment lifecycle

1. Customer submits booking details.
2. Next.js creates a Razorpay order.
3. A `PENDING` booking is stored with the Razorpay order ID.
4. Customer completes Razorpay Checkout.
5. Browser sends Razorpay IDs/signature plus the server-created booking ID to `/api/verify-payment`.
6. Server independently calculates and checks the Razorpay HMAC signature.
7. Server verifies the order belongs to the booking.
8. The booking changes from `PENDING` to `PAID` and stores the payment ID/time.
9. Repeated verification of the same payment is handled idempotently.

## Important production improvement

For a production payment system, add a Razorpay webhook as a second source of truth. The browser can close or lose connectivity immediately after payment; a webhook lets the server reconcile payment status even when the browser never reaches `/api/verify-payment`.

The partner split/settlement should also be implemented server-side after payment verification using the Razorpay account/route mechanism applicable to your account and partner setup. Do not calculate or trust the split in React.


## Free AI Prediction

The site includes a free AI prediction feature with two questions per email by default. Predictions are stored in PostgreSQL. Configure `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-5.6-luna`) and `AI_FREE_QUESTIONS`. The server calls the Gemini API; the API key is never exposed to the browser. The feature deliberately does not claim that the language model has calculated an exact Kundli. For exact Vedic chart calculations, add a dedicated ephemeris/astrology calculation engine and pass its calculated chart data to the AI for interpretation.


## WhatsApp booking notifications

Booking confirmations are sent through the WhatsApp Business Platform (Cloud API) after the server verifies a Razorpay payment. Configure these server-side environment variables:

```env
WHATSAPP_GRAPH_API_VERSION=vXX.X
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_TEMPLATE_LANGUAGE=en
WHATSAPP_BOOKING_TEMPLATE_NAME=booking_confirmation
WHATSAPP_ASTROLOGER_TEMPLATE_NAME=astrologer_new_booking
ASTROLOGER_WHATSAPP_NUMBER=919999999999
```

Create and obtain approval for the two WhatsApp templates in Meta before testing.

The `booking_confirmation` template must contain four body variables in this order:

1. Customer name
2. Service
3. Amount paid
4. Booking ID

The `astrologer_new_booking` template must contain four body variables in this order:

1. Astrologer name
2. Booking ID
3. Total customer payment
4. Astrologer's payout share

WhatsApp notification delivery is intentionally non-fatal. A verified Razorpay payment remains successful even if WhatsApp is temporarily unavailable.
