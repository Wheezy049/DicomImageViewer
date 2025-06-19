import React, { useEffect, useRef, useState } from "react";
import Navbar from "../component/Navbar";
import { useScanContext } from "../context/ScanContext";
import * as cornerstone from "cornerstone-core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

function ResultPage() {
  const {
    images,
    formData,
    scanResult,
    setFormData,
    setScanResult,
    setImages,
    setDicomMetadata,
    refreshScans,
  } = useScanContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const divRef = useRef(null);

  useEffect(() => {
    const loadAndDisplayImage = async () => {
      if (divRef.current && images.length > 0) {
        try {
          if (!cornerstone.getEnabledElement(divRef.current)) {
            cornerstone.enable(divRef.current);
          }
          const imageId = images[currentIndex];
          const image = await cornerstone.loadImage(imageId);
          cornerstone.displayImage(divRef.current, image);
        } catch (error) {
          console.error("Error displaying image:", error);
        }
      }
    };

    loadAndDisplayImage();
  }, [images, currentIndex]);

  const handleBack = () => {
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
    if (!dateString || dateString.length !== 8) return "";
    return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
  };

  const currentResult = Array.isArray(scanResult)
    ? scanResult[currentIndex]
    : scanResult;

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
              <p>Name: {formData.name}</p>
              <p>Age: {formData.age}</p>
              <p>Gender: {formData.gender}</p>
              <p>Clinical: {formData.clinical}</p>
              <p>Date: {formatDateString(formData.date)}</p>
            </aside>

            {/* DICOM Viewer */}
            <main className="bg-gray-100 p-4 rounded shadow min-h-[calc(100vh-7rem)]">
              <h2 className="font-semibold mb-2">Image</h2>
              <div className="flex items-center justify-center gap-3">
                {images.length > 1 && (
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => prev - 1)}
                    className="disabled:opacity-50"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div ref={divRef} className="w-full h-[500px]"></div>
                {images.length > 1 && (
                  <button
                    disabled={currentIndex === images.length - 1}
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="disabled:opacity-50"
                  >
                    <ChevronRight size={24} />
                  </button>
                )}
              </div>
            </main>

            {/* Scan Result */}
            <aside className="bg-white p-4 rounded shadow min-h-[calc(100vh-7rem)]">
              <h2 className="font-semibold mb-2">Result</h2>
              {currentResult &&
                typeof currentResult === "object" &&
                currentResult.prediction && (
                  <div>
                    <p className="break-words">
                      The prediction for the image scan is{" "}
                      {currentResult.prediction} with a confidence of{" "}
                      {Math.round(currentResult.confidence * 100).toFixed(2)}%. The
                      uncertainty is {currentResult.uncertainty.toFixed(5)}.
                    </p>
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
