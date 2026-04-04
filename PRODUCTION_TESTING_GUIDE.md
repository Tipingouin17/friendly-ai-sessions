# Alfacilitator Production Testing Guide

This guide provides a comprehensive, step-by-step checklist to verify that all critical user flows, edge cases, and recent fixes are working perfectly in the production environment.

## 1. Authentication & Onboarding Flow

### 1.1 Sign Up
- [ ] Navigate to `/signup`.
- [ ] Enter a valid name, email, and password (min 8 characters).
- [ ] **Expected:** You should NOT be logged in immediately. You should be redirected to `/login`.
- [ ] **Expected:** A green success banner should appear on the login page: *"Account created successfully! Please log in with your new credentials."*

### 1.2 Log In
- [ ] Enter the credentials you just created.
- [ ] **Expected:** Successful login, redirected to `/my-facilitators` (or dashboard).
- [ ] **Edge Case:** Enter an incorrect password.
- [ ] **Expected:** Clear error message, login blocked.

### 1.3 Session Persistence (The "Restart" Test)
- [ ] While logged in, wait for a backend deployment or manually trigger a restart in Railway.
- [ ] Refresh the page.
- [ ] **Expected:** You remain logged in.
- [ ] Log out, then try to log in again with the same credentials.
- [ ] **Expected:** Login succeeds (verifies that passwords are now correctly persisted to the database across container restarts).

---

## 2. Navigation & Layout (Mobile & Desktop)

### 2.1 Mobile Navigation
- [ ] Open the site on a mobile device (or use Chrome DevTools device toolbar).
- [ ] Open the hamburger menu.
- [ ] Click any link (e.g., "Pricing" or "My Facilitators").
- [ ] **Expected:** The menu drawer closes automatically.
- [ ] **Expected:** The page scrolls instantly to the very top (no landing mid-page).

### 2.2 Pricing Page Spacing
- [ ] View the `/pricing` page on mobile.
- [ ] **Expected:** The gap between the top navigation bar and the indigo hero section is tight (no massive white blank space).
- [ ] **Expected:** The gap between the hero text and the "Limited Time Offer" banner is tight and natural.

### 2.3 Home Page CTAs
- [ ] While **logged out**, check the top hero button and bottom CTA button on the home page.
- [ ] **Expected:** Both say "Try it for free now" / "Get Started Free" and link to `/signup`.
- [ ] While **logged in**, check the same buttons.
- [ ] **Expected:** Both say "Go to My Facilitators" and link to `/my-facilitators`.

---

## 3. Subscription & Checkout Flow

### 3.1 Promo Code Validation
- [ ] Go to `/pricing` and click "Upgrade Plan" on the Premium tier.
- [ ] In the Order Summary sidebar, enter an invalid promo code (e.g., `FAKECODE`).
- [ ] **Expected:** Error message: "Invalid or expired promo code".
- [ ] Enter the valid code: `WELCOME20`.
- [ ] **Expected:** Green success badge appears. The original price is crossed out, and the new discounted price ($39.20) is shown.

### 3.2 Payment Processing
- [ ] Fill out the Stripe test card details (e.g., `4242 4242 4242 4242`).
- [ ] Submit the payment.
- [ ] **Expected:** Redirected to a success page, and your account status changes to "Premium".

---

## 4. Session Setup Wizard (Mobile & Desktop)

### 4.1 Mobile Layout
- [ ] Go to `/my-facilitators` on a mobile device.
- [ ] **Expected:** The top stepper labels are abbreviated ("Facilitator", "Workshop", "Participants") so they fit on one line.
- [ ] **Expected:** The Facilitator cards are displayed in a 2-column grid (not squished into 4 columns).
- [ ] **Expected:** The `<` and `>` navigation buttons are fully visible inside the white card area (not clipped off the edges).
- [ ] **Expected:** The avatar images for the facilitators load immediately (no broken image icons).

### 4.2 Language Selection
- [ ] In Step 2 (Workshop Setup), select a non-English language from the dropdown (e.g., **French** or **Spanish**).
- [ ] Complete the setup and click "Start Session".

---

## 5. Real-Time Session Execution

### 5.1 Host View
- [ ] As the host, you should see the session dashboard.
- [ ] Copy the "Participant Link".

### 5.2 Participant Join (Real-Time Test)
- [ ] Open an **Incognito window** (or a different browser) and paste the Participant Link.
- [ ] Enter a name and join the session.
- [ ] **Expected (Participant View):** You should immediately see a Welcome Message from the AI facilitator.
- [ ] **Expected (Language Test):** Because you selected French/Spanish in step 4.2, the welcome message **must be entirely in that language**.
- [ ] **Expected (Host View):** Look back at the Host window. The new participant's name should appear in the "Participants" list **instantly**, without needing to refresh the page.

### 5.3 Chat Auto-Scroll
- [ ] In the Participant window, send 5-6 messages so the chat fills the screen and becomes scrollable.
- [ ] Scroll up slightly to read an older message.
- [ ] Have the AI (or another participant) send a new message.
- [ ] **Expected:** The screen does **not** violently auto-scroll you to the bottom.
- [ ] **Expected:** A sticky "New messages ↓" button appears at the bottom of the chat area.
- [ ] Click the "New messages ↓" button.
- [ ] **Expected:** The chat scrolls smoothly to the bottom.

### 5.4 AI Language Adherence
- [ ] Send a message to the AI in the Participant window.
- [ ] **Expected:** The AI responds **exclusively** in the language selected during setup (French/Spanish), proving the language instruction is correctly passed to the OpenAI model.

---

## 6. Profile & Settings

### 6.1 Password Change
- [ ] Go to `/profile`.
- [ ] Click "Change Password".
- [ ] **Expected:** You are required to enter your *Current Password* as well as the new one.
- [ ] Submit the change.
- [ ] Log out, and log back in with the *new* password.
- [ ] **Expected:** Login succeeds (verifies the backend `PUT /auth/v1/user` endpoint correctly hashes and saves the new password).
