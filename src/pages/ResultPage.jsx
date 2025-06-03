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
    if (divRef.current && images.length > 0) {
      cornerstone.enable(divRef.current);
      cornerstone
        .loadImage(images[currentIndex].imageId)
        .then((image) => {
          cornerstone.displayImage(divRef.current, image);
        })
        .catch((error) => {
          console.error("Error loading image:", error);
        });
    }
  }, [images, currentIndex]);

  function formatDateString(dateString) {
    if (!dateString || dateString.length !== 8) return "";
    const year = dateString.slice(0, 4);
    const month = dateString.slice(4, 6);
    const day = dateString.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

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

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <div className="pt-24 px-5 pb-4">
        <button onClick={handleBack}>Back</button>
      </div>
      <div className="px-5 pb-4">
        <div className="flex justify-center">
          <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left Sidebar */}
            <aside className="bg-white p-4 rounded shadow min-h-[calc(100vh-7rem)]">
              <h2 className="font-semibold mb-2">Patient Info</h2>
              <p>Name: {formData.name}</p>
              <p>Age: {formData.age}</p>
              <p>Gender: {formData.gender}</p>
              <p>Clinical: {formData.clinical}</p>
              <p>Date: {formatDateString(formData.date)}</p>
            </aside>
            {/* Main Content */}
            <main className="bg-gray-100 p-4 rounded shadow min-h-[calc(100vh-7rem)]">
              <h2 className="font-semibold mb-2">Image</h2>
              <div className="flex items-center justify-center gap-3">
                {images.length > 1 && (
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
                )}
                <div ref={divRef} className="w-full h-[500px]"></div>
                {images.length > 1 && (
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
                )}
              </div>
            </main>
            {/* Right Sidebar */}
           <aside className="bg-white p-4 rounded shadow min-h-[calc(100vh-7rem)]">
  <h2 className="font-semibold mb-2">Result</h2>
  {scanResult && typeof scanResult === 'object' && !Array.isArray(scanResult) && scanResult.prediction && (
    <div>
      <p className="break-words">
        The prediction for the image scan is {scanResult.prediction}{" "}
        with a confidence of{" "}
        {Math.round(scanResult.confidence * 100).toFixed(2)}%. The
        uncertainty is {scanResult.uncertainty.toFixed(5)}.
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
