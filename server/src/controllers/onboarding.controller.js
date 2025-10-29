const { prisma } = require("../services/prisma.service");
const manyChatService = require("../services/manychat.service");


/**
 * Submit onboarding questionnaire data
 */
async function submitOnboardingData(req, res) {
  try {
    const userId = req.user.id;
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
      firstName,
      lastName,
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

    // Update user full name
    await prisma.user.update({
      where: { id: userId },
      data: { fullName: `${firstName || ''} ${lastName || ''}`.trim() }
    }).catch((error) => {
      console.error('Error updating user full name:', error);
    });

    // Add to ManyChat if phone number is provided
    if (phoneNumber) {
      try {
        console.log(`📱 Adding user to ManyChat with phone: ${phoneNumber}`);
        
        const manychatResult = await manyChatService.addSubscriberIfNotExists({
          phone: phoneNumber,
          firstName: firstName || '',
          lastName: lastName || '',
          email: req.user.email, // Get email from authenticated user
          customFields: {
            company_name: companyName || '',
            software: software || '',
            status: status || '',
            time_on_renderings: timeOnRenderings || '',
            money_spent_for_one_image: moneySpentForOneImage || '',
            street_and_number: streetAndNumber || '',
            city: city || '',
            postcode: postcode || '',
            state: state || '',
            country: country || '',
            user_id: userId.toString()
          }
        });

        if (manychatResult.isNew) {
          console.log(`✅ New subscriber added to ManyChat: ${manychatResult.subscriber.id}`);
        } else {
          console.log(`ℹ️ Subscriber already exists in ManyChat: ${manychatResult.subscriber.id}`);
        }
      } catch (manychatError) {
        // Log error but don't fail the onboarding process
        console.error('❌ Error adding user to ManyChat:', manychatError.message);
        console.error('Onboarding will continue without ManyChat integration');
      }
    }

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

    // Add to ManyChat if phone number is provided and different from existing
    if (phoneNumber && phoneNumber !== existingOnboarding.phoneNumber) {
      try {
        console.log(`📱 Updating ManyChat subscriber with new phone: ${phoneNumber}`);
        
        const manychatResult = await manyChatService.addSubscriberIfNotExists({
          phone: phoneNumber,
          firstName: req.user.fullName?.split(' ')[0] || '',
          lastName: req.user.fullName?.split(' ').slice(1).join(' ') || '',
          email: req.user.email,
          customFields: {
            company_name: companyName || '',
            software: software || '',
            status: status || '',
            time_on_renderings: timeOnRenderings || '',
            money_spent_for_one_image: moneySpentForOneImage || '',
            street_and_number: streetAndNumber || '',
            city: city || '',
            postcode: postcode || '',
            state: state || '',
            country: country || '',
            user_id: userId.toString()
          }
        });

        if (manychatResult.isNew) {
          console.log(`✅ New subscriber added to ManyChat: ${manychatResult.subscriber.id}`);
        } else {
          console.log(`ℹ️ Subscriber already exists in ManyChat: ${manychatResult.subscriber.id}`);
        }
      } catch (manychatError) {
        // Log error but don't fail the update process
        console.error('❌ Error updating ManyChat subscriber:', manychatError.message);
        console.error('Onboarding update will continue without ManyChat integration');
      }
    }

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

