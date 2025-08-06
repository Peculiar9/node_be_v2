/**
 * Payment Integration Example
 * 
 * This file demonstrates how to integrate with the payment API endpoints
 * from a client-side application using vanilla JavaScript.
 * 
 * For a real implementation, you would integrate this with your frontend framework
 * (React, Vue, Angular, etc.) and use proper state management.
 */

class PaymentIntegration {
  constructor(apiBaseUrl, stripePublishableKey) {
    this.apiBaseUrl = apiBaseUrl;
    this.stripe = Stripe(stripePublishableKey);
    this.elements = null;
    this.card = null;
  }

  /**
   * Initialize the payment form with Stripe Elements
   * @param {string} cardElementId - DOM element ID where to mount the card element
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initializePaymentForm(cardElementId) {
    try {
      // Initialize Stripe Elements
      this.elements = this.stripe.elements();
      
      // Create and mount the Card Element
      this.card = this.elements.create('card', {
        style: {
          base: {
            color: '#32325d',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': { color: '#aab7c4' }
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
          }
        }
      });
      
      this.card.mount(`#${cardElementId}`);
      
      // Add event listener for validation errors
      this.card.addEventListener('change', (event) => {
        const displayError = document.getElementById('card-errors');
        if (displayError) {
          displayError.textContent = event.error ? event.error.message : '';
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize payment form:', error);
      return false;
    }
  }

  /**
   * Get a setup intent from the server
   * @returns {Promise<{clientSecret: string}>} - The setup intent client secret
   */
  async getSetupIntent() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/payment/setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create setup intent');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting setup intent:', error);
      throw error;
    }
  }

  /**
   * Add a new payment method using Stripe Elements
   * @param {string} cardholderName - Name of the cardholder
   * @param {boolean} setAsDefault - Whether to set as default payment method
   * @returns {Promise<Object>} - The added payment method
   */
  async addPaymentMethod(cardholderName, setAsDefault = true) {
    try {
      // Step 1: Get a setup intent from the server
      const setupIntent = await this.getSetupIntent();
      
      // Step 2: Use the setup intent to securely collect card details
      const result = await this.stripe.confirmCardSetup(setupIntent.clientSecret, {
        payment_method: {
          card: this.card,
          billing_details: { name: cardholderName }
        }
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      // Step 3: Send the payment method ID to the server
      return await this.savePaymentMethod(result.setupIntent.payment_method, setAsDefault);
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Save a payment method to the server
   * @param {string} paymentMethodId - The Stripe payment method ID
   * @param {boolean} setAsDefault - Whether to set as default
   * @returns {Promise<Object>} - The saved payment method
   */
  async savePaymentMethod(paymentMethodId, setAsDefault = true) {
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save payment method');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving payment method:', error);
      throw error;
    }
  }

  /**
   * Get all payment methods for the current user
   * @returns {Promise<Array>} - List of payment methods
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get payment methods');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  /**
   * Set a payment method as default
   * @param {string} paymentMethodId - The payment method ID to set as default
   * @returns {Promise<{success: boolean}>} - Success status
   */
  async setDefaultPaymentMethod(paymentMethodId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/payment/methods/default`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ paymentMethodId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set default payment method');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Remove a payment method
   * @param {string} paymentMethodId - The payment method ID to remove
   * @returns {Promise<{success: boolean}>} - Success status
   */
  async removePaymentMethod(paymentMethodId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/payment/methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove payment method');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  }

  /**
   * Get the authentication token from localStorage
   * @returns {string} - The authentication token
   */
  getAuthToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * Render payment methods to the DOM
   * @param {Array} paymentMethods - List of payment methods
   * @param {string} containerId - DOM element ID where to render payment methods
   */
  renderPaymentMethods(paymentMethods, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!paymentMethods || paymentMethods.length === 0) {
      container.innerHTML = '<p>No payment methods found.</p>';
      return;
    }
    
    const list = document.createElement('ul');
    list.className = 'payment-methods-list';
    
    paymentMethods.forEach(method => {
      const item = document.createElement('li');
      item.className = 'payment-method-item';
      if (method.isDefault) {
        item.classList.add('default');
      }
      
      const cardInfo = document.createElement('div');
      cardInfo.className = 'card-info';
      cardInfo.innerHTML = `
        <span class="card-brand">${method.brand}</span>
        <span class="card-last4">•••• ${method.last4}</span>
        <span class="card-expiry">${method.expMonth}/${method.expYear}</span>
        ${method.isDefault ? '<span class="default-badge">Default</span>' : ''}
      `;
      
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      
      if (!method.isDefault) {
        const setDefaultBtn = document.createElement('button');
        setDefaultBtn.className = 'set-default-btn';
        setDefaultBtn.textContent = 'Set as Default';
        setDefaultBtn.onclick = () => this.setDefaultPaymentMethod(method.id)
          .then(() => this.getPaymentMethods())
          .then(methods => this.renderPaymentMethods(methods, containerId))
          .catch(error => alert(`Error: ${error.message}`));
        actions.appendChild(setDefaultBtn);
      }
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => this.removePaymentMethod(method.id)
        .then(() => this.getPaymentMethods())
        .then(methods => this.renderPaymentMethods(methods, containerId))
        .catch(error => alert(`Error: ${error.message}`));
      actions.appendChild(removeBtn);
      
      item.appendChild(cardInfo);
      item.appendChild(actions);
      list.appendChild(item);
    });
    
    container.appendChild(list);
  }
}

/**
 * Example usage:
 * 
 * HTML Structure:
 * <div class="payment-form">
 *   <div class="form-row">
 *     <label for="cardholder-name">Cardholder Name</label>
 *     <input id="cardholder-name" type="text" placeholder="Jane Doe">
 *   </div>
 *   <div class="form-row">
 *     <label for="card-element">Credit or debit card</label>
 *     <div id="card-element"></div>
 *     <div id="card-errors" role="alert"></div>
 *   </div>
 *   <button id="submit-payment">Add Payment Method</button>
 * </div>
 * 
 * <div id="payment-methods-container"></div>
 * 
 * JavaScript:
 * const paymentIntegration = new PaymentIntegration(
 *   'https://your-api-url.com',
 *   'pk_test_your_stripe_publishable_key'
 * );
 * 
 * document.addEventListener('DOMContentLoaded', async () => {
 *   // Initialize the payment form
 *   await paymentIntegration.initializePaymentForm('card-element');
 *   
 *   // Load and render existing payment methods
 *   try {
 *     const methods = await paymentIntegration.getPaymentMethods();
 *     paymentIntegration.renderPaymentMethods(methods, 'payment-methods-container');
 *   } catch (error) {
 *     console.error('Error loading payment methods:', error);
 *   }
 *   
 *   // Add event listener for form submission
 *   document.getElementById('submit-payment').addEventListener('click', async (e) => {
 *     e.preventDefault();
 *     
 *     const cardholderName = document.getElementById('cardholder-name').value;
 *     if (!cardholderName) {
 *       alert('Please enter cardholder name');
 *       return;
 *     }
 *     
 *     try {
 *       const paymentMethod = await paymentIntegration.addPaymentMethod(cardholderName, true);
 *       console.log('Payment method added:', paymentMethod);
 *       
 *       // Refresh the payment methods list
 *       const methods = await paymentIntegration.getPaymentMethods();
 *       paymentIntegration.renderPaymentMethods(methods, 'payment-methods-container');
 *       
 *       // Clear the form
 *       document.getElementById('cardholder-name').value = '';
 *       paymentIntegration.card.clear();
 *       
 *       alert('Payment method added successfully!');
 *     } catch (error) {
 *       console.error('Error adding payment method:', error);
 *       alert(`Error: ${error.message}`);
 *     }
 *   });
 * });
 */
