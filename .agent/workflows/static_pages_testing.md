---
description: Manual testing guide for static pages
---

# Static Pages Testing Guide

This guide covers manual testing for all static pages in the application.

## Prerequisites
- Application running at http://localhost:8080
- User account created and logged in
- Browser console open (F12) to check for errors

---

## Test 1: Contact Page

**URL:** http://localhost:8080/contact

### Steps:
1. Navigate to the Contact page
2. Verify page loads without errors
3. Check that the contact form is displayed
4. Fill in all required fields:
   - Name
   - Email
   - Subject
   - Message
5. Submit the form
6. Verify success/error message appears

**Expected Results:**
- Page loads successfully
- Form is functional
- Validation works for required fields
- Submission provides feedback

---

## Test 2: FAQs Page

**URL:** http://localhost:8080/faqs

### Steps:
1. Navigate to the FAQs page
2. Verify page loads without errors
3. Check that FAQ items are displayed
4. Click on different FAQ items to expand/collapse
5. Verify search functionality (if present)

**Expected Results:**
- Page loads successfully
- FAQ items expand/collapse correctly
- Content is readable and well-formatted

---

## Test 3: Profile Page

**URL:** http://localhost:8080/profile

### Steps:
1. Navigate to the Profile page
2. Verify user information is displayed correctly
3. Check subscription status display
4. Test "Edit Profile" functionality (if available)
5. Verify "Upgrade Plan" button (if on free/basic plan)

**Expected Results:**
- User data loads correctly
- Current plan is displayed
- Profile editing works (if implemented)
- No console errors

---

## Test 4: Settings Page

**URL:** http://localhost:8080/settings

### Steps:
1. Navigate to the Settings page
2. Verify all settings sections are displayed
3. Test changing notification preferences
4. Test changing account settings
5. Test password change functionality
6. Save changes and verify persistence

**Expected Results:**
- All settings load correctly
- Changes are saved successfully
- Validation works for password changes
- Success/error messages appear

---

## Test 5: Referrals Page

**URL:** http://localhost:8080/referrals

### Steps:
1. Navigate to the Referrals page
2. Verify referral code/link is displayed
3. Test "Copy Referral Link" functionality
4. Check referral statistics (if available)
5. Verify referral rewards information

**Expected Results:**
- Referral code/link displays correctly
- Copy functionality works
- Statistics are accurate (if implemented)
- No console errors

---

## Test 6: Past Workshops Page

**URL:** http://localhost:8080/past-workshops

### Steps:
1. Navigate to the Past Workshops page
2. Verify list of past sessions displays
3. Click on a past workshop to view details
4. Test filtering/sorting options (if available)
5. Verify session data is accurate

**Expected Results:**
- Past workshops list loads
- Workshop details are accessible
- Data matches actual session history
- No console errors

---

## Test 7: My Facilitators Page

**URL:** http://localhost:8080/my-facilitators

### Steps:
1. Navigate to the My Facilitators page
2. Verify list of available facilitators displays
3. Check facilitator details and descriptions
4. Test "Create Custom Facilitator" (if premium feature)
5. Verify facilitator selection works

**Expected Results:**
- Facilitators list loads correctly
- Facilitator information is complete
- Custom facilitator creation works (premium)
- No console errors

---

## Common Issues to Check

For **ALL** pages, verify:
- ✅ No console errors or warnings
- ✅ Page loads within 3 seconds
- ✅ Navigation menu works
- ✅ Responsive design (test on mobile view)
- ✅ Protected routes redirect if not authenticated
- ✅ Loading states display during data fetching
- ✅ Error states display if data fails to load

---

## Reporting Issues

If you find any issues, note:
1. Page URL
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (if any)
5. Screenshots (if applicable)
