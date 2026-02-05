#!/usr/bin/env node

/**
 * Test Authentication Flow
 * Tests the complete login flow with cookie-based authentication
 */

import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow...\n');

  try {
    // Create cookie jar and wrap axios
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      baseURL: API_BASE_URL,
      jar,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      }
    }));

    // Step 1: Login
    console.log('1️⃣ Testing Login...');
    const loginResponse = await client.post('/auth/login', {
      email: 'hkmanager@premierhotel.com',
      password: 'Test@123'
    });

    console.log('✅ Login successful!');
    console.log('   User:', loginResponse.data.user.full_name);
    console.log('   Role:', loginResponse.data.user.role);
    console.log('   Message:', loginResponse.data.message);

    // Step 2: Test authenticated endpoint
    console.log('\n2️⃣ Testing authenticated endpoint (/auth/me)...');
    const meResponse = await client.get('/auth/me');

    console.log('✅ Authenticated request successful!');
    console.log('   User ID:', meResponse.data.user.id);
    console.log('   Email:', meResponse.data.user.email);
    console.log('   Role:', meResponse.data.user.role);

    // Step 3: Test token refresh
    console.log('\n3️⃣ Testing token refresh...');
    const refreshResponse = await client.post('/auth/refresh');

    console.log('✅ Token refresh successful!');
    console.log('   Message:', refreshResponse.data.message);

    // Step 4: Test logout
    console.log('\n4️⃣ Testing logout...');
    const logoutResponse = await client.post('/auth/logout');

    console.log('✅ Logout successful!');
    console.log('   Message:', logoutResponse.data.message);

    // Step 5: Verify logout (should fail)
    console.log('\n5️⃣ Verifying logout (should fail)...');
    try {
      await client.get('/auth/me');
      console.log('❌ ERROR: Should have failed after logout!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected after logout!');
        console.log('   Status:', error.response.status);
        console.log('   Message:', error.response.data.detail);
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All authentication tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testAuthFlow();