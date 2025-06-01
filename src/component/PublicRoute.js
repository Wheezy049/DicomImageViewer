// components/PublicRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useScanContext } from '../context/ScanContext';

const PublicRoute = ({ children }) => {
  const { user, loading } = useScanContext();
  const location = useLocation();

  // Show loading while authentication state is being determined
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

  // If authenticated and trying to access login/signup, redirect to dashboard
  if (user && (location.pathname === '/signin' || location.pathname === '/signup')) {
    // Check if there's a redirect location from ProtectedRoute
    const from = location.state?.from?.pathname || '/home';
    return <Navigate to={from} replace />;
  }

  // If not authenticated or accessing other public routes, render normally
  return children;
};

export default PublicRoute;