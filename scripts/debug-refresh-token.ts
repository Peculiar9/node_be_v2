/**
 * Debug script for refresh token issues in test environment
 * 
 * This script will:
 * 1. Check environment variables
 * 2. Test token generation and verification
 * 3. Test bcrypt hash comparison
 * 4. Check database state for a sample user
 * 
 * Run with: npx ts-node debug-refresh-token.ts
 */

import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { createConnection } from 'typeorm';
import { User } from '../src/Core/Application/Entities/User';

// Load environment variables
dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}=== REFRESH TOKEN DEBUGGING TOOL ===${colors.reset}`);
console.log(`${colors.cyan}Running in environment: ${process.env.NODE_ENV || 'Not set'}${colors.reset}\n`);

// Check environment variables
function checkEnvironmentVariables() {
  console.log(`${colors.magenta}=== ENVIRONMENT VARIABLES ===${colors.reset}`);

  const checkEnvVar = (name: string, sensitive = false) => {
    const value = process.env[name];
    if (!value) {
      console.log(`${colors.red}❌ ${name}: MISSING${colors.reset}`);
      return false;
    }

    if (sensitive) {
      console.log(`${colors.green}✓ ${name}: ${(value as string).substring(0, 3)}...${(value as string).substring(value.length - 3)} (${value.length} chars)${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ ${name}: ${value}${colors.reset}`);
    }
    return true;
  };

  const accessSecretExists = checkEnvVar('JWT_ACCESS_SECRET', true);
  const refreshSecretExists = checkEnvVar('JWT_REFRESH_SECRET', true);
  checkEnvVar('JWT_ACCESS_EXPIRATION');
  checkEnvVar('JWT_REFRESH_EXPIRATION');

  // Check if secrets are the same (which could be a problem)
  if (accessSecretExists && refreshSecretExists) {
    const accessSecret = process.env.JWT_ACCESS_SECRET!;
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;

    if (accessSecret === refreshSecret) {
      console.log(`${colors.yellow}⚠️ WARNING: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are identical${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are different (good)${colors.reset}`);
    }
  }

  console.log();
}

// Test token generation and verification
async function testTokenGeneration() {
  console.log(`${colors.magenta}=== TOKEN GENERATION AND VERIFICATION ===${colors.reset}`);

  try {
    // Generate a test refresh token
    const payload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      roles: ['user'],
      type: 'refresh'
    };

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      console.log(`${colors.red}❌ Cannot generate token: JWT_REFRESH_SECRET is missing${colors.reset}`);
      return;
    }

    const token = jwt.sign(
      payload,
      refreshSecret as jwt.Secret,
      {
        expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any,
        jwtid: Math.random().toString(36).substring(2),
      }
    );

    console.log(`${colors.green}✓ Test token generated successfully${colors.reset}`);
    console.log(`${colors.blue}Token: ${token.substring(0, 20)}...${colors.reset}`);

    // Verify the token
    try {
      const decoded = jwt.verify(token, refreshSecret) as any;
      console.log(`${colors.green}✓ Token verification successful${colors.reset}`);
      console.log(`${colors.blue}Decoded payload: ${JSON.stringify(decoded, null, 2)}${colors.reset}`);

      // Now try with wrong secret
      try {
        const wrongSecret = refreshSecret + 'wrong';
        jwt.verify(token, wrongSecret);
        console.log(`${colors.red}❌ Token verified with wrong secret (this is bad)${colors.reset}`);
      } catch (error: any) {
        console.log(`${colors.green}✓ Token correctly failed verification with wrong secret: ${error.message}${colors.reset}`);
      }
    } catch (error: any) {
      console.log(`${colors.red}❌ Token verification failed: ${error.message}${colors.reset}`);
    }

    // Test bcrypt hashing and comparison
    console.log(`\n${colors.magenta}=== BCRYPT HASH TESTING ===${colors.reset}`);
    const hashedToken = await bcrypt.hash(token, 10);
    console.log(`${colors.blue}Hashed token: ${hashedToken.substring(0, 20)}...${colors.reset}`);

    const isValid = await bcrypt.compare(token, hashedToken);
    if (isValid) {
      console.log(`${colors.green}✓ bcrypt comparison successful${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ bcrypt comparison failed${colors.reset}`);
    }

    // Test with wrong token
    const isInvalid = await bcrypt.compare(token + 'wrong', hashedToken);
    if (!isInvalid) {
      console.log(`${colors.green}✓ bcrypt correctly rejected invalid token${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ bcrypt incorrectly accepted invalid token${colors.reset}`);
    }
  } catch (error: any) {
    console.log(`${colors.red}❌ Error in token testing: ${error.message}${colors.reset}`);
  }

  console.log();
}

// Check database for user refresh tokens
async function checkDatabase() {
  console.log(`${colors.magenta}=== DATABASE CHECK ===${colors.reset}`);

  try {
    // Create a database connection
    const connection = await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User],
      synchronize: false
    });

    console.log(`${colors.green}✓ Database connection established${colors.reset}`);

    // Query for users with refresh tokens
    const userRepository = connection.getRepository(User);
    const users = await userRepository.find({
      take: 5,
      order: { created_at: 'DESC' }
    });

    console.log(`${colors.blue}Found ${users.length} recent users${colors.reset}`);

    if (users.length > 0) {
      for (const user of users) {
        console.log(`\n${colors.blue}User ID: ${user._id}${colors.reset}`);
        console.log(`${colors.blue}Email: ${user.email}${colors.reset}`);
        console.log(`${colors.blue}Has refresh token: ${user.refresh_token ? 'YES' : 'NO'}${colors.reset}`);
        if (user.refresh_token) {
          console.log(`${colors.blue}Refresh token length: ${user.refresh_token.length}${colors.reset}`);
          console.log(`${colors.blue}Refresh token starts with: ${user.refresh_token.substring(0, 20)}...${colors.reset}`);

          // Check if it's a valid bcrypt hash
          const isBcryptHash = user.refresh_token.startsWith('$2');
          console.log(`${colors.blue}Is valid bcrypt hash format: ${isBcryptHash ? 'YES' : 'NO'}${colors.reset}`);
        }
      }
    } else {
      console.log(`${colors.yellow}⚠️ No users found in the database${colors.reset}`);
    }

    await connection.close();
  } catch (error: any) {
    console.log(`${colors.red}❌ Database error: ${error.message}${colors.reset}`);
  }
}

// Run all tests
async function runTests() {
  checkEnvironmentVariables();
  await testTokenGeneration();
  await checkDatabase();

  console.log(`\n${colors.cyan}=== DEBUGGING COMPLETE ===${colors.reset}`);
  console.log(`${colors.cyan}If you're still having issues, check the following:${colors.reset}`);
  console.log(`${colors.cyan}1. Are the environment variables the same between dev and test?${colors.reset}`);
  console.log(`${colors.cyan}2. Is the database connection working properly?${colors.reset}`);
  console.log(`${colors.cyan}3. Are refresh tokens being properly stored in the database?${colors.reset}`);
  console.log(`${colors.cyan}4. Are you using the correct refresh token in your request?${colors.reset}`);
}

runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
});
