const axios = require('axios');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test data
const testImageUrl = 'https://storage.googleapis.com/yanus-fee5e.appspot.com/replicate_images/14203791-5d6b-4352-94ff-fcdb1eb25603.jpg';
const testInputImageId = 3; // Adjust this to an existing input image ID
const testCallbackUrl = `${BASE_URL}/api/masks/callback`;

class MaskEndpointTester {
  constructor() {
    this.results = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔍';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async test(name, testFunction) {
    this.log(`Testing: ${name}`);
    try {
      const result = await testFunction();
      this.log(`✅ ${name}: PASSED`, 'success');
      this.results.push({ name, status: 'PASSED', result });
      return result;
    } catch (error) {
      this.log(`❌ ${name}: FAILED - ${error.message}`, 'error');
      this.results.push({ name, status: 'FAILED', error: error.message });
      throw error;
    }
  }

  // Test 1: Generate Masks
  async testGenerateMasks() {
    return await this.test('Generate Masks', async () => {
      const response = await axios.post(`${API_BASE}/masks/generate`, {
        imageUrl: testImageUrl,
        inputImageId: testInputImageId,
        callbackUrl: testCallbackUrl
      });

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (!response.data.success) {
        throw new Error('Response indicates failure');
      }

      this.log(`Generated masks for image ${testInputImageId}`);
      return response.data;
    });
  }

  // Test 2: Get Masks (should show processing status)
  async testGetMasksProcessing() {
    return await this.test('Get Masks (Processing)', async () => {
      const response = await axios.get(`${API_BASE}/masks/${testInputImageId}`);

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      const { maskStatus } = response.data.data;
      if (!['processing', 'completed'].includes(maskStatus)) {
        throw new Error(`Expected processing or completed status, got ${maskStatus}`);
      }

      this.log(`Mask status: ${maskStatus}`);
      return response.data;
    });
  }

  // Test 3: Simulate FastAPI Callback
  async testMaskCallback() {
    return await this.test('Mask Callback Simulation', async () => {
      const mockCallbackData = {
        uuids: [
          {
            mask1: {
              mask_url: "https://storage.googleapis.com/yanus-fee5e.appspot.com/color_converter_images/test-mask-1.png",
              color: "rgb(2, 13, 17)"
            }
          },
          {
            mask2: {
              mask_url: "https://storage.googleapis.com/yanus-fee5e.appspot.com/color_converter_images/test-mask-2.png",
              color: "rgb(248, 230, 204)"
            }
          },
          {
            mask3: {
              mask_url: "https://storage.googleapis.com/yanus-fee5e.appspot.com/color_converter_images/test-mask-3.png",
              color: "rgb(128, 119, 107)"
            }
          }
        ],
        revert_extra: testInputImageId.toString()
      };

      const response = await axios.post(`${API_BASE}/masks/callback`, mockCallbackData);

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (!response.data.success) {
        throw new Error('Callback processing failed');
      }

      this.log(`Callback processed: ${response.data.data.regionsCreated} regions created`);
      return response.data;
    });
  }

  // Test 4: Get Masks (should show completed with regions)
  async testGetMasksCompleted() {
    return await this.test('Get Masks (Completed)', async () => {
      const response = await axios.get(`${API_BASE}/masks/${testInputImageId}`);

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      const { maskStatus, maskRegions } = response.data.data;
      
      if (maskStatus !== 'completed') {
        throw new Error(`Expected completed status, got ${maskStatus}`);
      }

      if (!Array.isArray(maskRegions) || maskRegions.length === 0) {
        throw new Error('No mask regions found');
      }

      this.log(`Found ${maskRegions.length} mask regions`);
      return response.data;
    });
  }

  // Test 5: Update Mask Style with Material Option
  async testUpdateMaskStyleMaterial(maskId) {
    return await this.test('Update Mask Style (Material)', async () => {
      // Find a material option to use
      const materialsResponse = await axios.get(`${API_BASE}/materials/categories`);
      const woodCategory = materialsResponse.data.data.find(cat => cat.slug === 'wood');
      
      if (!woodCategory || !woodCategory.materials || woodCategory.materials.length === 0) {
        throw new Error('No wood materials found for testing');
      }

      const testMaterialId = woodCategory.materials[0].id;

      const response = await axios.put(`${API_BASE}/masks/${maskId}/style`, {
        materialOptionId: testMaterialId
      });

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (!response.data.success) {
        throw new Error('Style update failed');
      }

      this.log(`Updated mask ${maskId} with material ${testMaterialId}`);
      return response.data;
    });
  }

