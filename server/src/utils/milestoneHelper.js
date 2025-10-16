const { prisma } = require('../services/prisma.service');
const { send10ImagesMilestoneEmail, sendFirstImageMilestoneEmail } = require('../services/email.service');

/**
 * Check and send first image milestone email when a user completes their first image
 * @param {number} userId - The user ID
 * @param {string} userEmail - The user's email
 * @param {string} userFullName - The user's full name
 * @param {boolean} firstImageEmailSent - Whether the first image email was already sent
 */
async function checkAndSendFirstImageMilestone(userId, userEmail, userFullName, firstImageEmailSent) {
  // Skip if first image email already sent
  if (firstImageEmailSent) {
    return;
  }

  try {
    // Count completed images for this user
    const completedImagesCount = await prisma.image.count({
      where: {
        userId: userId,
        status: 'COMPLETED'
      }
    });

    console.log('Checking first image milestone:', {
      userId,
      completedImagesCount,
      firstImageEmailSent
    });

    // Send first image email if user has 1+ completed images and hasn't received the email yet
    if (completedImagesCount >= 1) {
      await sendFirstImageMilestoneEmail(userEmail, userFullName);

      // Mark first image email as sent
      await prisma.user.update({
        where: { id: userId },
        data: { firstImageEmailSent: true }
      });

      console.log('First image milestone email sent successfully:', {
        userId,
        email: userEmail,
        completedImagesCount
      });
    }
  } catch (milestoneError) {
    console.error('Error handling first image milestone:', {
      userId,
      error: milestoneError.message
    });
    // Don't throw error - milestone email failure shouldn't affect image processing
  }
}

/**
 * Check and send 10-image milestone email when a user completes an image
 * @param {number} userId - The user ID
 * @param {string} userEmail - The user's email
 * @param {string} userFullName - The user's full name
 * @param {boolean} milestone10imagessent - Whether the milestone email was already sent
 */
async function checkAndSend10ImageMilestone(userId, userEmail, userFullName, milestone10imagessent) {
  // Skip if milestone email already sent
  if (milestone10imagessent) {
    return;
  }

  try {
    // Count completed images for this user
    const completedImagesCount = await prisma.image.count({
      where: {
        userId: userId,
        status: 'COMPLETED'
      }
    });

    console.log('Checking 10-image milestone:', {
      userId,
      completedImagesCount,
      milestone10imagessent
    });

    // Send milestone email if user has 10+ completed images and hasn't received the email yet
    if (completedImagesCount >= 10) {
      await send10ImagesMilestoneEmail(userEmail, userFullName);

      // Mark milestone as sent
      await prisma.user.update({
        where: { id: userId },
        data: { milestone10imagessent: true }
      });

      console.log('10-image milestone email sent successfully:', {
        userId,
        email: userEmail,
        completedImagesCount
      });
    }
  } catch (milestoneError) {
    console.error('Error handling 10-image milestone:', {
      userId,
      error: milestoneError.message
    });
    // Don't throw error - milestone email failure shouldn't affect image processing
  }
}

/**
 * Check and send both milestone emails when a user completes an image
 * @param {number} userId - The user ID
 * @param {string} userEmail - The user's email
 * @param {string} userFullName - The user's full name
 * @param {boolean} firstImageEmailSent - Whether the first image email was already sent
 * @param {boolean} milestone10imagessent - Whether the 10-image milestone email was already sent
 */
async function checkAndSendImageMilestones(userId, userEmail, userFullName, firstImageEmailSent, milestone10imagessent) {
  // Check first image milestone
  await checkAndSendFirstImageMilestone(userId, userEmail, userFullName, firstImageEmailSent);

  // Check 10-image milestone
  await checkAndSend10ImageMilestone(userId, userEmail, userFullName, milestone10imagessent);
}

module.exports = {
  checkAndSendFirstImageMilestone,
  checkAndSend10ImageMilestone,
  checkAndSendImageMilestones
};