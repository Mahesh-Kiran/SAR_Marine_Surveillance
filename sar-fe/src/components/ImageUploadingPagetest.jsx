// import React, { useState } from 'react';

// const imageTypes = ['ship', 'oil'];

// const ImageProcessingPage = () => {
//   const [selectedFiles, setSelectedFiles] = useState([]);
//   const [uploadedLinks, setUploadedLinks] = useState([]);
//   const [selectedType, setSelectedType] = useState('ship');
//   const [processedImages, setProcessedImages] = useState([]);
//   const [status, setStatus] = useState('');

//   // 1. Handle file input
//   const handleFileChange = (e) => {
//     setSelectedFiles([...e.target.files]);
//     setUploadedLinks([]);
//     setProcessedImages([]);
//     setStatus('');
//   };

//   // 2. Upload images to Cloudinary
//   const uploadToCloudinary = async () => {
//     setStatus('Uploading images to Cloudinary...');
//     const urls = [];

//     for (const file of selectedFiles) {
//       const formData = new FormData();
//       formData.append('file', file);
//       formData.append('upload_preset', 'your_upload_preset'); // Replace with your preset

//       try {
//         const res = await fetch('https://api.cloudinary.com/v1_1/your_cloud_name/image/upload', {
//           method: 'POST',
//           body: formData,
//         });
//         const data = await res.json();
//         urls.push(data.secure_url);
//       } catch (error) {
//         setStatus('Error uploading images.');
//         console.error(error);
//         return;
//       }
//     }

//     setUploadedLinks(urls);
//     setStatus('Images uploaded successfully.');
//   };

//   // 3. Send links + type to backend for processing
//   const sendLinksToBackend = async () => {
//     if (!uploadedLinks.length) {
//       setStatus('Upload images first.');
//       return;
//     }
//     setStatus('Sending image links to backend for processing...');

//     try {
//       const res = await fetch('/api/process-images', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ images: uploadedLinks, type: selectedType }),
//       });
//       if (!res.ok) throw new Error('Backend error');
//       setStatus('Images sent for processing.');
//     } catch (error) {
//       setStatus('Error sending to backend.');
//       console.error(error);
//     }
//   };

//   // 4. Get processed images list from backend
//   const fetchProcessedImages = async () => {
//     setStatus('Fetching processed images...');
//     try {
//       const res = await fetch('/api/processed-images');
//       if (!res.ok) throw new Error('Backend error');
//       const data = await res.json();
//       setProcessedImages(data);
//       setStatus('Processed images loaded.');
//     } catch (error) {
//       setStatus('Error fetching processed images.');
//       console.error(error);
//     }
//   };

//   return (
//     <div className="max-w-xl mx-auto p-6 space-y-6 font-sans text-gray-900">
//       <h1 className="text-2xl font-bold mb-4">Image Processing Flow</h1>

//       {/* Step 1: Select images */}
//       <div>
//         <label className="block mb-2 font-semibold">Select JPG Images:</label>
//         <input 
//           type="file" 
//           multiple 
//           accept=".jpg,.jpeg" 
//           onChange={handleFileChange} 
//           className="border border-gray-300 rounded p-2 w-full"
//         />
//         <p className="mt-1 text-sm text-gray-600">
//           {selectedFiles.length} file(s) selected
//         </p>
//       </div>

//       {/* Step 2: Upload to Cloudinary */}
//       <button
//         disabled={selectedFiles.length === 0}
//         onClick={uploadToCloudinary}
//         className="bg-blue-600 disabled:bg-blue-300 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
//       >
//         Upload to Cloudinary
//       </button>

//       {/* Step 3: Select type and send to backend */}
//       <div className="flex items-center space-x-4">
//         <label className="font-semibold">Select Image Type:</label>
//         <select 
//           value={selectedType}
//           onChange={(e) => setSelectedType(e.target.value)}
//           className="border border-gray-300 rounded px-3 py-1"
//           disabled={uploadedLinks.length === 0}
//         >
//           {imageTypes.map(type => (
//             <option value={type} key={type}>{type}</option>
//           ))}
//         </select>
//       </div>

//       <button
//         disabled={uploadedLinks.length === 0}
//         onClick={sendLinksToBackend}
//         className="bg-green-600 disabled:bg-green-300 text-white py-2 px-4 rounded hover:bg-green-700 transition"
//       >
//         Send Links to Backend for Processing
//       </button>

//       {/* Step 4: Fetch processed images */}
//       <button
//         onClick={fetchProcessedImages}
//         className="bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-900 transition"
//       >
//         Get Processed Images List
//       </button>

//       {/* Status Display */}
//       {status && (
//         <p className="mt-2 text-sm font-medium text-indigo-700">{status}</p>
//       )}

