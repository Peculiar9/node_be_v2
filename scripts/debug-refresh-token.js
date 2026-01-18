/**
 * Debug script for refresh token issues
 * Run this with Node to check environment configuration and token handling
 */
require('dotenv').config();

// Check environment variables
console.log('Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_ACCESS_SECRET length:', process.env.JWT_ACCESS_SECRET ? process.env.JWT_ACCESS_SECRET.length : 'MISSING');
console.log('JWT_REFRESH_SECRET length:', process.env.JWT_REFRESH_SECRET ? process.env.JWT_REFRESH_SECRET.length : 'MISSING');
console.log('JWT_ACCESS_EXPIRATION:', process.env.JWT_ACCESS_EXPIRATION || 'default (15m)');
console.log('JWT_REFRESH_EXPIRATION:', process.env.JWT_REFRESH_EXPIRATION || 'default (7d)');

// Check if secrets are different between environments
console.log('\nSecret Comparison:');
if (process.env.JWT_ACCESS_SECRET && process.env.JWT_REFRESH_SECRET) {
  console.log('ACCESS and REFRESH secrets are identical:', process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET);
  
  // Check first and last few characters (without revealing full secrets)
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  
  console.log('ACCESS_SECRET starts with:', accessSecret.substring(0, 3) + '...');
  console.log('ACCESS_SECRET ends with:', '...' + accessSecret.substring(accessSecret.length - 3));
  console.log('REFRESH_SECRET starts with:', refreshSecret.substring(0, 3) + '...');
  console.log('REFRESH_SECRET ends with:', '...' + refreshSecret.substring(refreshSecret.length - 3));
}

// Test token verification
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function testTokenVerification() {
  try {
    console.log('\nToken Verification Test:');
    
    // Create a test token
    const payload = { sub: 'test-user', type: 'refresh' };
    const testToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'fallback-secret-for-testing',
      { expiresIn: '1h' }
    );
    
    console.log('Test token created successfully');
    
    // Verify the token
    try {
      const decoded = jwt.verify(testToken, process.env.JWT_REFRESH_SECRET);
      console.log('Token verification successful:', decoded.sub);
    } catch (error) {
      console.error('Token verification failed:', error.message);
    }
    
    // Test bcrypt comparison
    const testHash = async () => {
      const hash = await bcrypt.hash(testToken, 10);
      console.log('Hash created successfully');
      
      const isValid = await bcrypt.compare(testToken, hash);
      console.log('bcrypt comparison result:', isValid);
    };
    
    testHash();
  } catch (error) {
    console.error('Error in token test:', error);
  }
}

testTokenVerification();
