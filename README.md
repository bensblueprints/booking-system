# Booking System

Full-stack booking platform built with Next.js, SQLite, and Tailwind CSS. Designed for tour operators, service businesses, and anyone who needs online booking with payment processing.

## Features

- **Admin Dashboard** - Manage products, time slots, bookings, and settings
- **Public Booking Flow** - 5-step booking: choose tour → pick date → pick time → enter details → pay
- **Stripe Integration** - Accept deposits via Stripe Checkout
- **Authorize.net Support** - Alternative payment processor
- **Google Calendar Sync** - Sync bookings to Google Calendar
- **SQLite Database** - Portable, no external DB required
- **Auto-start Service** - launchd plist for Mac Mini deployment

## Quick Start

```bash
git clone https://github.com/bensblueprints/booking-system.git
cd booking-system
npm install
npm run build
npm start -- -p 3100
```

Then visit:
- **Booking page:** http://localhost:3100/book
- **Admin:** http://localhost:3100/admin/login
- **Default login:** admin / admin123

## Admin Setup

1. Log in at /admin/login
2. Go to **Products** → Create your tours/services (name, price, deposit %, seats, duration)
3. Go to **Slots** → Create time slots (bulk create by date range + days of week)
4. Go to **Settings** → Add Stripe keys, Google Calendar credentials, business info
5. Share the /book link or embed it in your website

## Deployment

### Mac Mini (via SSH)

```bash
ssh user@your-server
git clone https://github.com/bensblueprints/booking-system.git
cd booking-system
npm install
npm run build
PORT=3100 npm start -- -p 3100
```

### As a launchd service (auto-start on reboot)

See the deployment section in the skill documentation.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- SQLite via better-sqlite3
- Stripe SDK
- Google Calendar API
- JWT Authentication
- bcryptjs for password hashing

## License

MIT

---

Website designed & developed by [advancedmarketing.co](https://advancedmarketing.co)
