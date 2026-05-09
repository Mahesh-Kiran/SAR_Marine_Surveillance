const path = require('path');
const fs = require('fs');
const axios = require('axios');

const uploadsDir = path.join(__dirname, '../../shared/uploads');
const dziBaseDir = path.join(__dirname, '../../shared/tiles');

const allowedTypes = ['ship', 'oilspill'];

// ✅ Helper: Check if DZI file exists
function dziExists(type, imageId) {
  const dziFile = path.join(dziBaseDir, type, `${imageId}.dzi`);
  return fs.existsSync(dziFile);
}

exports.generateDZI = async (req, res) => {
  const { type, imageId } = req.params;

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Must be "ship" or "oilspill".' });
  }

  try {
    // Optional: check if already exists
    if (dziExists(type, imageId)) {
      return res.status(200).json({
        message: 'DZI already exists',
        dziUrl: `/tiles/${type}/${imageId}.dzi`
      });
    }

    // 🔁 Call Python backend with type and imageId
    const response = await axios.post(`http://localhost:8000/api/generate_dzi/${type}/${imageId}`);

    return res.status(response.status).json(response.data);

  } catch (err) {
    console.error('DZI generation error:', err.message);
    return res.status(500).json({ error: 'Failed to generate DZI via Python service' });
  }
};

exports.listDZIs = (req, res) => {
  const { type } = req.params;
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Must be "ship" or "oilspill".' });
  }
  const typeDir = path.join(dziBaseDir, type);
  if (!fs.existsSync(typeDir)) {
    return res.status(200).json({ dziFiles: [] });
  }
  const dziFiles = fs.readdirSync(typeDir).filter(f => f.endsWith(".dzi")).map(f => ({
        label: f.replace(".dzi", ""),  // nice display name
        dzi: `/tiles/${type}/${f}`
      }));
  return res.status(200).json(dziFiles);
}