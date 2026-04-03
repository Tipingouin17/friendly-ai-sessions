/**
 * use Checkout Form Validation
 *
 * Page for the AIfacilitator application.
 */

import { useState, useEffect } from 'react';
import { CardElement } from '@stripe/react-stripe-js';
import { BillingDetails } from '../types';

export const useCheckoutFormValidation = () => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({ /* no-op */ });
  const [error, setError] = useState<string | null>(null);

  const validateForm = (billingDetails: BillingDetails, stripe: any, elements: any): Record<string, string> => {
    const newFieldErrors: Record<string, string> = { /* no-op */ };
    
    if (!billingDetails.name) {
      newFieldErrors['name'] = "Full name is required";
    }
    
    if (!billingDetails.email) {
      newFieldErrors['email'] = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(billingDetails.email)) {
      newFieldErrors['email'] = "Please enter a valid email address";
    }
    
    if (!billingDetails.address.line1) {
      newFieldErrors['address.line1'] = "Address is required";
    }
    
    if (!billingDetails.address.city) {
      newFieldErrors['address.city'] = "City is required";
    }
    
    if (!billingDetails.address.state) {
      newFieldErrors['address.state'] = "State/Province is required";
    }
    
    if (!billingDetails.address.postal_code) {
      newFieldErrors['address.postal_code'] = "Postal code is required";
    }
    
    if (!billingDetails.address.country) {
      newFieldErrors['address.country'] = "Country is required";
    }
    
    if (stripe && elements) {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        newFieldErrors['card'] = "Payment form not loaded properly";
      }
    }
    
    return newFieldErrors;
  };

  useEffect(() => {
    // Highlight fields with errors
    Object.entries(fieldErrors).forEach(([field, message]) => {
      if (field !== 'card') {
        const inputField = document.getElementById(field);
        if (inputField) {
          inputField.classList.add('border-destructive', 'focus-visible:ring-destructive');
        }
      }
    });
  }, [fieldErrors]);

  const hasFieldError = (fieldName: string) => {
    return fieldName in fieldErrors;
  };

  return {
    fieldErrors,
    setFieldErrors,
    error,
    setError,
    validateForm,
    hasFieldError,
  };
};
