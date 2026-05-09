import React, { useState } from 'react';
import { Upload, FileImage, ExternalLink, X, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const imageTypes = ['ship', 'oilspill'];
const BASE_URL = 'http://localhost:3000';

const ImageProcessingPage = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedType, setSelectedType] = useState('ship');
  const [listedImages, setListedImages] = useState([]);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [processing, setProcessing] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setListedImages([]);
    setStatus({ message: '', type: '' });
  };

  // Remove file from selection
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload TIFFs to backend
  const uploadToBackend = async () => {
    if (!selectedFiles.length) {
      setStatus({ message: 'Please select TIFF file(s) first.', type: 'error' });
      return;
    }

    setProcessing(true);
    setStatus({ message: 'Uploading to backend...', type: 'loading' });

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch(`${BASE_URL}/api/images/upload/${selectedType}`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
        await res.json();
      }

      setStatus({ message: `Successfully uploaded ${selectedFiles.length} file(s)!`, type: 'success' });
      setSelectedFiles([]);
    } catch (err) {
      console.error(err);
      setStatus({ message: 'Error uploading some files.', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  // List uploaded images by type
  const fetchUploads = async () => {
    setProcessing(true);
    setStatus({ message: 'Fetching uploaded images...', type: 'loading' });

    try {
      const res = await fetch(`${BASE_URL}/api/images/uploads/${selectedType}`);
      if (!res.ok) throw new Error('Failed to list uploads');
      const data = await res.json();

      const imagesWithFullUrls = (data.images || []).map((img) => ({
        ...img,
        fullUrl: `${BASE_URL}${img.uploadUrl}`,
      }));

      setListedImages(imagesWithFullUrls);
      setStatus({ message: `Loaded ${imagesWithFullUrls.length} image(s).`, type: 'success' });
    } catch (err) {
      console.error(err);
      setStatus({ message: 'Error loading uploads.', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  // Generate DZI for an image
  const generateDZI = async (type, imageId) => {
    setProcessing(true);
    setStatus({ message: `Generating DZI for ${imageId}...`, type: 'loading' });

    try {
      const res = await fetch(`${BASE_URL}/api/dzi/generate/${type}/${imageId}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to generate DZI');

      const dziUrl = data.dzi_url ? `${BASE_URL}${data.dzi_url}` : 'DZI URL not provided';
      setStatus({ message: `DZI generated: ${dziUrl}`, type: 'success' });
    } catch (err) {
      console.error(err);
      setStatus({ message: `Error generating DZI for ${imageId}`, type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setListedImages([]);
    setStatus({ message: '', type: '' });
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">SAR Image Processing</CardTitle>
            <CardDescription className="text-base">
              Upload TIFF satellite images for ship or oil spill detection analysis
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Main Form */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Detection Type Selection */}
            <div className="space-y-3">
              <Label htmlFor="type-select" className="text-sm font-semibold">
                Select Detection Type
              </Label>
              <Select value={selectedType} onValueChange={setSelectedType} disabled={processing}>
                <SelectTrigger id="type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ship">Ship Detection</SelectItem>
                  <SelectItem value="oilspill">Oil Spill Detection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload Zone */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Upload TIFF Images</Label>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept=".tif,.tiff"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  disabled={processing}
                />
                <label
                  htmlFor="file-upload"
                  className={`flex flex-col items-center justify-center w-full px-8 py-12 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    processing
                      ? 'border-muted bg-muted/50 cursor-not-allowed'
                      : 'border-border hover:border-primary hover:bg-accent'
                  }`}
                >
                  <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    TIFF files only • Multiple files supported
                  </p>
                </label>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {selectedFiles.length} file(s) selected
                  </p>
                  <div className="space-y-2">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileImage className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(idx)}
                          disabled={processing}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={uploadToBackend}
                disabled={selectedFiles.length === 0 || processing}
                className="gap-2"
              >
                {processing && status.type === 'loading' && status.message.includes('Uploading') ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload to Backend
                  </>
                )}
              </Button>

              <Button onClick={fetchUploads} disabled={processing} variant="secondary" className="gap-2">
                {processing && status.type === 'loading' && status.message.includes('Fetching') ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Get Uploads
                  </>
                )}
              </Button>

              <Button onClick={resetForm} disabled={processing} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Message */}
        {status.message && (
          <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
            {status.type === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        {/* Uploaded Images List */}
        {listedImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                Uploaded Images ({selectedType})
              </CardTitle>
              <CardDescription>
                {listedImages.length} image(s) available for processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {listedImages.map((img) => (
                  <Card key={img.imageId}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="font-medium">{img.filename}</p>
                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant="outline" className="text-xs">
                              ID: {img.imageId}
                            </Badge>
                            <a
                              href={img.fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline truncate max-w-xs"
                            >
                              View File
                            </a>
                          </div>
                        </div>
                        <Button
                          onClick={() => generateDZI(selectedType, img.imageId)}
                          disabled={processing}
                          size="sm"
                          className="gap-2 shrink-0"
                        >
                          {processing && status.message.includes(img.imageId) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Generate DZI'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ImageProcessingPage;
