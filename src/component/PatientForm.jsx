import React, { useState, useRef, useEffect } from "react";
import * as cornerstone from "cornerstone-core";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import * as dicomParser from "dicom-parser";
import { toast } from "react-toastify";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useScanContext } from "../context/ScanContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase-client";
import JSZip from "jszip";

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
  const [isDicomImage, setIsDicomImage] = useState(false);
  const navigate = useNavigate();

  const API_URL = "https://api.epochzero.click";

  const {
    images,
    setImages,
    setDicomMetadata,
    formData,
    setFormData,
    setScanResult,
    regularImages,
    setRegularImages,
  } = useScanContext();

  const [disabledFields, setDisabledFields] = useState({
    name: false,
    age: false,
    clinical: false,
    date: false,
    threshold: false,
  });

  const [showThresholdWarning, setShowThresholdWarning] = useState(false);

  const divRef = useRef(null);
  const inputRef = useRef(null);

  const prepareDicomFiles = async (files) => {
    const metadataList = [];
    const imageIds = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".dcm")) {
        continue;
      }

      try {
        const imageId =
          cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
        imageIds.push(imageId);

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
          threshold: false, 
        });
      } catch (error) {
        console.error("❌ DICOM file processing failed:", file.name, error);
        toast.error(`Failed to load DICOM file: ${file.name}`);
      }
    }

    if (imageIds.length > 0) {
      setImages(imageIds);
      setDicomMetadata(metadataList);
      setIsDicomImage(true);
      setIsImageLoaded(true);
      setCurrentIndex(0);
      setShowImagePreview(true);
    }
  };

  useEffect(() => {
    const displayDicomImage = async () => {

      if (isDicomImage && images.length > 0 && divRef.current) {
        try {
          const imageId = images[currentIndex];
          let enabledElement;
          try {
            enabledElement = cornerstone.getEnabledElement(divRef.current);
          } catch (error) {
            cornerstone.enable(divRef.current);
          }

          const image = await cornerstone.loadImage(imageId);
          cornerstone.displayImage(divRef.current, image);
        } catch (error) {
          console.error("❌ Error in DICOM display:", error);
          toast.error("Error displaying DICOM image: " + error.message);
        }
      } else if (isDicomImage && images.length > 0 && !divRef.current) {
      }
    };

    if (isDicomImage && showImagePreview) {
      setTimeout(displayDicomImage, 100);
    }
  }, [currentIndex, images, isDicomImage, showImagePreview]);

  const loadRegularImages = async (files) => {
  const imageFiles = files.filter((file) => {
    const ext = file.name.toLowerCase();
    return (
      ext.endsWith(".jpg") ||
      ext.endsWith(".jpeg") ||
      ext.endsWith(".png") ||
      ext.endsWith(".gif") ||
      ext.endsWith(".bmp") ||
      ext.endsWith(".webp")
    );
  });

  if (imageFiles.length > 0) {
    const validFiles = imageFiles.filter((f) => f instanceof Blob);
    setRegularImages(validFiles);
    setIsDicomImage(false);
    setIsImageLoaded(true);
    setCurrentIndex(0);
  }
};

  const isSupportedFileType = (filename) => {
    const ext = filename.toLowerCase();

    if (ext.endsWith(".dcm")) return "dicom";

    if (ext.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return "image";

    return null;
  };

  const extractFiles = async (files) => {
    const allExtractedFiles = [];
    const zipValidationResults = [];

    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        try {
          const zip = await JSZip.loadAsync(file);
          const zipContents = Object.keys(zip.files);

          const supportedFiles = [];
          const unsupportedFiles = [];

          for (const filename of zipContents) {
            const zipFile = zip.files[filename];

            if (zipFile.dir) continue;

            const fileType = isSupportedFileType(filename);
            if (fileType) {
              supportedFiles.push({ filename, type: fileType });
            } else {
              if (
                !filename.startsWith("__MACOSX/") &&
                !filename.startsWith(".DS_Store") &&
                !filename.endsWith(".txt")
              ) {
                unsupportedFiles.push(filename);
              }
            }
          }

          if (supportedFiles.length === 0) {
            toast.warning(
              `ZIP file "${file.name}" contains no supported files (DICOM or images)`
            );
            zipValidationResults.push({
              filename: file.name,
              status: "no_supported_files",
              supportedCount: 0,
              unsupportedCount: unsupportedFiles.length,
            });
            continue;
          }

          const dicomCount = supportedFiles.filter(
            (f) => f.type === "dicom"
          ).length;
          const imageCount = supportedFiles.filter(
            (f) => f.type === "image"
          ).length;

          let message = `Found in "${file.name}": `;
          if (dicomCount > 0) message += `${dicomCount} DICOM file(s)`;
          if (imageCount > 0) {
            if (dicomCount > 0) message += `, `;
            message += `${imageCount} image file(s)`;
          }
          if (unsupportedFiles.length > 0) {
            message += ` (${unsupportedFiles.length} unsupported files skipped)`;
          }

          toast.info(message);

          for (const { filename, type } of supportedFiles) {
            try {
              const zipFile = zip.files[filename];
              const content = await zipFile.async("uint8array");
              const blob = new Blob([content]);
              const extractedFile = new File([blob], filename);
              allExtractedFiles.push(extractedFile);
            } catch (extractError) {
              console.error(
                `  ❌ Failed to extract: ${filename}`,
                extractError
              );
              toast.error(`Failed to extract "${filename}" from ZIP`);
            }
          }

          zipValidationResults.push({
            filename: file.name,
            status: "success",
            supportedCount: supportedFiles.length,
            unsupportedCount: unsupportedFiles.length,
            extractedCount: supportedFiles.length,
          });
        } catch (error) {
          console.error("❌ Error processing ZIP file:", file.name, error);
          toast.error(`Failed to process ZIP file: ${file.name}`);
          zipValidationResults.push({
            filename: file.name,
            status: "error",
            error: error.message,
          });
        }
      } else {
        const fileType = isSupportedFileType(file.name);
        if (fileType) {
          allExtractedFiles.push(file);
        } else {
          toast.warning(`Skipped unsupported file: ${file.name}`);
        }
      }
    }

    return allExtractedFiles;
  };

  const validateFiles = async (files) => {
    const validation = {
      valid: [],
      invalid: [],
      zips: [],
      totalSupported: 0,
    };

    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        try {
          const zip = await JSZip.loadAsync(file);
          const zipContents = Object.keys(zip.files);
          let supportedInZip = 0;

          for (const filename of zipContents) {
            if (!zip.files[filename].dir && isSupportedFileType(filename)) {
              supportedInZip++;
            }
          }

          validation.zips.push({
            name: file.name,
            supportedFiles: supportedInZip,
            totalFiles: zipContents.filter((name) => !zip.files[name].dir)
              .length,
          });

          validation.totalSupported += supportedInZip;
        } catch (error) {
          validation.invalid.push({
            name: file.name,
            reason: "Invalid ZIP file",
          });
        }
      } else {
        const fileType = isSupportedFileType(file.name);
        if (fileType) {
          validation.valid.push({ name: file.name, type: fileType });
          validation.totalSupported++;
        } else {
          validation.invalid.push({
            name: file.name,
            reason: "Unsupported file type",
          });
        }
      }
    }

    return validation;
  };

  const clearAllData = () => {
    if (divRef.current && isDicomImage) {
      try {
        if (cornerstone.getEnabledElement(divRef.current)) {
          cornerstone.disable(divRef.current);
        }
      } catch (error) {
        console.warn("Error disabling cornerstone element:", error);
      }
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setIsImageLoaded(false);
    setShowImagePreview(false);
    setImages([]);
    setRegularImages([]);
    setCurrentIndex(0);
    setIsDicomImage(false);
    setIsDragging(false);
    setLoading(false);
    setRegularImages([]);

    setFormData({
      name: "",
      age: "",
      gender: "",
      clinical: "",
      date: "",
      threshold: 0.5,
    });

    setDisabledFields({
      name: false,
      age: false,
      clinical: false,
      date: false,
      threshold: false,
    });

    setDicomMetadata([]);
  };

  const handleRemoveImage = () => {
    clearAllData();
  };

  const closeModal = () => {
    clearAllData();
    setIsPopup(false);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    try {
      setLoading(true);

      const validation = await validateFiles(files);

      if (validation.totalSupported === 0) {
        toast.error(
          "No supported files selected. Please choose DICOM (.dcm) files, images, or ZIP files containing them."
        );
        setLoading(false);
        return;
      }

      if (validation.invalid.length > 0) {
        const invalidNames = validation.invalid.map((f) => f.name).join(", ");
        toast.warning(`Skipping unsupported files: ${invalidNames}`);
      }

      const extractedFiles = await extractFiles(files);

      const dcmFiles = extractedFiles.filter((file) =>
        file.name.toLowerCase().endsWith(".dcm")
      );

      const imageFiles = extractedFiles.filter((file) => {
        const ext = file.name.toLowerCase();
        return ext.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/);
      });

      if (dcmFiles.length > 0) {
        await prepareDicomFiles(dcmFiles);
      } else if (imageFiles.length > 0) {
        await loadRegularImages(imageFiles);
        setShowImagePreview(true);
      }
    } catch (error) {
      console.error("Error processing selected files:", error);
      toast.error("Error processing files: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);

    if (files.length === 0) {
      toast.warning("No files were dropped");
      return;
    }

    try {
      clearAllData();

      setLoading(true);

      const validation = await validateFiles(files);

      if (validation.totalSupported === 0) {
        toast.error(
          "No supported files found. Please drop DICOM (.dcm) files, images (jpg, png, etc.), or ZIP files containing them."
        );
        setLoading(false);
        return;
      }

      let summary = `Found ${validation.totalSupported} supported file(s): `;
      if (validation.valid.length > 0) {
        const dicomCount = validation.valid.filter(
          (f) => f.type === "dicom"
        ).length;
        const imageCount = validation.valid.filter(
          (f) => f.type === "image"
        ).length;
        if (dicomCount > 0) summary += `${dicomCount} DICOM`;
        if (imageCount > 0) {
          if (dicomCount > 0) summary += ", ";
          summary += `${imageCount} image(s)`;
        }
      }
      if (validation.zips.length > 0) {
        summary += ` + ${validation.zips.length} ZIP file(s)`;
      }

      toast.info(summary);

      const extractedFiles = await extractFiles(files);

      if (extractedFiles.length === 0) {
        toast.warning("No files could be processed");
        setLoading(false);
        return;
      }

      const dcmFiles = extractedFiles.filter((file) =>
        file.name.toLowerCase().endsWith(".dcm")
      );

      const imageFiles = extractedFiles.filter((file) => {
        const ext = file.name.toLowerCase();
        return ext.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/);
      });

      if (dcmFiles.length > 0) {
        await prepareDicomFiles(dcmFiles);
        toast.success(`Successfully loaded ${dcmFiles.length} DICOM file(s)`);
      } else if (imageFiles.length > 0) {
        await loadRegularImages(imageFiles);
        setShowImagePreview(true);
        toast.success(`Successfully loaded ${imageFiles.length} image file(s)`);
      }
    } catch (error) {
      console.error("Error processing dropped files:", error);
      toast.error("Error processing files: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleBrowseClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "threshold") {
    const numValue = parseFloat(value);
    if (numValue < 0 || numValue > 1) {
      toast.warning("Threshold must be between 0 and 1");
      return;
    }
     if (numValue !== 0.5 && !showThresholdWarning) {
        toast.warning(
          "You changed the threshold value. This may affect the scan results. Please proceed with caution."
        );
        setShowThresholdWarning(true);
      }
      if (numValue === 0.5 && showThresholdWarning) {
        setShowThresholdWarning(false);
        toast.dismiss();
      }
  }
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

    const files = Array.from(inputRef.current?.files || []);
    const extractedFiles = await extractFiles(files);

    const user = supabase.auth.getUser();
    const userId = (await user)?.data?.user?.id;

    if (!extractedFiles || !userId) {
      toast.error("Missing file or user.");
      setLoading(false);
      return;
    }

    toast.info(
      "Analyzing scan... This may take up to 6 minutes. Please wait.",
      {
        autoClose: false,
        toastId: "scan-progress",
      }
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort("Upload Timeout");
    }, 420000);

    try {
      const uploadedFilePaths = [];

      for (const file of extractedFiles) {
        const uniqueName = `${Date.now()}-${file.name}`;
        const storagePath = `${userId}/${uniqueName}`;
        const { error: uploadError } = await supabase.storage
          .from("user-scans")
          .upload(storagePath, file);

        if (uploadError) {
          toast.error(`Upload failed for ${file.name}`);
          continue;
        }

        uploadedFilePaths.push({ name: file.name, path: storagePath });
      }

      let threshold = formData.threshold;

      const formPayload = new FormData();
      extractedFiles.forEach((file) => {
        formPayload.append("files", file);
        formPayload.append("threshold", threshold);
      });
      const response = await fetch(`${API_URL}/batch`, {
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

      const { error: insertError } = await supabase.from("scan_records").insert(
        uploadedFilePaths.map(({ path }) => ({
          user_id: userId,
          file_path: path,
          result: JSON.stringify(result),
        }))
      );

      if (insertError) throw new Error("Failed to save scan record");

      setScanResult(Array.isArray(result) ? result : [result]);
      toast.dismiss("scan-progress");
      toast.success("Scan analysis completed successfully!");
      navigate("/result");
    } catch (error) {
      clearTimeout(timeoutId);
      toast.dismiss("scan-progress");
      setScanResult(null);
      const errorMessage = error?.message || "Unknown Error"
      console.error("Scan submission error:", errorMessage);

      if (error.name === "AbortError") {
        toast.error(
          "Scan analysis timed out after 6 minutes. Please try again."
        );
      } else if (errorMessage.includes("Failed to fetch")) {
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

  const handlePreviousImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextImage = () => {
    if (isDicomImage && currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (!isDicomImage && currentIndex < regularImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const objectUrl =
    regularImages[currentIndex] && regularImages[currentIndex] instanceof Blob
      ? URL.createObjectURL(regularImages[currentIndex])
      : null;

  useEffect(() => {
    return () => {
      if (divRef.current && isDicomImage) {
        try {
          if (cornerstone.getEnabledElement(divRef.current)) {
            cornerstone.disable(divRef.current);
          }
        } catch (error) {
          console.warn("Error cleaning up cornerstone element:", error);
        }
      }
    };
  }, [isDicomImage]);

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
            <label htmlFor="date" className="block text-sm mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formatDateString(formData.date) || formData.date}
              onChange={handleInputChange}
              disabled={disabledFields.date}
              className="w-full border rounded px-3 py-2 outline-none focus:ring focus:ring-blue-300"
            />
          </div>

          <div>
            <label htmlFor="threshold" className="block text-sm mb-1">
              Threshold
            </label>
            <input
              type="number"
              name="threshold"
              min={0}
              max={1}
              step={0.01}
              value={formData.threshold}
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2 outline-none focus:ring focus:ring-blue-300"
            />
          </div>

          <input
            type="file"
            accept=".dcm,.zip,image/*"
            ref={inputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
          />

          {!showImagePreview ? (
            <div
              onClick={!isImageLoaded ? handleBrowseClick : undefined}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-dashed border-2 ${
                isDragging ? "border-blue-500" : "border-gray-300"
              } p-6 text-center rounded ${
                !isImageLoaded ? "cursor-pointer" : ""
              }`}
            >
              {!isImageLoaded && (
                <p className="text-sm text-gray-600">
                  Drag and drop a DICOM (.dcm) file, ZIP archive, or image here,
                  or click to browse
                </p>
              )}
            </div>
          ) : (
            <>
              {isDicomImage ? (
                <>
                  <div
                    ref={divRef}
                    className="w-full h-60 mt-4 border rounded overflow-hidden bg-black"
                    style={{ minHeight: "240px" }}
                  ></div>
                  {images.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <button
                        type="button"
                        disabled={currentIndex === 0}
                        onClick={handlePreviousImage}
                        className="disabled:opacity-50 p-2 hover:bg-gray-100 rounded"
                      >
                        <ChevronLeft size={24} />
                      </button>

                      <span className="text-sm text-gray-700">
                        {currentIndex + 1} / {images.length}
                      </span>

                      <button
                        type="button"
                        disabled={currentIndex === images.length - 1}
                        onClick={handleNextImage}
                        className="disabled:opacity-50 p-2 hover:bg-gray-100 rounded"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-full h-60 mt-4 border rounded overflow-hidden flex items-center justify-center">
                    {objectUrl ? (
                      <img
                        src={objectUrl}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                        onLoad={() => URL.revokeObjectURL(objectUrl)}
                      />
                    ) : (
                      <p className="text-gray-500">No preview available</p>
                    )}
                  </div>
                  {regularImages.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <button
                        type="button"
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex(currentIndex - 1)}
                        className="disabled:opacity-50 p-2 hover:bg-gray-100 rounded"
                      >
                        <ChevronLeft size={24} />
                      </button>

                      <span className="text-sm text-gray-700">
                        {currentIndex + 1} / {regularImages.length}
                      </span>

                      <button
                        type="button"
                        disabled={currentIndex === regularImages.length - 1}
                        onClick={() => setCurrentIndex(currentIndex + 1)}
                        className="disabled:opacity-50 p-2 hover:bg-gray-100 rounded"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>
                  )}
                </>
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
              disabled={!isImageLoaded || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
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
