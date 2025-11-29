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

    // Add to ManyChat if phone number is provided and email is verified
    if (phoneNumber && req.user.emailVerified) {
      try {
        console.log(`📱 Adding user to ManyChat with phone: ${phoneNumber}`);
        
        // Get user language from database
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { language: true }
        });
        
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

        // Tag user as German if language is "de"
        if (user?.language === 'de' && manychatResult.subscriber?.id) {
          try {
            await manyChatService.addTagToSubscriber(manychatResult.subscriber.id, 'german');
            console.log(`🏷️ Tagged subscriber ${manychatResult.subscriber.id} as German`);
          } catch (tagError) {
            console.error('❌ Error adding German tag to ManyChat subscriber:', tagError.message);
            // Don't fail the process if tagging fails
          }
        }
      } catch (manychatError) {
        // Log error but don't fail the onboarding process
        console.error('❌ Error adding user to ManyChat:', manychatError.message);
        console.error('Onboarding will continue without ManyChat integration');
      }
    } else if (phoneNumber && !req.user.emailVerified) {
      console.log(`⚠️ Skipping ManyChat integration: Email not verified for user ${userId}`);
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

    // Add to ManyChat if phone number is provided, different from existing, and email is verified
    if (phoneNumber && phoneNumber !== existingOnboarding.phoneNumber && req.user.emailVerified) {
      try {
        console.log(`📱 Updating ManyChat subscriber with new phone: ${phoneNumber}`);
        
        // Get user language from database
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { language: true }
        });
        
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

        // Tag user as German if language is "de"
        if (user?.language === 'de' && manychatResult.subscriber?.id) {
          try {
            await manyChatService.addTagToSubscriber(manychatResult.subscriber.id, 'german');
            console.log(`🏷️ Tagged subscriber ${manychatResult.subscriber.id} as German`);
          } catch (tagError) {
            console.error('❌ Error adding German tag to ManyChat subscriber:', tagError.message);
            // Don't fail the process if tagging fails
          }
        }
      } catch (manychatError) {
        // Log error but don't fail the update process
        console.error('❌ Error updating ManyChat subscriber:', manychatError.message);
        console.error('Onboarding update will continue without ManyChat integration');
      }
    } else if (phoneNumber && phoneNumber !== existingOnboarding.phoneNumber && !req.user.emailVerified) {
      console.log(`⚠️ Skipping ManyChat integration: Email not verified for user ${userId}`);
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
    if (!prisma) {
      console.error('Prisma client is not initialized');
      return res.status(500).json({ success: false, message: 'Database connection error' });
    }

    // More defensive check for req.user
    if (!req.user) {
      console.error('checkOnboardingStatus: req.user is undefined');
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const userId = req.user.id;
    if (!userId || typeof userId !== 'number') {
      console.error('checkOnboardingStatus: Invalid userId', { userId, user: req.user });
      return res.status(401).json({ success: false, message: 'Invalid user ID' });
    }

    // Use try-catch for the Prisma query to get better error details
    let onboarding;
    try {
      onboarding = await prisma.onboarding.findUnique({
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
    } catch (prismaError) {
      console.error('Prisma error in checkOnboardingStatus:', {
        error: prismaError.message,
        code: prismaError.code,
        meta: prismaError.meta,
        userId
      });
      throw prismaError; // Re-throw to be caught by outer catch
    }

    res.json({
      success: true,
      hasCompleted: !!onboarding,
      data: onboarding || null
    });

  } catch (error) {
    console.error('Error checking onboarding status:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Failed to check onboarding status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = {
  submitOnboardingData,
  updateOnboardingData,
  checkOnboardingStatus
};

