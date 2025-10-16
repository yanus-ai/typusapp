#!/usr/bin/env node

/**
 * Test script for FLUX Fill Pro expansion ratios
 * This script tests different outpaint modes to determine actual expansion ratios
 */

const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:3000'; // Adjust if your server runs on a different port
const TEST_IMAGE_URL = 'https://picsum.photos/512/768'; // Sample 512x768 image
const TEST_IMAGE_WIDTH = 512;
const TEST_IMAGE_HEIGHT = 768;

// You'll need to get a valid JWT token from your app
const JWT_TOKEN = process.env.JWT_TOKEN || '';

async function runExpansionRatioTest() {
  try {
    console.log('🧪 Starting FLUX Fill Pro Expansion Ratio Test');
    console.log('======================================');
    console.log(`Server: ${SERVER_URL}`);
    console.log(`Test Image: ${TEST_IMAGE_URL}`);
    console.log(`Dimensions: ${TEST_IMAGE_WIDTH}x${TEST_IMAGE_HEIGHT}`);
    console.log('');

    if (!JWT_TOKEN) {
      console.error('❌ JWT_TOKEN environment variable is required');
      console.log('Usage: JWT_TOKEN="your-jwt-token" node test-expansion-ratios.js');
      process.exit(1);
    }

    const response = await axios.post(`${SERVER_URL}/api/tweak/test-expansion-ratios`, {
      testImageUrl: TEST_IMAGE_URL,
      testImageWidth: TEST_IMAGE_WIDTH,
      testImageHeight: TEST_IMAGE_HEIGHT
    }, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minutes timeout
    });

    if (response.data.success) {
      console.log('✅ Test completed successfully!');
      console.log('');
      console.log('📊 RESULTS SUMMARY:');
      console.log('==================');

      const analysis = response.data.data.analysis;
      console.log(`Total Tests: ${analysis.totalTests}`);
      console.log(`Completed: ${analysis.completed}`);
      console.log(`Failed: ${analysis.failed}`);
      console.log(`Errors: ${analysis.errors}`);
      console.log(`Timeouts: ${analysis.timeouts}`);
      console.log('');

      console.log('📏 EXPANSION RATIOS:');
      console.log('===================');

      const results = response.data.data.testResults;
      results.forEach((result) => {
        if (result.status === 'completed' && result.expansionRatio) {
          console.log(`${result.mode}:`);
          console.log(`  Input: ${result.inputDimensions}`);
          console.log(`  Output: ${result.outputDimensions}`);
          console.log(`  Width Ratio: ${result.expansionRatio.width}x`);
          console.log(`  Height Ratio: ${result.expansionRatio.height}x`);
          console.log(`  Time: ${(result.completionTime / 1000).toFixed(1)}s`);
          console.log('');
        } else if (result.status === 'completed_no_dims') {
          console.log(`${result.mode}: ✅ Completed (dimensions unavailable)`);
          console.log(`  Output URL: ${result.outputUrl}`);
          console.log('');
        } else {
          console.log(`${result.mode}: ❌ ${result.status.toUpperCase()}`);
          if (result.error) {
            console.log(`  Error: ${result.error}`);
          }
          console.log('');
        }
      });

      // Generate summary table
      console.log('📋 QUICK REFERENCE TABLE:');
      console.log('========================');
      console.log('Mode                 | Width Ratio | Height Ratio');
      console.log('---------------------|-------------|-------------');

      results.forEach((result) => {
        if (result.status === 'completed' && result.expansionRatio) {
          const mode = result.mode.padEnd(20);
          const widthRatio = `${result.expansionRatio.width}x`.padEnd(11);
          const heightRatio = `${result.expansionRatio.height}x`;
          console.log(`${mode} | ${widthRatio} | ${heightRatio}`);
        }
      });

    } else {
      console.error('❌ Test failed:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run the test
runExpansionRatioTest();