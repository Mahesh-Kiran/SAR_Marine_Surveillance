import React, { useState, useCallback, useRef } from 'react';

const UploadDialog = ({ 
  isOpen, 
  onClose, 
  onUpload, 
  onImageSelect,
  uploading = false 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // File validation
  const validateFile = useCallback((file) => {
    const maxSize = 500 * 1024 * 1024; // 500MB
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 
      'image/tiff', 'image/webp', 'image/bmp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload JPEG, PNG, TIFF, WebP, or BMP images.';
    }

    if (file.size > maxSize) {
      return `File too large. Maximum size is 500MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`;
    }

    return null;
  }, []);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validation = validateFile(file);
      
      if (validation) {
        setError(validation);
        return;
      }

      setFiles([file]);
    }
  }, [validateFile]);

  // Handle file input change
  const handleFileChange = useCallback((e) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateFile(file);
      
      if (validation) {
        setError(validation);
        return;
      }

      setFiles([file]);
    }
  }, [validateFile]);

  // Handle upload
  const handleUpload = async () => {
    if (files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      // Create blob URL for immediate preview
      const blobUrl = URL.createObjectURL(file);
      const isLarge = file.size > 100 * 1024 * 1024; // 100MB threshold
      
      // Call the image select callback for immediate preview
      if (onImageSelect) {
        onImageSelect(blobUrl, isLarge);
      }

      // Call the upload callback
      if (onUpload) {
        await onUpload(formData, file);
      }

      // Reset and close
      setFiles([]);
      setUploadProgress(0);
      onClose();
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    }
  };

  // Remove file
  const removeFile = () => {
    setFiles([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-600/40 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-mono font-bold text-white uppercase tracking-wider">
                Upload SAR Image
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={uploading}
              className="text-gray-400 hover:text-white transition-colors text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-gray-400 font-mono text-sm mt-2">
            Upload satellite images for ship detection analysis
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-lg transition-all duration-300 ${
              dragActive 
                ? 'border-blue-400 bg-blue-400/10 scale-[1.02]' 
                : files.length > 0
                ? 'border-green-400 bg-green-400/5'
                : error
                ? 'border-red-400 bg-red-400/5'
                : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="p-12 text-center">
              {files.length > 0 ? (
                // File preview
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-green-400/20 rounded-full flex items-center justify-center mx-auto border-2 border-green-400/40">
                    <span className="text-green-400 text-3xl">📄</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-green-300 font-mono text-lg font-bold">
                      {files[0].name}
                    </p>
                    <p className="text-gray-400 font-mono text-sm">
                      {formatFileSize(files[0].size)} • {files[0].type}
                    </p>
                    <div className="flex items-center justify-center space-x-4 text-sm font-mono text-gray-400">
                      {files[0].size > 100 * 1024 * 1024 && (
                        <span className="text-yellow-400">⚡ Large file - Deep zoom will be enabled</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-red-400 hover:text-red-300 font-mono text-sm underline transition-colors"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                // Upload prompt
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-blue-400/20 rounded-full flex items-center justify-center mx-auto border-2 border-blue-400/40">
                    <span className="text-blue-400 text-3xl">📁</span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-white font-mono text-xl font-bold">
                      Drop SAR images here
                    </p>
                    <p className="text-gray-400 font-mono">
                      or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-400 hover:text-blue-300 underline font-semibold transition-colors"
                      >
                        browse files
                      </button>
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono text-gray-500 max-w-md mx-auto">
                    <div className="space-y-1">
                      <p className="text-gray-400">Supported formats:</p>
                      <p>JPEG, PNG, TIFF, WebP, BMP</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-400">Maximum size:</p>
                      <p>500MB per file</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept="image/jpeg,image/jpg,image/png,image/tiff,image/webp,image/bmp"
              className="hidden"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-red-400 text-xl">⚠</span>
                <p className="text-red-300 font-mono text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploading && uploadProgress > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-blue-300">Uploading...</span>
                <span className="text-blue-400 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* System requirements */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
            <h3 className="text-gray-300 font-mono text-sm font-bold mb-3 uppercase tracking-wide">
              System Requirements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono text-gray-400">
              <div className="space-y-1">
                <p>• High-resolution satellite imagery</p>
                <p>• SAR or optical sensor data</p>
                <p>• Maritime surveillance images</p>
              </div>
              <div className="space-y-1">
                <p>• Clear ship signatures</p>
                <p>• Minimal cloud coverage</p>
                <p>• Adequate image contrast</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700/50 bg-gray-800/20 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-sm font-mono text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Terminal Ready</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-6 py-3 font-mono font-semibold text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className={`px-8 py-3 font-mono font-bold uppercase tracking-wide rounded border-2 transition-all duration-300 ${
                files.length > 0 && !uploading
                  ? 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 border-blue-400 text-white hover:shadow-lg hover:shadow-blue-500/25'
                  : 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed'
              }`}
            >
              {uploading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>Uploading</span>
                </div>
              ) : (
                'Upload & Analyze'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadDialog;
