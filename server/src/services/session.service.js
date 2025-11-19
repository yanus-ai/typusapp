const { prisma } = require('./prisma.service');
const OpenAI = require('openai');
const { OPENAI_API_KEY } = require('../config/constants');

// Initialize OpenAI client for direct API calls
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

/**
 * Generate session name from prompt using OpenAI
 */
const generateSessionName = async (prompt) => {
  try {
    if (!prompt || prompt.trim().length === 0) {
      return 'Untitled Session';
    }

    // Clean and truncate prompt if too long (OpenAI has token limits)
    const cleanedPrompt = prompt.trim();
    const truncatedPrompt = cleanedPrompt.length > 300 ? cleanedPrompt.substring(0, 300) + '...' : cleanedPrompt;

    // Use OpenAI directly with a custom system prompt for session naming
    const systemPrompt = `You are a helpful assistant that creates concise, descriptive session names for architectural visualization projects. 
Generate a short, catchy session name (2-4 words maximum) that captures the essence of the user's prompt.
The name should be:
- Professional and clear
- Easy to understand at a glance
- Focused on the main subject/style/theme
- No more than 4 words
- No quotes or special formatting
- Just return the name, nothing else`;

    const userPrompt = `Create a short session name for this architectural visualization prompt: "${truncatedPrompt}"

Respond with ONLY the session name (2-4 words), nothing else.`;

    // Call OpenAI directly with custom prompt for session naming
    const completionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 20, // Very short response needed
    });

    const completion = completionResponse.choices[0]?.message?.content || '';

    // Extract a clean name from the response
    // Remove quotes, periods, and extra whitespace
    let generatedName = completion
      .split('\n')[0]  // Take first line
      .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
      .replace(/\.$/, '')  // Remove trailing period
      .trim();
    
    // If the response contains "Session name:" or similar, extract just the name
    const nameMatch = generatedName.match(/(?:session name:?\s*)?(.+)/i);
    if (nameMatch && nameMatch[1]) {
      generatedName = nameMatch[1].trim();
    }
    
    // Limit to 50 characters and ensure it's not empty
    const finalName = generatedName.length > 50 
      ? generatedName.substring(0, 47).trim() + '...' 
      : generatedName;

    // Validate: if the name is too short or seems invalid, use fallback
    if (!finalName || finalName.length < 2) {
      throw new Error('Generated name too short');
    }

    return finalName || 'Untitled Session';
  } catch (error) {
    console.error('❌ Failed to generate session name:', error);
    // Fallback: create a better name from prompt
    const words = prompt.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length > 0) {
      // Take first 3-4 meaningful words, capitalize first letter of each
      const fallbackWords = words.slice(0, 4).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      );
      return fallbackWords.join(' ') || 'Untitled Session';
    }
    return 'Untitled Session';
  }
};

/**
 * Create a new session
 */
const createSession = async (userId, prompt = null) => {
  try {
    let sessionName = null;
    
    // Generate session name from prompt if provided
    if (prompt) {
      sessionName = await generateSessionName(prompt);
    }

    const session = await prisma.session.create({
      data: {
        userId,
        name: sessionName
      }
    });

    console.log('✅ Session created:', { sessionId: session.id, name: sessionName });
    return session;
  } catch (error) {
    console.error('❌ Failed to create session:', error);
    throw error;
  }
};

/**
 * Get session by ID
 */
const getSessionById = async (sessionId, userId) => {
  try {
    const session = await prisma.session.findFirst({
      where: {
        id: parseInt(sessionId),
        userId // Ensure user owns the session
      },
      include: {
        batches: {
          include: {
            variations: {
              orderBy: {
                variationNumber: 'asc'
              }
            },
            createSettings: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    return session;
  } catch (error) {
    console.error('❌ Failed to get session:', error);
    throw error;
  }
};

/**
 * Get all sessions for a user
 */
const getUserSessions = async (userId, limit = 50) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId
      },
      include: {
        batches: {
          include: {
            variations: {
              where: {
                status: 'COMPLETED'
              },
              take: 1,
              orderBy: {
                createdAt: 'asc' // Get first variation for thumbnail
              }
            }
          },
          orderBy: {
            createdAt: 'asc' // Get first batch for thumbnail
          },
          take: 1 // Get first batch for thumbnail
        },
        _count: {
          select: {
            batches: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: limit
    });

    return sessions;
  } catch (error) {
    console.error('❌ Failed to get user sessions:', error);
    throw error;
  }
};

/**
 * Update session name
 */
const updateSessionName = async (sessionId, userId, newName) => {
  try {
    const session = await prisma.session.updateMany({
      where: {
        id: parseInt(sessionId),
        userId // Ensure user owns the session
      },
      data: {
        name: newName,
        updatedAt: new Date()
      }
    });

    return session.count > 0;
  } catch (error) {
    console.error('❌ Failed to update session name:', error);
    throw error;
  }
};

/**
 * Delete session (soft delete by setting batches to null, or hard delete)
 */
const deleteSession = async (sessionId, userId) => {
  try {
    // First, unlink all batches from the session
    await prisma.generationBatch.updateMany({
      where: {
        sessionId: parseInt(sessionId),
        userId
      },
      data: {
        sessionId: null
      }
    });

    // Then delete the session
    const result = await prisma.session.deleteMany({
      where: {
        id: parseInt(sessionId),
        userId
      }
    });

    return result.count > 0;
  } catch (error) {
    console.error('❌ Failed to delete session:', error);
    throw error;
  }
};

/**
 * Auto-group existing batches into sessions
 * Groups batches created within 1 hour of each other into the same session
 */
const migrateExistingBatchesToSessions = async (userId = null) => {
  try {
    console.log('🔄 Starting batch migration to sessions...');
    
    const whereClause = userId ? { userId, sessionId: null } : { sessionId: null };
    
    // Get all batches without sessions, ordered by creation time
    const batches = await prisma.generationBatch.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        variations: {
          take: 1,
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (batches.length === 0) {
      console.log('✅ No batches to migrate');
      return { sessionsCreated: 0, batchesMigrated: 0 };
    }

    let sessionsCreated = 0;
    let batchesMigrated = 0;
    let currentSession = null;
    let lastBatchTime = null;
    const ONE_HOUR_MS = 60 * 60 * 1000;

    for (const batch of batches) {
      const batchTime = new Date(batch.createdAt).getTime();
      
      // Create new session if:
      // 1. No current session
      // 2. More than 1 hour passed since last batch
      if (!currentSession || (lastBatchTime && (batchTime - lastBatchTime) > ONE_HOUR_MS)) {
        // Generate session name from first batch's prompt
        const sessionName = batch.prompt 
          ? await generateSessionName(batch.prompt)
          : 'Legacy Session';

        currentSession = await prisma.session.create({
          data: {
            userId: batch.userId,
            name: sessionName
          }
        });
        sessionsCreated++;
        console.log(`📦 Created session ${currentSession.id} for user ${batch.userId}`);
      }

      // Link batch to current session
      await prisma.generationBatch.update({
        where: { id: batch.id },
        data: { sessionId: currentSession.id }
      });
      batchesMigrated++;
      lastBatchTime = batchTime;
    }

    console.log(`✅ Migration complete: ${sessionsCreated} sessions created, ${batchesMigrated} batches migrated`);
    return { sessionsCreated, batchesMigrated };
  } catch (error) {
    console.error('❌ Failed to migrate batches:', error);
    throw error;
  }
};

module.exports = {
  createSession,
  getSessionById,
  getUserSessions,
  updateSessionName,
  deleteSession,
  migrateExistingBatchesToSessions,
  generateSessionName
};

