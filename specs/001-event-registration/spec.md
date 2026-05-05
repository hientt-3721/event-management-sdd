# Feature Specification: Event Registration Application

**Feature Branch**: `001-event-registration`
**Created**: 2026-05-05
**Status**: Draft
**Input**: User description: "Thực hiện giúp tôi dựng một bảng specify chi tiết cho ứng dụng đăng ký tham dự sự kiện với một số tính năng như sau, người dùng có thể login thông qua google auth, chọn 1 sự kiện và nhấn vào đăng ký tham dự và nhận vé điện tử (QR). Ban tổ chức có thể tạo sự kiện, cấu hình số lượng/loại vé, có trang check-in quét/xác thực vé tại cửa và kèm nhắc lịch trước giờ bắt đầu. Sau khi hoàn thiện ứng dụng còn cần 1 documents giới thiệu về ứng dụng có 2 loại ngôn ngữ có thể chọn là tiếng việt và tiếng anh nhé"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse & Register for an Event (Priority: P1)

An attendee visits the application, logs in with their Google account, browses the list of upcoming public events, selects one event, chooses a ticket type, and completes registration in a single flow. Immediately after registration the system displays the electronic QR ticket on screen.

**Why this priority**: This is the core value proposition of the application — without it no other feature has meaning.

**Independent Test**: Can be fully tested by a logged-in user navigating to the event list, clicking "Register", and verifying that a QR ticket is shown on the confirmation screen. Delivers standalone value as a complete self-service registration flow.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor opens the application, **When** they click "Sign in with Google", **Then** they are redirected to Google OAuth and return authenticated with their profile (name, email, avatar) visible.
2. **Given** an authenticated attendee is on the event list page, **When** they click an event card, **Then** they see the event detail page showing name, date, location, description, and available ticket types with remaining quantities.
3. **Given** an authenticated attendee is on the event detail page and at least one ticket type has remaining capacity, **When** they select a ticket type and click "Register", **Then** the system reserves one ticket, generates a unique QR code, and displays the confirmation screen with the QR ticket.
4. **Given** a ticket type has zero remaining capacity, **When** an attendee views the event detail page, **Then** that ticket type is displayed as "Sold out" and cannot be selected.
5. **Given** an attendee has already registered for a specific event, **When** they revisit the event detail page, **Then** they see a "You are registered" status and a link to view their existing ticket instead of the registration button.

---

### User Story 2 — View & Manage My Tickets (Priority: P2)

An authenticated attendee can access a personal dashboard that lists all their registered tickets. They can view the QR code for any ticket at any time and cancel a registration before the event starts.

**Why this priority**: Attendees need persistent access to their tickets after registration; without this the QR code is only accessible at registration time.

**Independent Test**: Can be tested by registering for an event and then navigating to "My Tickets" and verifying the ticket with its QR code is displayed. Delivers standalone value as a ticket wallet.

**Acceptance Scenarios**:

1. **Given** an authenticated attendee has at least one registered ticket, **When** they open "My Tickets", **Then** they see a list of their tickets grouped by upcoming and past events.
2. **Given** an attendee opens a ticket detail, **When** the page loads, **Then** the full-size QR code is displayed alongside the event name, date, location, and ticket type.
3. **Given** an upcoming event has not yet started, **When** an attendee cancels their registration, **Then** the ticket is marked cancelled, the ticket capacity is restored, and the QR code is invalidated.
4. **Given** an event has already started or ended, **When** an attendee views that ticket, **Then** the cancellation option is not available.

---

### User Story 3 — Organizer Creates & Configures an Event (Priority: P3)

An organizer (authenticated user with organizer role) can create a new event, fill in all details, and configure one or more ticket types with individual names, descriptions, and quantity limits.

**Why this priority**: Without events to register for, attendees have nothing to do. Organizer tooling must exist before the attendee flow can be tested end-to-end.

**Independent Test**: Can be tested by an organizer account creating an event with two ticket types and verifying the event appears in the public event list with correct ticket counts.

