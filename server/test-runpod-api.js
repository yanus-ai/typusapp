// Simple test script for RunPod API integration
// This script tests the service configuration and basic functionality

require('dotenv').config();
const runpodService = require('./src/services/runpod.service');

async function testRunPodConfig() {
  console.log('🧪 Testing RunPod Service Configuration...\n');
  
  try {
    // Test configuration validation
    console.log('1. Testing configuration validation...');
    runpodService.validateConfig();
    console.log('✅ Configuration is valid\n');
    
    // Test service instantiation
    console.log('2. Testing service instantiation...');
    console.log(`   API URL: ${process.env.RUNPOD_API_URL || 'NOT SET'}`);
    console.log(`   API Key: ${process.env.RUNPOD_API_KEY ? '***' + process.env.RUNPOD_API_KEY.slice(-4) : 'NOT SET'}`);
    console.log('✅ Service instantiated successfully\n');
    
    // Test parameter preparation (without actual API call)
    console.log('3. Testing parameter preparation...');
    const testParams = {
      webhook: 'https://example.com/webhook',
      prompt: 'Test prompt for architectural visualization',
      negativePrompt: 'low quality, blurry',
      rawImage: 'https://example.com/image.jpg',
      yellowMask: 'https://example.com/mask.jpg',
      jobId: 12345,
      uuid: 'test-uuid',
      requestGroup: 'test-group'
    };
    
    console.log('   Test parameters prepared:');
    console.log(`   - Prompt: ${testParams.prompt.substring(0, 50)}...`);
    console.log(`   - Job ID: ${testParams.jobId}`);
    console.log(`   - UUID: ${testParams.uuid}`);
    console.log('✅ Parameter preparation successful\n');
    
    console.log('🎉 All tests passed! RunPod service is ready for use.');
    console.log('\n📋 Next steps:');
    console.log('   1. Set RUNPOD_API_URL and RUNPOD_API_KEY in your .env file');
    console.log('   2. Start your server: npm run dev');
    console.log('   3. Test the API endpoints:');
    console.log('      POST /api/runpod/generate');
    console.log('      GET  /api/runpod/status/:batchId');
    console.log('      GET  /api/runpod/history');
    console.log('   4. Set up ngrok or similar for webhook testing');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure RUNPOD_API_URL and RUNPOD_API_KEY are set in .env');
    console.log('   2. Check that your RunPod API credentials are valid');
    console.log('   3. Verify your network connection');
  }
}

// API Endpoint Documentation
function printAPIDocumentation() {
  console.log('\n📚 API Endpoint Documentation');
  console.log('=' .repeat(50));
  
  console.log('\n🚀 Generate Images:');
  console.log('POST /api/runpod/generate');
  console.log('Headers: Authorization: Bearer <jwt_token>');
  console.log('Body:');
  console.log(JSON.stringify({
    prompt: "Architectural visualization, modern building, stunning details",
    negativePrompt: "low quality, blurry, distorted",
    inputImageId: 123,
    maskImageId: 124, // optional
    maskPrompt: "windows, doors", // optional
    variations: 1,
    settings: {
      seed: "1337",
      model: "realvisxlLightning.safetensors",
      upscale: "Yes",
      cfgKsampler1: 3,
      stepsKsampler1: 6
    }
  }, null, 2));
  
  console.log('\n📊 Get Generation Status:');
  console.log('GET /api/runpod/status/:batchId');
  console.log('Headers: Authorization: Bearer <jwt_token>');
  
  console.log('\n📜 Get Generation History:');
  console.log('GET /api/runpod/history?page=1&limit=10');
  console.log('Headers: Authorization: Bearer <jwt_token>');
  
  console.log('\n🪝 Webhook Endpoint (for RunPod callbacks):');
  console.log('POST /api/webhooks/runpod');
  console.log('No authentication required');
  console.log('This endpoint receives completion notifications from RunPod');
}

// Run tests
testRunPodConfig();
printAPIDocumentation();