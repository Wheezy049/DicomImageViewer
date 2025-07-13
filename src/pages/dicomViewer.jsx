import React, { useState } from "react";
import Navbar from "../component/Navbar";
import RecentPatient from "../component/RecentPatient";
import PatientForm from "../component/PatientForm";
import { useScanContext } from "../context/ScanContext";

const DICOMViewer = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [multipleFormPopup, setMutipleFormPopup] = useState(false);
  const { loading } = useScanContext()

  if(loading){
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <Navbar />
      <div className="pt-32 px-10 bg-[#F4F7FA] h-full pb-20">
        <div className="max-w-7xl mx-auto h-full w-full">
          <div className="mb-10 flex gap-2 items-center">
            <button
              onClick={() => setIsPopup(true)}
              className="text-white p-4 rounded-[6px] border-none outline-none cursor-pointer bg-[#13ADC7] hover:bg-[#0E95AC]"
            >
              Upload New Image
            </button>
            
            <button className="text-white p-4 rounded-[6px] border-none outline-none cursor-pointer bg-[#13ADC7] hover:bg-[#0E95AC]">Upload Mutiple Image</button>
            {isPopup && <PatientForm setIsPopup={setIsPopup} />}
          </div>
          {!loading && <RecentPatient />}
        </div>
      </div>
    </div>
  );
};

export default DICOMViewer;
