const { Prisma } = require('@prisma/client');

// Middleware to handle Prisma-specific errors
const handlePrismaErrors = (err, req, res, next) => {
  // Handle Prisma-specific errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 is for unique constraint violations
    if (err.code === 'P2002') {
      const field = err.meta?.target;
      return res.status(409).json({
        message: `A record with this ${field} already exists.`,
        code: 'DUPLICATE_ENTRY'
      });
    }
    
    // P2025 is for record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        message: 'Record not found.',
        code: 'NOT_FOUND'
      });
    }
  }
  
  // For validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      message: 'Validation error in the provided data.',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Pass other errors to the next error handler
  next(err);
};

module.exports = handlePrismaErrors;