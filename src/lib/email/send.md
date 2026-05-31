# email/send.ts

- **Que hace**: Sends transactional emails via Resend API for reservation status changes (pending/confirmed/cancelled/completed/seated/no_show) and shift checkout reminders. Includes HTML email templates.
- **Datos**: POST to Resend API (`https://api.resend.com/emails`); FROM: `Attick & Keller <ventas@ccs724.com>`
- **Exports**: `sendEmail()` and template functions for each reservation status
- **Pitfalls**: Requires `RESEND_API_KEY` env var; CTA URLs point to production `https://web-rosy-nine-64.vercel.app/`; large file (1200+ lines with inline HTML templates)