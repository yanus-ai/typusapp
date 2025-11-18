// Helper functions for displaying real API status in tooltips

export function getDisplayStatus(runpodStatus?: string, fallbackStatus?: string): string {
  if (!runpodStatus) {
    return getGenericStatusText(fallbackStatus || 'PROCESSING');
  }

  // Map RunPod statuses to user-friendly text
  switch (runpodStatus.toUpperCase()) {
    // RunPod statuses
    case 'SUBMITTED':
      return 'Submitted...';
    case 'IN_QUEUE':
      return 'In queue...';
    case 'IN_PROGRESS':
      return 'Processing...';

    // Replicate statuses (both uppercase and lowercase)
    case 'STARTING':
    case 'starting':
      return 'Starting...';
    case 'PROCESSING':
    case 'processing':
      return 'Processing...';

    // Retry statuses - keep showing as processing to avoid confusing users
    case 'RETRY_1':
    case 'RETRY_2':
      return 'Processing...';
    case 'RETRY_FAILED':
      return 'Failed';

    // Final statuses
    case 'COMPLETED':
    case 'SUCCEEDED':
      return 'Complete';
    case 'FAILED':
      return 'Failed';
    case 'CANCELED':
    case 'CANCELLED':
      return 'Canceled';

    // Generic processing statuses
    default:
      if (runpodStatus.includes('RETRY')) {
        return 'Processing...';
      }
      return 'Processing...';
  }
}

function getGenericStatusText(status: string): string {
  switch (status) {
    case 'PROCESSING':
      return 'Generating...';
    case 'COMPLETED':
      return 'Complete';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Processing...';
  }
}
