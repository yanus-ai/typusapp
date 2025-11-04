// Deprecated: Nano Banana service removed — use Replicate client to call google/nano-banana
// This file is kept as a placeholder to avoid runtime require errors during transition.

module.exports = {
  generateImage: async () => {
    throw new Error('Nano Banana service removed. Use Replicate client instead.');
  },
  checkJobStatus: async () => {
    throw new Error('Nano Banana service removed. Use Replicate client instead.');
  }
};