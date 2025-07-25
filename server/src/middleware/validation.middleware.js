const validateRunPodGeneration = (req, res, next) => {
  const { prompt, inputImageId, variations = 1 } = req.body;
  const errors = [];

  // Validate inputImageId
  if (!inputImageId) {
    errors.push('Input image ID is required');
  }

  if (inputImageId && (!Number.isInteger(parseInt(inputImageId)) || parseInt(inputImageId) <= 0)) {
    errors.push('Input image ID must be a positive integer');
  }

  // Validate variations
  if (variations && (!Number.isInteger(variations) || variations < 1 || variations > 4)) {
    errors.push('Variations must be an integer between 1 and 4');
  }
  
  // Validate settings if provided
  if (req.body.settings && typeof req.body.settings !== 'object') {
    errors.push('Settings must be an object');
  }

  if (req.body.settings) {
    const settings = req.body.settings;
    
    // Validate numeric settings
    const numericSettings = [
      'stepsKsampler1', 'cfgKsampler1', 'denoiseKsampler1',
      'stepsKsampler2', 'cfgKsampler2', 'denoiseKsampler2',
      'cannyStrength', 'cannyStart', 'cannyEnd',
      'depthStrength', 'depthStart', 'depthEnd'
    ];

    numericSettings.forEach(setting => {
      if (settings[setting] !== undefined) {
        const value = parseFloat(settings[setting]);
        if (isNaN(value) || value < 0) {
          errors.push(`${setting} must be a non-negative number`);
        }
      }
    });

    // Validate arrays
    if (settings.loraNames && !Array.isArray(settings.loraNames)) {
      errors.push('loraNames must be an array');
    }

    if (settings.loraStrength && !Array.isArray(settings.loraStrength)) {
      errors.push('loraStrength must be an array');
    }

    if (settings.loraClip && !Array.isArray(settings.loraClip)) {
      errors.push('loraClip must be an array');
    }

    // Validate string settings
    if (settings.model && typeof settings.model !== 'string') {
      errors.push('model must be a string');
    }

    if (settings.seed && typeof settings.seed !== 'string') {
      errors.push('seed must be a string');
    }

    if (settings.upscale && !['Yes', 'No'].includes(settings.upscale)) {
      errors.push('upscale must be "Yes" or "No"');
    }

    if (settings.style && !['Yes', 'No'].includes(settings.style)) {
      errors.push('style must be "Yes" or "No"');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation errors',
      errors
    });
  }

  next();
};

const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  const errors = [];

  if (page) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    }
  }

  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be an integer between 1 and 100');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation errors',
      errors
    });
  }

  // Set defaults
  req.query.page = parseInt(page) || 1;
  req.query.limit = parseInt(limit) || 10;

  next();
};

module.exports = {
  validateRunPodGeneration,
  validatePagination
};