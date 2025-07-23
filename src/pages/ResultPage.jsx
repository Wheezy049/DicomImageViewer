import React, { useEffect, useRef, useState } from "react";
import Navbar from "../component/Navbar";
import { useScanContext } from "../context/ScanContext";
import * as cornerstone from "cornerstone-core";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import * as dicomParser from "dicom-parser";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

function ResultPage() {
  const {
    formData,
    scanResult,
    setFormData,
    setScanResult,
    setImages,
    setDicomMetadata,
    refreshScans,
    images,
    regularImages,
    
  } = useScanContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDicomImage, setIsDicomImage] = useState(false);
  const navigate = useNavigate();
  const divRef = useRef(null);

  useEffect(() => {
    const hasDicomImages = images && images.length > 0;
    const hasRegularImages = regularImages && regularImages.length > 0;
    
    if (hasDicomImages) {
      setIsDicomImage(true);
    } else if (hasRegularImages) {
      setIsDicomImage(false);
    }
  }, [images, regularImages]);



  useEffect(() => {
    if (!isDicomImage || !images || !images.length) return;

    const loadAndDisplayImage = async () => {
      if (!divRef.current) {
        console.error("Missing divRef");
        return;
      }
      
      if (currentIndex >= images.length) {
        console.error("Invalid index");
        return;
      }

      const imageId = images[currentIndex];
      if (!imageId) {
        console.error("No current result or image");
        return;
      }

      console.error("Loading imageId:", imageId);

      try {
        try {
          cornerstone.getEnabledElement(divRef.current);
        } catch (e) {
          cornerstone.enable(divRef.current);
        }

        const image = await cornerstone.loadImage(imageId);
        cornerstone.displayImage(divRef.current, image);
      } catch (error) {
        console.error("Error displaying image:", error);
      }
    };

    loadAndDisplayImage();
  }, [currentIndex, images, isDicomImage]);

  const handleBack = () => {
    if (divRef.current) {
      try {
        cornerstone.disable(divRef.current);
      } catch (error) {
        console.warn("Error disabling cornerstone element:", error);
      }
    }

    setFormData({
      name: "",
      age: "",
      gender: "",
      clinical: "",
      date: "",
    });
    setScanResult(null);
    setImages([]);
    setDicomMetadata([]);
    refreshScans();
    navigate("/home");
  };

  const formatDateString = (dateString) => {
    if (!dateString || dateString.length !== 8) return dateString || "";
    return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
  };

  const getResultsArray = () => {
    if (!scanResult || !Array.isArray(scanResult)) return [];
    
    if (scanResult.length > 0 && scanResult[0].results && Array.isArray(scanResult[0].results)) {
      return scanResult[0].results;
    }
    
    return scanResult;
  };
  
  const resultsArray = getResultsArray();
  const currentResult = resultsArray[currentIndex];
  console.log(currentResult)

  const getCurrentImageData = () => {
    if (isDicomImage && images && images.length > 0) {
      return {
        type: 'dicom',
        total: images.length,
        hasImages: true
      };
    } else if (!isDicomImage && regularImages && regularImages.length > 0) {
      return {
        type: 'regular',
        total: regularImages.length,
        hasImages: true,
        currentImage: regularImages[currentIndex]
      };
    }
    return {
      type: 'none',
      total: 0,
      hasImages: false
    };
  };

  const imageData = getCurrentImageData();

  const getRegularImageUrl = () => {
    if (!isDicomImage && regularImages && regularImages[currentIndex]) {
      const image = regularImages[currentIndex];
      if (image instanceof Blob) {
        return URL.createObjectURL(image);
      }
    }
    return null;
  };

  const regularImageUrl = getRegularImageUrl();

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < imageData.total - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  useEffect(() => {
    return () => {
      if (regularImageUrl) {
        URL.revokeObjectURL(regularImageUrl);
      }
    };
  }, [regularImageUrl]);

  if (!scanResult) {
    return (
      <div className="min-h-screen bg-[#F4F7FA]">
        <Navbar />
        <div className="pt-24 px-5 pb-4">
          <button onClick={handleBack}>Back</button>
          <div className="text-center mt-10">
            <p>No scan results available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <div className="pt-24 px-5 pb-4">
        <button onClick={handleBack}>Back</button>
      </div>
      <div className="px-5 pb-4">
        <div className="flex justify-center">
          <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Patient Info */}
            <aside className="bg-white p-4 rounded shadow min-h-[calc(100vh-7rem)]">
              <h2 className="font-semibold mb-2">Patient Info</h2>
              <p>Name: {formData.name || "N/A"}</p>
              <p>Age: {formData.age || "N/A"}</p>
              <p>Gender: {formData.gender || "N/A"}</p>
              <p>Clinical: {formData.clinical || "N/A"}</p>
              <p>Date: {formatDateString(formData.date) || "N/A"}</p>
            </aside>

            {/* Image Viewer */}
            <main className="bg-gray-100 p-4 rounded shadow min-h-[calc(100vh-7rem)]">
              <h2 className="font-semibold mb-2">
                Image {isDicomImage ? "(DICOM)" : "(Regular)"}
              </h2>
              
              {imageData.hasImages ? (
                <>
                  <div className="flex items-center justify-center gap-3">
                    {imageData.total > 1 && (
                      <button
                        disabled={currentIndex === 0}
                        onClick={handlePrevious}
                        className="disabled:opacity-50 p-2 hover:bg-gray-200 rounded"
                      >
                        <ChevronLeft size={24} />
                      </button>
                    )}
                    
                    {/* Image Display Container */}
                    <div className="w-full h-[500px] bg-black rounded overflow-hidden flex items-center justify-center">
                      {isDicomImage ? (
                        // DICOM Image Display
                        <div ref={divRef} className="w-full h-full"></div>
                      ) : (
                        // Regular Image Display
                        regularImageUrl ? (
                          <img
                            src={regularImageUrl}
                            alt={`Scan ${currentIndex + 1}`}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              console.error("Error loading regular image:", e);
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="text-white text-center">
                            <p>Unable to display image</p>
                          </div>
                        )
                      )}
                    </div>
                    
                    {imageData.total > 1 && (
                      <button
                        disabled={currentIndex === imageData.total - 1}
                        onClick={handleNext}
                        className="disabled:opacity-50 p-2 hover:bg-gray-200 rounded"
                      >
                        <ChevronRight size={24} />
                      </button>
                    )}
                  </div>
                  
                  {/* Image Counter */}
                  {imageData.total > 1 && (
                    <div className="text-center mt-2">
                      <span className="text-sm text-gray-600">
                        {currentIndex + 1} / {imageData.total}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-[500px] bg-gray-200 rounded flex items-center justify-center">
                  <p className="text-gray-500">No images available</p>
                </div>
              )}
            </main>

            {/* Scan Result */}
            <aside className="bg-white p-4 rounded shadow min-h-[calc(100vh-7rem)]">
              <h2 className="font-semibold mb-2">Result</h2>
              {currentResult && typeof currentResult === "object" ? (
                <div>
                  <p className="mb-2">
                    <strong>{currentResult.prediction ?? "N/A"}</strong>.
                  </p>
                  <p>File Name: <strong>{currentResult.image ?? "N/A"}</strong></p>
                </div>
              ) : (
                <div>
                  <p>No result data available for this scan.</p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultPage;