const fs = require('fs');
const path = require('path');

// For listing files
const uploadsDir = path.join(__dirname, '../../shared/uploads');

// Upload handler
exports.uploadImage = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { filename, originalname, mimetype, size, path: savedPath } = req.file;
  const { type } = req.params;

  const imageId = path.parse(filename).name;

  return res.status(201).json({
    message: 'Image uploaded successfully',
    type,
    file: {
      imageId,
      filename,
      originalname,
      mimetype,
      size,
      uploadPath: `/uploads/${type}/${filename}`
    }
  });
};

exports.listUploadsByType = (req, res) => {
  const { type } = req.params;
  const allowedTypes = ['ship', 'oilspill'];

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid image type. Use "ship" or "oilspill".' });
  }

  const dirPath = path.join(__dirname, `../../shared/uploads/${type}`);

  fs.readdir(dirPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to list uploads for type: ' + type });
    }

    const tiffFiles = files.filter(f => /\.(tif|tiff)$/i.test(f));

    const result = tiffFiles.map(filename => {
      const imageId = path.parse(filename).name;

      return {
        imageId,
        filename,
        type,
        uploadUrl: `/uploads/${type}/${filename}`
      };
    });

    res.json({ images: result });
  });
};

exports.listOilspillOutputsDzi = (req, res) => {
  const dirPath = path.join(__dirname, `../../shared/outputs/oilspill`);
  if (!fs.existsSync(dirPath)) {
    return res.json({ count: 0, items: [] });
  }

  const files = fs.readdirSync(dirPath);

  // The mask DZI is generated as {id}_files.dzi by the Python script
  const maskFiles = files.filter(file => file.endsWith('_files.dzi'));

  const dziList = maskFiles.map(file => {
    const name = path.basename(file, '.dzi');
    // Extract original imageId from "{id}_files"
    const imageId = name.replace('_files', '');
    
    // Check if the overlay has been generated yet
    const hasOverlay = files.includes(`${imageId}_overlay.dzi`);

    return {
      dziFile: file,
      dziPath: path.join(dirPath, file),
      filesFolder: path.join(dirPath, `${name}_files`),
      hasOverlay
    };
  });

  res.json({ count: dziList.length, items: dziList });
}