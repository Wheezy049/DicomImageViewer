import React, { useState } from "react";
import Navbar from "../component/Navbar";
import RecentPatient from "../component/RecentPatient";
import PatientForm from "../component/PatientForm";

const DICOMViewer = () => {
  const [isPopup, setIsPopup] = useState(false);

  return (
    <div className="">
      <Navbar />
      <div className="pt-32 px-10 bg-[#F4F7FA] h-screen">
        <div className="max-w-7xl mx-auto h-full w-full">
          <div className="mb-10">
            <button
              onClick={() => setIsPopup(true)}
              className="text-white p-4 rounded-[6px] border-none outline-none cursor-pointer bg-[#13ADC7] hover:bg-[#0E95AC]"
            >
              Upload New Image
            </button>
            {isPopup && <PatientForm setIsPopup={setIsPopup} />}
          </div>
          <RecentPatient />
        </div>
      </div>
    </div>
  );
};

export default DICOMViewer;