**Acceptance Scenarios**:

1. **Given** a user with the organizer role is authenticated, **When** they open the organizer dashboard and click "Create Event", **Then** they see a form with fields: name, description, start date/time, end date/time, location (text), and optional banner image.
2. **Given** an organizer fills in all required fields and submits the form, **When** the submission is successful, **Then** the event is created in Draft status and the organizer is taken to the event management page.
3. **Given** an organizer is on the event management page, **When** they add a ticket type with a name, description, and quantity, **Then** the ticket type appears in the list and its capacity is shown as `0 / [quantity]` used.
4. **Given** an organizer has added at least one ticket type, **When** they publish the event, **Then** the event becomes visible on the public event list and attendees can register.
5. **Given** a published event exists, **When** an organizer edits the event details, **Then** changes are saved and immediately reflected on the public event page.
6. **Given** an organizer wants to cancel or unpublish an event, **When** they do so, **Then** all existing tickets are invalidated and registered attendees are notified.

---

### User Story 4 — Check-In Staff Scans QR Tickets at the Door (Priority: P4)

A member of check-in staff opens the check-in page for a specific event on a mobile or desktop device, scans or manually enters an attendee's QR code, and instantly sees whether the ticket is valid, already used, or invalid.

**Why this priority**: The check-in flow closes the loop between registration and physical attendance and is a hard operational requirement on event day.

**Independent Test**: Can be tested by generating a test ticket, opening the check-in page, scanning the QR code, and verifying the "Valid — checked in" confirmation appears within 2 seconds.

**Acceptance Scenarios**:

1. **Given** a check-in staff member opens the check-in page for an event, **When** they scan a valid, unused ticket QR code, **Then** the system displays a green "Valid" confirmation with the attendee's name and ticket type within 2 seconds, and marks the ticket as used.
2. **Given** a ticket has already been checked in, **When** the same QR code is scanned again, **Then** the system displays a red "Already used" warning with the original check-in timestamp.
3. **Given** an invalid or unrecognised QR code is scanned, **When** the scan occurs, **Then** the system displays a red "Invalid ticket" message.
4. **Given** a cancelled ticket QR code is scanned, **When** the scan occurs, **Then** the system displays a red "Cancelled ticket" message.
5. **Given** the check-in page is open, **When** a staff member cannot scan (damaged QR), **Then** they can manually type the ticket code and trigger the same validation flow.

---

### User Story 5 — Reminder Notifications Before Event Start (Priority: P5)

Registered attendees automatically receive a reminder notification a configurable time before their event begins. The default reminder is sent 24 hours before and again 1 hour before the event starts.

**Why this priority**: Reminders reduce no-show rates and improve attendee experience; however they require all other core flows to be complete first.

**Independent Test**: Can be tested by creating an event starting in 25 hours, registering an attendee, and verifying the reminder email arrives at the 24-hour mark. Delivers value as a standalone notification service.

**Acceptance Scenarios**:

1. **Given** an attendee has a confirmed registration for an upcoming event, **When** the time reaches 24 hours before the event starts, **Then** the system sends a reminder email to the attendee's registered address with the event name, date, location, and a link to view their ticket.
2. **Given** an attendee has a confirmed registration, **When** the time reaches 1 hour before the event starts, **Then** a second reminder email is sent.
3. **Given** an attendee cancels their registration before a reminder is due, **When** the scheduled reminder time arrives, **Then** no email is sent.
4. **Given** an event is cancelled by the organizer, **When** the cancellation is processed, **Then** a cancellation notification is sent to all registered attendees immediately.

---

### User Story 6 — Bilingual Documentation Site (Priority: P6)

A public documentation website introduces the application to new users and organizers. Visitors can switch between Vietnamese and English at any time. The site covers feature overview, how-to guides for attendees and organizers, and FAQ.

**Why this priority**: Documentation is a post-launch deliverable; the application must be functionally complete before documentation is authored.

