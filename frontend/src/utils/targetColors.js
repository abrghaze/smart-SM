/**
 * Utility functions for determining target colors based on deadline and progress
 */

export const getTargetColor = (deadline, progress, status) => {
  if (!deadline) return 'default';
  
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const timeDiff = deadlineDate.getTime() - today.getTime();
  const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  // If deadline has passed and not completed - RED
  if (daysUntilDeadline < 0 && status !== 'completed') {
    return 'red';
  }
  
  // If deadline is approaching (within 3 days) and progress is low - ORANGE
  if (daysUntilDeadline >= 0 && daysUntilDeadline <= 3 && progress < 80) {
    return 'orange';
  }
  
  // If more than 80% of deadline has passed but progress is below 80% - ORANGE
  if (daysUntilDeadline >= 0) {
    // Calculate deadline progress (this would need to be passed from backend)
    // For now, we'll use a simple heuristic
    if (progress < 50 && daysUntilDeadline <= 7) {
      return 'orange';
    }
  }
  
  return 'default';
};

export const getTargetColorClasses = (color) => {
  switch (color) {
    case 'red':
      return {
        background: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        badge: 'bg-red-100 text-red-800'
      };
    case 'orange':
      return {
        background: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        badge: 'bg-orange-100 text-orange-800'
      };
    default:
      return {
        background: 'bg-white',
        border: 'border-gray-200',
        text: 'text-gray-800',
        badge: 'bg-gray-100 text-gray-800'
      };
  }
};

export const getTargetStatusText = (deadline, progress, status) => {
  if (!deadline) return '';
  
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const timeDiff = deadlineDate.getTime() - today.getTime();
  const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  if (daysUntilDeadline < 0 && status !== 'completed') {
    return 'En retard';
  }
  
  if (daysUntilDeadline >= 0 && daysUntilDeadline <= 3 && progress < 80) {
    return 'Délai critique';
  }
  
  if (progress < 50 && daysUntilDeadline <= 7) {
    return 'Progression lente';
  }
  
  return '';
};

