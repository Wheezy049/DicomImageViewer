import React, { useState, useRef } from "react";
import * as cornerstone from "cornerstone-core";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import * as dicomParser from "dicom-parser";
import { toast } from "react-toastify";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useScanContext } from "../context/ScanContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase-client";

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

cornerstoneWADOImageLoader.webWorkerManager.initialize({
  webWorkerPath:
    "https://unpkg.com/cornerstone-wado-image-loader@3.0.1/dist/cornerstoneWADOImageLoaderWebWorker.js",
  taskConfiguration: {
    decodeTask: {
      codecsPath:
        "https://unpkg.com/cornerstone-wado-image-loader@3.0.1/dist/cornerstoneWADOImageLoaderCodecs.js",
    },
  },
});


function PatientForm({ setIsPopup }) {
  const [isDragging, setIsDragging] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = 'https://api.epochzero.click'

  const {
    images,
    setImages,
    setDicomMetadata,
    formData,
    setFormData,
    setScanResult,
  } = useScanContext();

  const [disabledFields, setDisabledFields] = useState({
    name: false,
    age: false,
    clinical: false,
    date: false,
  });

  const divRef = useRef(null);
  const inputRef = useRef(null);

  const loadFiles = async (files) => {
    const loadedImages = [];
    const metadataList = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".dcm")) {
        toast.error(`Invalid file: ${file.name}`);
        continue;
      }

      try {
        const imageId =
          cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
        const image = await cornerstone.loadImage(imageId);
        loadedImages.push(image);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const byteArray = new Uint8Array(arrayBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);

          const metadata = {
            patientName: dataSet.string("x00100010") || "N/A",
            patientAge: dataSet.string("x00101010") || "N/A",
            studyDate: dataSet.string("x00080020") || "N/A",
            modality: dataSet.string("x00080060") || "N/A",
            fileName: file.name,
          };

          metadataList.push(metadata);

          setFormData((prev) => ({
            ...prev,
            name:
              metadata.patientName !== "N/A" ? metadata.patientName : prev.name,
            age: metadata.patientAge !== "N/A" ? metadata.patientAge : prev.age,
            clinical:
              metadata.modality !== "N/A" ? metadata.modality : prev.clinical,
            date: metadata.studyDate !== "N/A" ? metadata.studyDate : prev.date,
          }));

          setDisabledFields({
            name: metadata.patientName !== "N/A",
            age: metadata.patientAge !== "N/A",
            clinical: metadata.modality !== "N/A",
            date: metadata.studyDate !== "N/A",
          });
        } catch (parseError) {
          console.warn(
            `Metadata extraction failed for ${file.name}`,
            parseError
          );
        }
      } catch (error) {
        console.error("Image loading failed:", file.name, error);
        toast.error(`Failed to load ${file.name}`);
      }
    }

    if (loadedImages.length) {
      setImages(loadedImages);
      setDicomMetadata(metadataList);

      if (divRef.current) {
        cornerstone.enable(divRef.current);
        cornerstone.displayImage(divRef.current, loadedImages[0]);
        setIsImageLoaded(true);
      }
    }
  };

  const handleRemoveImage = () => {
    if (divRef.current) {
      cornerstone.disable(divRef.current);
      divRef.current.innerHTML = "";
    }

    inputRef.current.value = "";
    setIsImageLoaded(false);
    setShowImagePreview(false);
    setImages([]);
    setCurrentIndex(0);

    setDisabledFields({
      name: false,
      age: false,
      clinical: false,
      date: false,
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      loadFiles(files);
      setShowImagePreview(true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) {
      loadFiles(files);
      setShowImagePreview(true);
    }
  };

  const handleBrowseClick = () => {
    inputRef.current?.click();
  };

  const closeModal = () => {
    setIsPopup(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatDateString = (dateString) => {
    if (!dateString || dateString.length !== 8) return "";
    const year = dateString.slice(0, 4);
    const month = dateString.slice(4, 6);
    const day = dateString.slice(6, 8);
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const file = inputRef.current?.files?.[0];
    const user = supabase.auth.getUser(); // get current user session
    const userId = (await user)?.data?.user?.id;

    if (!file || !userId) {
      toast.error("Missing file or user.");
      setLoading(false);
      return;
    }

    toast.info(
      "Analyzing scan... This may take up to 6 minutes. Please wait.",
      {
        autoClose: false, // Don't auto-close this toast
        toastId: "scan-progress", // Unique ID to update/dismiss later
      }
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 360000);

    try {
      // Step 1: Upload file to Supabase Storage
      const uniqueName = `${Date.now()}-${file.name}`;
      const storagePath = `${userId}/${uniqueName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("user-scans")
        .upload(storagePath, file);

      if (uploadError) throw new Error("Upload failed", uploadError.message);

      // Step 2: Prepare and send form data to external API
      const formPayload = new FormData();
      formPayload.append("file", file);
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formPayload,
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_EPOCHZERO_TOKEN}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("API scan failed");
      const result = await response.json();

      // Step 3: Save metadata to Supabase table
      const { error: insertError } = await supabase
        .from("scan_records")
        .insert([
          {
            user_id: userId,
            file_path: storagePath,
            result: JSON.stringify(result), // Save result for later viewing
          },
        ]);

      if (insertError) throw new Error("Failed to save scan record");

      // Step 4: Update state and navigate
      setScanResult((prev) => [...prev, result]);
      toast.dismiss("scan-progress");
      toast.success("Scan analysis completed successfully!");
      navigate("/result");
    } catch (error) {
      clearTimeout(timeoutId);
      toast.dismiss("scan-progress");
      console.error("Scan submission error:", error.message);
      if (error.name === "AbortError") {
        toast.error(
          "Scan analysis timed out after 6 minutes. Please try again."
        );
      } else if (error.message.includes("Failed to fetch")) {
        toast.error(
          "Network error. Please check your connection and try again."
        );
      } else {
        toast.error("Scan failed: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-[600px] shadow-lg h-full max-h-[97vh] overflow-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold">Upload DICOM</h2>
          <X
            width={20}
            height={20}
            onClick={closeModal}
            className="cursor-pointer"
          />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={disabledFields.name}
              required
              className="w-full border rounded px-3 py-2 outline-none focus:ring focus:ring-blue-300 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm mb-1">
              Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              disabled={disabledFields.age}
              required
              className="w-full border rounded px-3 py-2 outline-none focus:ring focus:ring-blue-300 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm mb-1">
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              required
              className="w-full border rounded px-3 py-2 outline-none focus:ring focus:ring-blue-300"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label htmlFor="clinical" className="block text-sm mb-1">
              Clinical Symptoms
            </label>
            <input
              type="text"
              name="clinical"
              value={formData.clinical}
              onChange={handleInputChange}
              disabled={disabledFields.clinical}
              required
              className="w-full border rounded px-3 py-2 outline-none focus:ring focus:ring-blue-300"
            />
          </div>

          <div>
            <label htmlFor="clinical" className="block text-sm mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formatDateString(formData.date) || formData.date}
              onChange={handleInputChange}
              disabled={disabledFields.date}
              required
              className="w-full border rounded px-3 py-2 outline-none focus:ring focus:ring-blue-300"
            />
          </div>

          <input
            type="file"
            accept=".dcm"
            ref={inputRef}
            onChange={handleFileChange}
            className="hidden"
            required
            multiple
          />

          {!showImagePreview ? (
            <div
              onClick={!isImageLoaded ? handleBrowseClick : undefined}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={`border-dashed border-2 ${
                isDragging ? "border-blue-500" : "border-gray-300"
              } p-6 text-center rounded ${
                !isImageLoaded ? "cursor-pointer" : ""
              }`}
            >
              {!isImageLoaded && (
                <p className="text-sm text-gray-600">
                  Drag and drop a DICOM (.dcm) file here, or click to browse
                </p>
              )}
            </div>
          ) : (
            <>
              <div
                ref={divRef}
                className="w-full h-60 mt-4 border rounded overflow-hidden"
              ></div>
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-2">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => {
                      const newIndex = currentIndex - 1;
                      setCurrentIndex(newIndex);
                      cornerstone.displayImage(
                        divRef.current,
                        images[newIndex]
                      );
                    }}
                    className="disabled:opacity-50"
                  >
                    <ChevronLeft size={24} />
                  </button>

                  <span className="text-sm text-gray-700">
                    {currentIndex + 1} / {images.length}
                  </span>

                  <button
                    disabled={currentIndex === images.length - 1}
                    onClick={() => {
                      const newIndex = currentIndex + 1;
                      setCurrentIndex(newIndex);
                      cornerstone.displayImage(
                        divRef.current,
                        images[newIndex]
                      );
                    }}
                    className="disabled:opacity-50"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              )}
            </>
          )}
          <div className="flex justify-end mt-5 gap-5">
            {isImageLoaded && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Remove Image
              </button>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <span className="animate-spin inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                  <span className="text-gray-200">Loading...</span>
                </div>
              ) : (
                "Analyze Scan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PatientForm;
