import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ScanContextProvider } from "./context/ScanContext";
import ProtectedRoute from "./component/ProtectedRoute";
import PublicRoute from "./component/PublicRoute";
import DICOMViewer from "./pages/dicomViewer";
import ResultPage from "./pages/ResultPage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

function App() {
  return (
    <ScanContextProvider>
      <div className="App">
        <Routes>
          {/* Root path - redirect to protected home */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DICOMViewer />
              </ProtectedRoute>
            } 
          />
          
          {/* Public routes */}
          <Route
            path="/signin"
            element={
              <PublicRoute>
                <SignIn />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignUp />
              </PublicRoute>
            }
          />
          
          {/* Protected routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <DICOMViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <ResultPage />
              </ProtectedRoute>
            }
          />
          
          {/* Catch all unknown routes - redirect to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </ScanContextProvider>
  );
}

export default App;