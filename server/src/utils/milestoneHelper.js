const { prisma } = require('../services/prisma.service');
const { send10ImagesMilestoneEmail } = require('../services/email.service');

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

module.exports = {
  checkAndSend10ImageMilestone
};