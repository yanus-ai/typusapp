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

const validateRefineGeneration = (req, res, next) => {
  const { 
    imageId, 
    imageUrl, 
    resolution, 
    scaleFactor, 
    aiStrength, 
    resemblance, 
    clarity, 
    sharpness, 
    matchColor,
    variations = 1 
  } = req.body;
  const errors = [];

  // Validate required fields
  if (!imageId) {
    errors.push('Image ID is required');
  }

  if (!imageUrl) {
    errors.push('Image URL is required');
  }

  // Validate imageId
  if (imageId && (!Number.isInteger(parseInt(imageId)) || parseInt(imageId) <= 0)) {
    errors.push('Image ID must be a positive integer');
  }

  // Validate imageUrl
  if (imageUrl && typeof imageUrl !== 'string') {
    errors.push('Image URL must be a string');
  }

  // Validate variations
  if (variations && (!Number.isInteger(variations) || variations < 1 || variations > 2)) {
    errors.push('Variations must be an integer between 1 and 2');
  }

  // Validate resolution
  if (resolution) {
    if (typeof resolution !== 'object' || resolution === null) {
      errors.push('Resolution must be an object');
    } else {
      if (!Number.isInteger(resolution.width) || resolution.width <= 0 || resolution.width > 4096) {
        errors.push('Resolution width must be a positive integer up to 4096');
      }
      if (!Number.isInteger(resolution.height) || resolution.height <= 0 || resolution.height > 4096) {
        errors.push('Resolution height must be a positive integer up to 4096');
      }
    }
  }

  // Validate scaleFactor
  if (scaleFactor !== undefined) {
    const scaleNum = parseFloat(scaleFactor);
    if (isNaN(scaleNum) || scaleNum < 1 || scaleNum > 3) {
      errors.push('Scale factor must be a number between 1 and 3');
    }
  }

  // Validate percentage parameters (0-100)
  const percentageParams = [
    { value: aiStrength, name: 'AI Strength' },
    { value: resemblance, name: 'Resemblance' },
    { value: clarity, name: 'Clarity' },
    { value: sharpness, name: 'Sharpness' }
  ];

  percentageParams.forEach(param => {
    if (param.value !== undefined) {
      const numValue = parseFloat(param.value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        errors.push(`${param.name} must be a number between 0 and 100`);
      }
    }
  });

  // Validate matchColor
  if (matchColor !== undefined && typeof matchColor !== 'boolean') {
    errors.push('Match color must be a boolean');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation errors',
      errors
    });
  }

  next();
};

module.exports = {
  validateRunPodGeneration,
  validatePagination,
  validateRefineGeneration
};