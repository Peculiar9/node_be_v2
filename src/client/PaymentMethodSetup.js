/**
 * PaymentMethodSetup.js
 * 
 * This file demonstrates how to integrate Stripe Elements on the client side
 * to securely collect payment information and send it to our backend.
 * 
 * This would typically be part of a React/Vue/Angular component in your frontend app.
 */

// Example implementation using vanilla JavaScript and Stripe Elements
class PaymentMethodSetup {
  constructor(apiBaseUrl, stripePublishableKey) {
    this.apiBaseUrl = apiBaseUrl;
    this.stripe = Stripe(stripePublishableKey);
    this.elements = null;
    this.setupIntentClientSecret = null;
    this.card = null;
  }

  /**
   * Initialize the payment form
   * @param {string} elementId - DOM element ID where to mount the card element
   */
  async initializePaymentForm(elementId) {
    try {
      // Step 1: Get a setup intent from our backend
      const setupIntent = await this.createSetupIntent();
      this.setupIntentClientSecret = setupIntent.clientSecret;
      
      // Step 2: Initialize Stripe Elements
      this.elements = this.stripe.elements();
      
      // Step 3: Create and mount the Card Element
      this.card = this.elements.create('card', {
        style: {
          base: {
            color: '#32325d',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
              color: '#aab7c4'
            }
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
          }
        }
      });
      
      this.card.mount(`#${elementId}`);
      
      // Step 4: Handle real-time validation errors
      this.card.addEventListener('change', (event) => {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
          displayError.textContent = event.error.message;
        } else {
          displayError.textContent = '';
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize payment form:', error);
      return false;
    }
  }
  
  /**
   * Create a setup intent by calling our backend API
   * @returns {Promise<Object>} Setup intent with client secret
   */
  async createSetupIntent() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/payment/setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }
  
  /**
   * Submit the payment method to Stripe and then to our backend
   * @returns {Promise<Object>} Added payment method details
   */
  async submitPaymentMethod() {
    try {
      // Step 1: Confirm the setup with Stripe to securely collect card details
      const result = await this.stripe.confirmCardSetup(this.setupIntentClientSecret, {
        payment_method: {
          card: this.card,
          billing_details: {
            name: document.getElementById('cardholder-name').value
          }
        }
      });
      
      if (result.error) {
        // Show error to your customer
        const errorElement = document.getElementById('card-errors');
        errorElement.textContent = result.error.message;
        throw new Error(result.error.message);
      }
      
      // Step 2: Send the payment method ID to our backend
      return await this.addPaymentMethodToBackend(result.setupIntent.payment_method, true);
    } catch (error) {
      console.error('Error submitting payment method:', error);
      throw error;
    }
  }
  
  /**
   * Add the payment method to our backend
   * @param {string} paymentMethodId - The Stripe payment method ID
   * @param {boolean} setAsDefault - Whether to set this as the default payment method
   * @returns {Promise<Object>} Added payment method details
   */
  async addPaymentMethodToBackend(paymentMethodId, setAsDefault = true) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/payment/methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          paymentMethodId,
          setAsDefault
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add payment method');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding payment method to backend:', error);
      throw error;
    }
  }
  
  /**
   * Get all payment methods for the current user
   * @returns {Promise<Array>} List of payment methods
   */
  async getPaymentMethods() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/payment/methods`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get payment methods');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }
  
  /**
   * Get the authentication token from localStorage
   * @returns {string} Auth token
   */
  getAuthToken() {
    return localStorage.getItem('auth_token');
  }
}

// Example HTML structure needed for this component:
/*
<div class="payment-form">
  <div class="form-row">
    <label for="cardholder-name">Cardholder Name</label>
    <input id="cardholder-name" type="text" placeholder="Jane Doe" required>
  </div>
  
  <div class="form-row">
    <label for="card-element">Credit or debit card</label>
    <div id="card-element">
      <!-- Stripe Element will be inserted here -->
    </div>
    <div id="card-errors" role="alert"></div>
  </div>
  
  <button id="submit-payment">Add Payment Method</button>
</div>

<script>
  // Initialize the payment form
  const paymentSetup = new PaymentMethodSetup(
    'https://your-api-url.com',
    'pk_test_your_publishable_key'
  );
  
  document.addEventListener('DOMContentLoaded', async () => {
    await paymentSetup.initializePaymentForm('card-element');
    
    document.getElementById('submit-payment').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const paymentMethod = await paymentSetup.submitPaymentMethod();
        console.log('Payment method added:', paymentMethod);
        // Show success message to user
      } catch (error) {
        console.error('Failed to add payment method:', error);
        // Show error message to user
      }
    });
  });
</script>
*/

export default PaymentMethodSetup;
