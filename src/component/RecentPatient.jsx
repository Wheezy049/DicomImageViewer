import { ChevronLeft, ChevronRight, X, Stethoscope } from "lucide-react";
import React, { useState } from "react";
import { useScanContext } from "../context/ScanContext";
import { supabase } from "../utils/supabase-client";
import { toast } from "react-toastify";

function RecentPatient() {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingScan, setViewingScan] = useState(null);
  const [expertReview, setExpertReview] = useState(null);
  const [expertReviewData, setExpertReviewData] = useState({
    status: "",
    details: "",
    reviewer_name: "",
    additional_notes: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  const { scans, loading, refreshScans, } = useScanContext();

  const getResultData = (scan) => {
    if (!scan.result) return null;

    // Handle with results array
    if (scan.result.results && Array.isArray(scan.result.results) && scan.result.results.length > 0) {
      return scan.result.results[0];
    }

    // Handle with direct properties
    if (scan.result.confidence !== undefined) {
      return scan.result;
    }

    return null;
  };

  const getConfidencePercentage = (scan) => {
    const resultData = getResultData(scan);
    if (!resultData || resultData.confidence === undefined) return "No result";
    return (resultData.confidence * 100).toFixed(2);
  };

  const getPrediction = (scan) => {
    const resultData = getResultData(scan);
    if (!resultData || !resultData.prediction) return "No result";
    return resultData.prediction;
  };

  // if (loading) return <p>Loading user data...</p>;

  const recentPerPage = 10;
  const indexOfLastScan = currentPage * recentPerPage;
  const indexOfFirstScan = indexOfLastScan - recentPerPage;
  const currentScans = scans.slice(indexOfFirstScan, indexOfLastScan);

  const totalPages = Math.ceil(scans.length / recentPerPage);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleView = (scanId) => {
    const selectedScan = scans.find((scan) => scan.id === scanId);
    setViewingScan(selectedScan);
  };

  const closeModal = () => {
    setViewingScan(null);
  };

  const handleExpertReview = async (scanId) => {
    const selectedScan = scans.find((scan) => scan.id === scanId);
    if (!selectedScan) {
      toast.error("Scan not found");
      return;
    }

    setExpertReview(selectedScan);

    if (selectedScan.expert_review) {
      setExpertReviewData({
        status: selectedScan.expert_review.status || "",
        details: selectedScan.expert_review.details || "",
        reviewer_name: selectedScan.expert_review.reviewer_name || "",
        additional_notes: selectedScan.expert_review.additional_notes || "",
      });
    } else {
      setExpertReviewData({
        status: "",
        details: "",
        reviewer_name: "",
        additional_notes: "",
      });
    }
  };

  const closeExpertReviewModal = () => {
    setExpertReview(null);
    setExpertReviewData({
      status: "",
      details: "",
      reviewer_name: "",
      additional_notes: "",
    });
  };

  const handleExpertReviewSubmit = async () => {
    if (
      !expertReviewData.status ||
      !expertReviewData.details ||
      !expertReviewData.reviewer_name
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmittingReview(true);

    try {
      const reviewPayload = {
        status: expertReviewData.status,
        details: expertReviewData.details,
        reviewer_name: expertReviewData.reviewer_name,
        additional_notes: expertReviewData.additional_notes,
        reviewed_at: new Date().toISOString(),
        scan_id: expertReview.id,
      };

      // Update the scan record with expert review
      const { error } = await supabase
        .from("scan_records")
        .update({
          expert_review: reviewPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", expertReview.id)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        toast.error(`Error saving expert review: ${error.message}`);
        return;
      }

      toast.success("Expert review saved successfully");

      // Refresh the scans from database instead of just updating local state
      await refreshScans();

      closeExpertReviewModal();
    } catch (error) {
      console.error("Error saving expert review:", error);
      toast.error("Error saving expert review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDelete = async (scanId) => {
    try {
      const selectedScan = scans.find((scan) => scan.id === scanId);

      if (!selectedScan) {
        toast.error("Scan not found");
        return;
      }

      const { error } = await supabase
        .from("scan_records")
        .delete()
        .eq("id", selectedScan.id);

      if (error) {
        toast.error(`Error deleting scan: ${error.message}`);
        throw new Error(error.message);
      }

      toast.success("Scan deleted successfully");

      // Refresh the scans from database instead of manually filtering
      await refreshScans();

      // Recalculate pagination after refresh
      const remainingItems = scans.length - 1;
      const newTotalPages = Math.ceil(remainingItems / recentPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } catch (error) {
      console.error("Error deleting scan:", error.message);
      toast.error("Error deleting scan. Please try again.");
    }
  };

  if (!scans || scans.length === 0) {
    return (
      <div className="text-center flex flex-col gap-2 justify-center items-center m-auto py-10">
        <h2 className="text-xl font-semibold text-gray-700">
          No recent scans available
        </h2>
        <p className="text-gray-500">Please upload a scan to get started.</p>
      </div>
    );
  }


  if (loading) {
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
    <div>
       {
         !loading && (
                    <div className="relative">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Confidence Level
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Diagnosis
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Review Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentScans.map((scan) => (
                    <tr key={scan.id}>
                      <td className="px-4 py-1 font-semibold text-gray-900">
                        {scan.displayNumber}
                      </td>
                      <td className="px-4 py-1 font-semibold text-gray-900">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-1 font-semibold text-gray-900">
                        {getConfidencePercentage(scan)}%
                      </td>
                      <td className="px-4 py-1 font-semibold text-gray-900">
                        {getPrediction(scan)}
                      </td>
                      <td className="px-4 py-1 text-blue-600 hover:underline cursor-pointer">
                        {scan.expert_review ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-full flex justify-center items-center w-[100px] text-sm capitalize font-medium ${scan.expert_review.status === "normal"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                }`}
                            >
                              {scan.expert_review.status}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-1 rounded-full flex justify-center items-center w-[120px] text-sm font-medium bg-gray-100 text-gray-600">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-blue-600 hover:underline cursor-pointer">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(scan.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleExpertReview(scan.id)}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center gap-1"
                          >
                            <Stethoscope size={14} />
                            {scan.expert_review ? "Edit Review" : "Expert Review"}
                          </button>
                          <button
                            onClick={() => handleDelete(scan.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                    className="disabled:opacity-50"
                  >
                    <ChevronLeft />
                  </button>

                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="disabled:opacity-50"
                  >
                    <ChevronRight />
                  </button>
                </div>
              )}
            </div>

            {/* Scan Details Modal */}
            {viewingScan && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Scan Details</h2>
                    <button
                      onClick={closeModal}
                      className="p-1 hover:bg-gray-200 rounded-full"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="border-b pb-3">
                      <h3 className="font-semibold text-gray-700">
                        Scan Information
                      </h3>
                      <p>
                        <span className="font-medium">ID:</span> {viewingScan.id}
                      </p>
                      <p>
                        <span className="font-medium">Created:</span>{" "}
                        {new Date(viewingScan.created_at).toLocaleString()}
                      </p>
                      {viewingScan.user_id && (
                        <p>
                          <span className="font-medium">User ID:</span>{" "}
                          {viewingScan.user_id}
                        </p>
                      )}
                      {viewingScan.file_path && (
                        <p>
                          <span className="font-medium">File Path:</span>{" "}
                          {viewingScan.file_path}
                        </p>
                      )}
                    </div>

                    <div className="border-b pb-3">
                      <h3 className="font-semibold text-gray-700">
                        Analysis Results
                      </h3>
                      {(() => {
                        const resultData = getResultData(viewingScan);
                        if (resultData) {
                          return (
                            <>
                              {resultData.image && (
                                <p>
                                  <span className="font-medium">Image:</span>{" "}
                                  {resultData.image}
                                </p>
                              )}
                              <p>
                                <span className="font-medium">Prediction:</span>{" "}
                                {resultData.prediction}
                              </p>
                              <p>
                                <span className="font-medium">Confidence:</span>{" "}
                                {(resultData.confidence * 100).toFixed(2)}%
                              </p>
                              <p>
                                <span className="font-medium">Uncertainty:</span>{" "}
                                {(resultData.uncertainty * 100).toFixed(2)}%
                              </p>
                              {/* Show all results if there are multiple */}
                              {viewingScan.result.results && viewingScan.result.results.length > 1 && (
                                <div className="mt-2">
                                  <span className="font-medium">All Results:</span>
                                  <div className="ml-4 mt-1">
                                    {viewingScan.result.results.map((result, index) => (
                                      <div key={index} className="text-sm bg-gray-50 p-2 rounded mb-1">
                                        <strong>Result {index + 1}:</strong> {result.prediction}
                                        ({(result.confidence * 100).toFixed(2)}% confidence)
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        } else {
                          return <p>No analysis results available</p>;
                        }
                      })()}
                    </div>

                    {viewingScan.expert_review && (
                      <div className="border-b pb-3">
                        <h3 className="font-semibold text-gray-700">Expert Review</h3>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          <span
                            className={`px-2 py-1 rounded text-sm ${viewingScan.expert_review.status === "normal"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                              }`}
                          >
                            {viewingScan.expert_review.status}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">Reviewer:</span>{" "}
                          {viewingScan.expert_review.reviewer_name}
                        </p>
                        <p>
                          <span className="font-medium">Details:</span>{" "}
                          {viewingScan.expert_review.details}
                        </p>
                        {viewingScan.expert_review.additional_notes && (
                          <p>
                            <span className="font-medium">Additional Notes:</span>{" "}
                            {viewingScan.expert_review.additional_notes}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Reviewed:</span>{" "}
                          {new Date(
                            viewingScan.expert_review.reviewed_at
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {viewingScan.metadata && (
                      <div>
                        <h3 className="font-semibold text-gray-700">
                          Additional Metadata
                        </h3>
                        <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                          {JSON.stringify(viewingScan.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Expert Review Modal */}
            {expertReview && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Stethoscope size={24} />
                      Expert Review - Scan #{expertReview.displayNumber}
                    </h2>
                    <button
                      onClick={closeExpertReviewModal}
                      className="p-1 hover:bg-gray-200 rounded-full"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* AI Analysis Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">
                        AI Analysis Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <p>
                          <span className="font-medium">Prediction:</span>{" "}
                          {getPrediction(expertReview)}
                        </p>
                        <p>
                          <span className="font-medium">Confidence:</span>{" "}
                          {getConfidencePercentage(expertReview)}%
                        </p>
                        <p>
                          <span className="font-medium">Date:</span>{" "}
                          {new Date(expertReview.created_at).toLocaleDateString()}
                        </p>
                        <p>
                          <span className="font-medium">Time:</span>{" "}
                          {new Date(expertReview.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {/* Expert Review Form */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expert Assessment <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="status"
                              value="normal"
                              checked={expertReviewData.status === "normal"}
                              onChange={(e) =>
                                setExpertReviewData({
                                  ...expertReviewData,
                                  status: e.target.value,
                                })
                              }
                              className="mr-2"
                            />
                            <span className="text-green-700 font-medium">Normal</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="status"
                              value="abnormal"
                              checked={expertReviewData.status === "abnormal"}
                              onChange={(e) =>
                                setExpertReviewData({
                                  ...expertReviewData,
                                  status: e.target.value,
                                })
                              }
                              className="mr-2"
                            />
                            <span className="text-red-700 font-medium">Abnormal</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reviewer Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={expertReviewData.reviewer_name}
                          onChange={(e) =>
                            setExpertReviewData({
                              ...expertReviewData,
                              reviewer_name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter reviewer's name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Detailed Assessment <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={expertReviewData.details}
                          onChange={(e) =>
                            setExpertReviewData({
                              ...expertReviewData,
                              details: e.target.value,
                            })
                          }
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Provide detailed assessment of the image..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          value={expertReviewData.additional_notes}
                          onChange={(e) =>
                            setExpertReviewData({
                              ...expertReviewData,
                              additional_notes: e.target.value,
                            })
                          }
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Any additional observations or recommendations..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={closeExpertReviewModal}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                      disabled={submittingReview}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExpertReviewSubmit}
                      disabled={submittingReview}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingReview ? "Saving..." : "Save Review"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
         )
       }
    </div>
  )};

  export default RecentPatient;