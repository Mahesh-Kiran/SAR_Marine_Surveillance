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
  const files = fs.readdirSync(dirPath);

    // Filter .dzi files
    const dziFiles = files.filter(file => file.endsWith('.dzi'));

    // Map to full path (or relative path if needed)
    const dziList = dziFiles.map(file => {
      const name = path.basename(file, '.dzi');
      return {
        dziFile: file,
        dziPath: path.join(dirPath, file),
        filesFolder: path.join(dirPath, `${name}_files`)
      };
    });

    res.json({ count: dziList.length, items: dziList });
}