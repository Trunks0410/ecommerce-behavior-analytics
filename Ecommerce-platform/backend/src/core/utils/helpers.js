export const generateTrackingNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `UTE-${timestamp}-${randomChars}`;
};
