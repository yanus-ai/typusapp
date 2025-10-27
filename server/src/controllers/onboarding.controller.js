const { prisma } = require("../services/prisma.service");


/**
 * Submit onboarding questionnaire data
 */
async function submitOnboardingData(req, res) {
  try {
    const userId = req.user.id;
    console.log(req.body)
    const {
      software,
      status,
      timeOnRenderings,
      moneySpentForOneImage,
      phoneNumber,
      streetAndNumber,
      city,
      postcode,
      state,
      country,
      companyName
    } = req.body;

    // Validate required fields
    if (!software || !status || !moneySpentForOneImage) {
      return res.status(400).json({
        success: false,
        message: 'Missing required onboarding data'
      });
    }

    // Check if user already has onboarding data
    const existingOnboarding = await prisma.onboarding.findUnique({
      where: { userId }
    });

    if (existingOnboarding) {
      return res.status(400).json({
        success: false,
        message: 'Onboarding already completed'
      });
    }

    // Create onboarding record
    const onboardingData = await prisma.onboarding.create({
      data: {
        userId,
        software,
        status,
        timeOnRenderings,
        moneySpentForOneImage,
        phoneNumber,
        streetAndNumber,
        city,
        postcode,
        state,
        country,
        companyName
      }
    });

    res.json({
      success: true,
      message: 'Onboarding data saved successfully',
      data: onboardingData
    });

  } catch (error) {
    console.error('Error submitting onboarding data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save onboarding data'
    });
  }
}

/**
 * Update existing onboarding data
 */
async function updateOnboardingData(req, res) {
  try {
    const userId = req.user.id;
    console.log('Updating onboarding data for user:', userId);
    console.log(req.body);
    
    const {
      software,
      status,
      timeOnRenderings,
      moneySpentForOneImage,
      phoneNumber,
      streetAndNumber,
      city,
      postcode,
      state,
      country,
      companyName
    } = req.body;

    // Validate required fields
    if (!software || !status || !moneySpentForOneImage) {
      return res.status(400).json({
        success: false,
        message: 'Missing required onboarding data'
      });
    }

    // Check if user has onboarding data
    const existingOnboarding = await prisma.onboarding.findUnique({
      where: { userId }
    });

    if (!existingOnboarding) {
      return res.status(404).json({
        success: false,
        message: 'No onboarding data found to update'
      });
    }

    // Update onboarding record
    const updatedOnboarding = await prisma.onboarding.update({
      where: { userId },
      data: {
        software,
        status,
        timeOnRenderings,
        moneySpentForOneImage,
        phoneNumber,
        streetAndNumber,
        city,
        postcode,
        state,
        country,
        companyName
      }
    });

    res.json({
      success: true,
      message: 'Onboarding data updated successfully',
      data: updatedOnboarding
    });

  } catch (error) {
    console.error('Error updating onboarding data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update onboarding data'
    });
  }
}

/**
 * Check if user has completed onboarding
 */
async function checkOnboardingStatus(req, res) {
  try {
    const userId = req.user.id;

    const onboarding = await prisma.onboarding.findUnique({
      where: { userId },
      select: {
        id: true,
        completedAt: true,
        software: true,
        status: true,
        timeOnRenderings: true,
        moneySpentForOneImage: true,
        phoneNumber: true,
        streetAndNumber: true,
        city: true,
        postcode: true,
        state: true,
        country: true,
        companyName: true
      }
    });

    res.json({
      success: true,
      hasCompleted: !!onboarding,
      data: onboarding
    });

  } catch (error) {
    console.error('Error checking onboarding status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check onboarding status'
    });
  }
}

module.exports = {
  submitOnboardingData,
  updateOnboardingData,
  checkOnboardingStatus
};

