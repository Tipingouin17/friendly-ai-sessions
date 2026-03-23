---
description: Manual testing guide for the refactored session flow (Host, Participant, Multi-user)
---

# Refactored Session Flow Testing Guide

This guide covers the testing of the refactored session management, data fetching, and participant handling logic.

## Prerequisites
- Application running at http://localhost:8080
- User account created and logged in (for Host)
- Incognito window or second browser (for Participant 1)
- **User Assistance Required** for Participant 2

---

## Test 1: Host Session Creation

**Persona:** Host (Admin)

### Steps:
1.  Navigate to `http://localhost:8080/`
2.  Log in if not already logged in.
3.  Click "Start New Session" (or equivalent button).
4.  Configure session settings (e.g., Topic: "Refactoring Test", Facilitator: Default).
5.  Click "Create Session".
6.  **Verify:**
    *   Redirected to `/session/host/[conversationId]`.
    *   "Waiting for participants" screen or similar host dashboard appears.
    *   Session Status indicates "Not Started" or "Waiting".
    *   Participant count is 0.
    *   QR Code / Join Link is visible.

---

## Test 2: Participant 1 Join (Anonymous)

**Persona:** Participant 1
**Environment:** Incognito Window / Browser A

### Steps:
1.  Open recent "Join Link" or navigate to `http://localhost:8080/session?conversationId=[ID]`.
2.  Enter Name: "Participant One".
3.  Select an avatar.
4.  Click "Join Session".
5.  **Verify (Participant View):**
    *   Redirected to `/session/[conversationId]`.
    *   See "Waiting for host to start" message (if not started).
    *   Chat interface is visible (if allowed before start).
6.  **Verify (Host View):**
    *   Participant count updates to 1.
    *   "Participant One" appears in the participant list.
    *   Toast notification (optional) appears.

---

## Test 3: Session Start

**Persona:** Host

### Steps:
1.  On the Host screen, click "Start Session".
2.  **Verify:**
    *   Session status changes to "Active" / "In Progress".
    *   **Participant 1 View:** Screen updates to show active session / AI welcome message.
    *   **Host View:** Controls update (e.g., "Pause Session", "End Session" become available).

---

## Test 4: Basic Messaging

**Persona:** Host & Participant 1

### Steps:
1.  **Host:** Send a message "Welcome everyone!".
    *   Verify it appears in Host chat.
    *   Verify it appears in Participant 1 chat.
2.  **Participant 1:** Send a message "Hello Host!".
    *   Verify it appears in Participant 1 chat.
    *   Verify it appears in Host chat.

---

## Test 5: Multi-Participant (User Help Needed)

**Persona:** Participant 2 (The User)
**Environment:** User's Browser / Device

### Steps:
1.  **AI Assistant:** Provide the Join URL to the User.
2.  **User:** Open the URL in a new window/device.
3.  **User:** Join as "Participant Two".
4.  **Verify (All Views):**
    *   **Host:** Participant count becomes 2. "Participant Two" appears in list.
    *   **Participant 1:** "Participant Two" might appear in a list or presence indicator.
    *   **Participant 2:** Successfully joins and sees active session history (if enabled) or current state.
5.  **Interaction:**
    *   **User (P2):** Send message "Hello from the User!".
    *   **Verify:** Host and P1 see the message.

---

## Test 6: Session Termination

**Persona:** Host

### Steps:
1.  Click "End Session".
2.  Confirm termination.
3.  **Verify:**
    *   **Host:** Redirected to summary/dashboard.
    *   **Participants (P1 & P2):** Redirected to "Session Ended" screen or similar.