**Independent Test**: Can be tested independently by deploying only the docs site to Vercel and verifying both language versions load correctly.

**Acceptance Scenarios**:

1. **Given** a visitor opens the documentation site, **When** the page loads, **Then** the default language is Vietnamese and a language toggle (VI / EN) is visible in the header.
2. **Given** a visitor clicks the EN language toggle, **When** the switch completes, **Then** all page content (headings, body, navigation, and captions) is displayed in English without a full page reload.
3. **Given** a visitor navigates between documentation pages after switching language, **When** they click a link in the navigation, **Then** the selected language preference is preserved.
4. **Given** any device width from 375 px to 1440 px, **When** the documentation site loads, **Then** content is readable and navigation is accessible without horizontal scrolling.

---

### Edge Cases

- What happens when a user attempts to register for an event that just sold out (race condition between two simultaneous requests)?
- How does the system handle a Google account that is later deactivated or has email changed after initial registration?
- What happens if a reminder notification email bounces or is undeliverable?
- How does check-in behave if the device temporarily loses internet connectivity mid-scan?
- What happens when an organizer reduces the ticket quantity below the number of tickets already registered?
- What if an attendee's QR image is screenshot and presented from a different device simultaneously?

---

## Requirements *(mandatory)*

### Functional Requirements

**Authentication**

- **FR-001**: The system MUST allow users to authenticate exclusively via Google OAuth 2.0; no email/password login is provided.
- **FR-002**: The system MUST store the authenticated user's display name, email address, and profile picture from the Google identity token.
- **FR-003**: The system MUST maintain the authenticated session across browser tabs and page refreshes.
- **FR-004**: Users with the organizer role MUST be able to access a protected organizer dashboard; attendees who navigate to organizer routes MUST be redirected to the home page.

**Event Management (Organizer)**

- **FR-005**: Organizers MUST be able to create events with the following required fields: name, description, start date/time, end date/time, and location (free-text).
- **FR-006**: Organizers MUST be able to upload an optional banner image for an event.
- **FR-007**: Events MUST support a lifecycle: Draft → Published → Cancelled.
- **FR-008**: Organizers MUST be able to add, edit, and remove ticket types for an event while it is in Draft status.
- **FR-009**: Each ticket type MUST have: name, description (optional), and total quantity limit.
- **FR-010**: Organizers MUST NOT be able to reduce a ticket type's quantity below the number of tickets already issued for that type.
- **FR-011**: Organizers MUST be able to view a real-time attendee list per event showing name, email, ticket type, registration time, and check-in status.

**Attendee Registration**

- **FR-012**: The event list MUST display only Published events ordered by start date ascending.
- **FR-013**: Attendees MUST be authenticated to register for an event.
- **FR-014**: The system MUST prevent an attendee from registering for the same event more than once regardless of ticket type.
- **FR-015**: The system MUST enforce ticket quantity limits atomically to prevent overbooking under concurrent registrations.
- **FR-016**: Upon successful registration, the system MUST generate a cryptographically unique ticket identifier and render it as a QR code.
- **FR-017**: The QR code MUST encode only the ticket identifier; no personal data is embedded in the QR image.

**Ticket Wallet (Attendee)**

- **FR-018**: Authenticated attendees MUST be able to view all their tickets (upcoming and past) in a personal dashboard.
- **FR-019**: Each ticket view MUST display: event name, date, location, ticket type, QR code image, and current status (Active / Used / Cancelled).
- **FR-020**: Attendees MUST be able to cancel a ticket up to the time the event starts; cancellation after the event start time is not permitted.

**Check-In**

- **FR-021**: The check-in page MUST be accessible by users with organizer or check-in staff roles.
- **FR-022**: The check-in interface MUST support QR code scanning via the device camera.
- **FR-023**: The check-in interface MUST support manual entry of a ticket code as a fallback.
- **FR-024**: Validation result MUST be returned and displayed within 2 seconds of scan.
- **FR-025**: The system MUST prevent double check-in; scanning a previously checked-in ticket MUST display an "Already used" warning.
- **FR-026**: Each successful check-in MUST record the timestamp and (if available) the staff user who performed it.