//       {/* Processed images display */}
//       {processedImages.length > 0 && (
//         <div className="mt-6">
//           <h2 className="font-semibold mb-2">Processed Images:</h2>
//           <ul className="space-y-4 max-h-64 overflow-y-auto">
//             {processedImages.map((img, idx) => (
//               <li key={idx} className="flex items-center space-x-4 border border-gray-300 rounded p-2">
//                 <img src={img.url} alt={img.type} className="w-20 h-20 object-cover rounded" />
//                 <div>
//                   <p>Type: <strong>{img.type}</strong></p>
//                   <p>URL: <a href={img.url} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{img.url}</a></p>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ImageProcessingPage;


import React, { useState } from 'react';

const imageTypes = ['ship', 'oilspill'];
const BASE_URL = 'http://localhost:3000'; // ✅ your app's full base URL

const ImageProcessingPage = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedType, setSelectedType] = useState('ship');
  const [listedImages, setListedImages] = useState([]);
  const [status, setStatus] = useState('');

  // 1️⃣ Handle TIFF file selection
  const handleFileChange = (e) => {
    setSelectedFiles([...e.target.files]);
    setListedImages([]);
    setStatus('');
  };

  // 2️⃣ Upload TIFFs to backend
  const uploadToBackend = async () => {
    if (!selectedFiles.length) {
      setStatus('Please select TIFF file(s) first.');
      return;
    }

    setStatus('Uploading to backend...');
    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('image', file); // backend expects "image"

      try {
        const res = await fetch(`${BASE_URL}/api/images/upload/${selectedType}`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
        await res.json();
      } catch (err) {
        console.error(err);
        setStatus('Error uploading some files.');
        return;
      }
    }

    setStatus('Upload successful!');
  };

  // 3️⃣ List uploaded images by type
  const fetchUploads = async () => {
    setStatus('Fetching uploaded images...');
    try {
      const res = await fetch(`${BASE_URL}/api/images/uploads/${selectedType}`);
      if (!res.ok) throw new Error('Failed to list uploads');
      const data = await res.json();

      // ✅ Attach full absolute URLs
      const imagesWithFullUrls = (data.images || []).map((img) => ({
        ...img,
        fullUrl: `${BASE_URL}${img.uploadUrl}`,
      }));

      setListedImages(imagesWithFullUrls);
      setStatus('Uploads loaded.');
    } catch (err) {
      console.error(err);
      setStatus('Error loading uploads.');
    }
  };

  // 4️⃣ Generate DZI for an image
  const generateDZI = async (type, imageId) => {
    setStatus(`Generating DZI for ${imageId} (${type})...`);
    try {
      const res = await fetch(`${BASE_URL}/api/dzi/generate/${type}/${imageId}`, {
        method: 'POST',
      });
      const data = await res.json();
      console.log(data);
      if (!res.ok) throw new Error(data.error || 'Failed to generate DZI');

      const dziUrl = data.dzi_url
        ? `${BASE_URL}${data.dzi_url}`
        : 'DZI URL not provided';

      setStatus(`✅ DZI generated: ${dziUrl}`);
    } catch (err) {
      console.error(err);
      setStatus(`❌ Error generating DZI for ${imageId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 font-sans text-gray-900">
      <h1 className="text-2xl font-bold mb-4">
        TIFF Image Upload & DZI Generation
      </h1>

      {/* Step 1: File input */}
      <div>
        <label className="block mb-2 font-semibold">Select TIFF Images:</label>
        <input
          type="file"
          multiple
          accept=".tif,.tiff"
          onChange={handleFileChange}
          className="border border-gray-300 rounded p-2 w-full"
        />
        <p className="mt-1 text-sm text-gray-600">
          {selectedFiles.length} file(s) selected
        </p>
      </div>

      {/* Step 2: Select type */}
      <div className="flex items-center space-x-4">
        <label className="font-semibold">Select Image Type:</label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1"
        >
          {imageTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Step 3: Upload */}
      <button
        onClick={uploadToBackend}
        disabled={selectedFiles.length === 0}
        className="bg-blue-600 disabled:bg-blue-300 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
      >
        Upload to Backend
      </button>

      {/* Step 4: Fetch uploaded images */}
      <button
        onClick={fetchUploads}
        className="bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-900 transition"
      >
        Get Uploaded Images ({selectedType})
      </button>

      {/* Status */}
      {status && (
        <p className="mt-2 text-indigo-700 font-medium">{status}</p>
      )}

      {/* Uploaded images display */}
      {listedImages.length > 0 && (
        <div>
          <h2 className="font-semibold mt-4 mb-2">
            Uploaded Images ({selectedType}):
          </h2>
          <ul className="space-y-2">
            {listedImages.map((img) => (
              <li
                key={img.imageId}
                className="border rounded p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{img.filename}</p>
                  <p className="text-sm text-gray-600">ID: {img.imageId}</p>
                  <p className="text-sm text-gray-600 break-all">
                    URL:{' '}
                    <a
                      href={img.fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      {img.fullUrl}
                    </a>
                  </p>
                </div>

                <button
                  onClick={() => generateDZI(selectedType, img.imageId)}
                  className="mt-2 sm:mt-0 bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition"
                >
                  Generate DZI
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImageProcessingPage;
