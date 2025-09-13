// Utility function to construct full profile picture URLs
export const getProfilePictureUrl = (profilePictureUrl) => {
  if (!profilePictureUrl) {
    return null;
  }
  
  // If it's already a full URL, return as is
  if (profilePictureUrl.startsWith('http://') || profilePictureUrl.startsWith('https://')) {
    return profilePictureUrl;
  }
  
  // If it's a relative path, construct the full URL
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Remove leading slash if present to avoid double slashes
  const cleanPath = profilePictureUrl.startsWith('/') ? profilePictureUrl.slice(1) : profilePictureUrl;
  
  return `${baseUrl}/${cleanPath}`;
};

// Utility function to get initials for avatar fallback
export const getInitials = (firstName = '', lastName = '') => {
  const first = (firstName || '').trim().charAt(0).toUpperCase();
  const last = (lastName || '').trim().charAt(0).toUpperCase();
  return `${first}${last}` || 'U';
};