  // Test 6: Update Mask Style with Customization Option
  async testUpdateMaskStyleCustomization(maskId) {
    return await this.test('Update Mask Style (Customization)', async () => {
      // Find a customization option to use
      const customizationsResponse = await axios.get(`${API_BASE}/customizations/categories`);
      const typeCategory = customizationsResponse.data.data.find(cat => cat.slug === 'type');
      
      if (!typeCategory || !typeCategory.subCategories || typeCategory.subCategories.length === 0) {
        throw new Error('No type customizations found for testing');
      }

      const firstSubCategory = typeCategory.subCategories[0];
      if (!firstSubCategory.options || firstSubCategory.options.length === 0) {
        throw new Error('No type options found for testing');
      }

      const testCustomizationId = firstSubCategory.options[0].id;

      const response = await axios.put(`${API_BASE}/masks/${maskId}/style`, {
        customizationOptionId: testCustomizationId
      });

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (!response.data.success) {
        throw new Error('Style update failed');
      }

      this.log(`Updated mask ${maskId} with customization ${testCustomizationId}`);
      return response.data;
    });
  }

  // Test 7: Clear Mask Style
  async testClearMaskStyle(maskId) {
    return await this.test('Clear Mask Style', async () => {
      const response = await axios.delete(`${API_BASE}/masks/${maskId}/style`);

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      if (!response.data.success) {
        throw new Error('Style clear failed');
      }

      this.log(`Cleared style for mask ${maskId}`);
      return response.data;
    });
  }

  // Test 8: Error Handling Tests
  async testErrorHandling() {
    return await this.test('Error Handling', async () => {
      const errors = [];

      try {
        // Test invalid input image ID
        await axios.post(`${API_BASE}/masks/generate`, {
          imageUrl: testImageUrl,
          inputImageId: 'invalid'
        });
        errors.push('Should have failed with invalid inputImageId');
      } catch (error) {
        if (error.response?.status !== 400) {
          errors.push(`Expected 400 for invalid inputImageId, got ${error.response?.status}`);
        }
      }

      try {
        // Test missing required fields
        await axios.post(`${API_BASE}/masks/generate`, {});
        errors.push('Should have failed with missing fields');
      } catch (error) {
        if (error.response?.status !== 400) {
          errors.push(`Expected 400 for missing fields, got ${error.response?.status}`);
        }
      }

      try {
        // Test non-existent mask ID
        await axios.put(`${API_BASE}/masks/non-existent-id/style`, {
          materialOptionId: 1
        });
        errors.push('Should have failed with non-existent mask ID');
      } catch (error) {
        if (error.response?.status !== 404) {
          errors.push(`Expected 404 for non-existent mask, got ${error.response?.status}`);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Error handling issues: ${errors.join(', ')}`);
      }

      this.log('All error handling tests passed');
      return { passed: true };
    });
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting Mask API Endpoint Tests');
    this.log('==========================================');

    try {
      // Test sequence
      await this.testGenerateMasks();
      await this.testGetMasksProcessing();
      await this.testMaskCallback();
      
      const masksData = await this.testGetMasksCompleted();
      const firstMaskId = masksData.data.maskRegions[0]?.id;
      
      if (firstMaskId) {
        await this.testUpdateMaskStyleMaterial(firstMaskId);
        await this.testUpdateMaskStyleCustomization(firstMaskId);
        await this.testClearMaskStyle(firstMaskId);
      } else {
        this.log('⚠️  No mask regions found, skipping style tests');
      }

      await this.testErrorHandling();

    } catch (error) {
      this.log(`Test sequence failed: ${error.message}`, 'error');
    }

    // Print summary
    this.printSummary();
  }

  printSummary() {
    this.log('==========================================');
    this.log('🏁 Test Summary');
    this.log('==========================================');

    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;

    this.results.forEach(result => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      this.log(`${status} ${result.name}: ${result.status}`);
    });

    this.log('==========================================');
    this.log(`📊 Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      this.log('🎉 All tests passed!', 'success');
    } else {
      this.log(`⚠️  ${failed} test(s) failed`, 'error');
    }
  }
}

// Run the tests
async function runTests() {
  const tester = new MaskEndpointTester();
  await tester.runAllTests();
}

// Check if running directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { MaskEndpointTester };