**Notifications**

- **FR-027**: The system MUST send a reminder notification 24 hours before an event starts to all attendees with active tickets.
- **FR-028**: The system MUST send a second reminder notification 1 hour before the event starts.
- **FR-029**: The system MUST send an immediate cancellation notification to all registered attendees when an event is cancelled by the organizer.
- **FR-030**: Notifications MUST be delivered via email to the attendee's registered address.

**Documentation Site**

- **FR-031**: The documentation site MUST be publicly accessible without authentication.
- **FR-032**: The documentation site MUST support Vietnamese (default) and English language versions.
- **FR-033**: Language switching MUST be available on every page via a persistent toggle in the navigation header.
- **FR-034**: The documentation site MUST cover at minimum: application overview, attendee how-to guide, organizer how-to guide, and FAQ.

---

### Key Entities

- **User**: Represents an authenticated person. Attributes: id, email, display name, avatar URL, role (attendee | organizer | staff), created at.
- **Event**: A public gathering that attendees can register for. Attributes: id, organizer (User), name, description, start date/time, end date/time, location, banner image URL, status (draft | published | cancelled), created at, updated at.
- **TicketType**: A category of ticket within an Event. Attributes: id, event (Event), name, description, total quantity, issued count (derived), created at.
- **Ticket**: A registration record linking an attendee to a ticket type. Attributes: id (UUID, used as QR payload), attendee (User), ticket type (TicketType), status (active | used | cancelled), registered at, cancelled at.
- **CheckIn**: A record of a ticket being scanned at the door. Attributes: id, ticket (Ticket), scanned at, scanned by (User, optional).
- **Notification**: A scheduled or triggered message to an attendee. Attributes: id, attendee (User), event (Event), type (reminder_24h | reminder_1h | cancellation), scheduled at, sent at, status.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An attendee with a Google account can complete registration for a free event and view their QR ticket in under 60 seconds from first visiting the site.
- **SC-002**: The QR ticket is available on-screen immediately after successful registration (zero additional steps required to access it).
- **SC-003**: Check-in staff see a validation result (valid / already used / invalid) within 2 seconds of scanning a QR code under normal network conditions.
- **SC-004**: The system prevents overbooking in 100% of concurrent registration attempts — no ticket type exceeds its configured quantity limit.
- **SC-005**: Reminder emails are delivered within 5 minutes of their scheduled dispatch time (24 hours and 1 hour before event start).
- **SC-006**: The documentation site renders all content in the selected language (Vietnamese or English) within 2 seconds on a standard broadband connection.
- **SC-007**: All pages of the application and documentation site are fully usable at viewport widths of 375 px, 768 px, and 1280 px.
- **SC-008**: An organizer can create a complete event with two ticket types and publish it in under 5 minutes.

---

## Assumptions

- **Events are free** — no payment processing is required in v1. All ticket types have no monetary value.
- **Organizer role is manually assigned** — there is no self-service sign-up to become an organizer; role assignment is performed by a system administrator directly in the database.
- **One registration per user per event** — an attendee may hold at most one ticket per event, regardless of the number of ticket types available.
- **Single timezone** — all event dates and times are stored in UTC and displayed in the browser's local timezone. No per-event timezone configuration is required in v1.
- **Email is the sole notification channel** — push notifications and SMS are out of scope for v1.
- **Check-in requires internet connectivity** — offline check-in mode is out of scope for v1.
- **Image uploads are limited to JPEG/PNG under 5 MB** — no video or other media types for event banners.
- **All registered users are adults or have appropriate parental consent** — no age-gating UI is required.
- **The documentation site is a static or server-rendered website** — it does not require authentication and does not interact with the event database.
- **Language preference for the documentation site is session-based** — it is not persisted to a user profile.
