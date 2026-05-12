// Convert MongoDB Buffer to base64 string for EJS templates
const bufferToBase64 = (buffer, contentType) => {
  if (!buffer) return null;
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
};

module.exports = { bufferToBase64 };