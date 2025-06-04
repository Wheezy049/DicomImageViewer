import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import { useScanContext } from "../context/ScanContext";
import { supabase } from "../utils/supabase-client";
import { toast } from "react-toastify";

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, loading, setFormData } = useScanContext();
  const navigate = useNavigate();

  const userName =
    user?.user_metadata?.fullName ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error.message);
        toast.error("Error signing out. Please try again.");
        return;
      }

      setFormData({
        name: "",
        age: "",
        gender: "",
        clinical: "",
        date: "",
        fullName: "",
        email: "",
        password: "",
      });

      toast.success("Logged out successfully!");
      navigate("/signin");
    } catch (error) {
      console.error("Unexpected error signing out:", error);
      toast.error("Unexpected error signing out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) {
    return (
      <div
        className={`fixed top-0 w-full z-50 px-10 py-5 text-white transition-shadow duration-300 ${
          scrolled ? "bg-[#0A2342] shadow-lg" : "bg-[#0A2342]"
        }`}
      >
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <Link to="/" >
           {/* <img src="/image/logo.png" alt="Logo" className="w-10 h-10" /> */}
            <h1 className="text-4xl font-semibold cursor-pointer">EZCXR</h1>
          </Link>

          {/* Loading indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed top-0 w-full z-50 px-0 py-5 text-white transition-shadow duration-300 ${
        scrolled ? "bg-[#0A2342] shadow-lg" : "bg-[#0A2342]"
      }`}
    >
      <div className="max-w-[1200px] mx-auto flex justify-between items-center">
        <Link to="/" >
          {/* <img src="/image/logo.png" alt="Logo" className="w-10 h-10" /> */}
          <h1 className="text-4xl font-semibold cursor-pointer">EZCXR</h1>
        </Link>

        {user ? (
          <div className="bg-white rounded-[100px] px-3 py-2 flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-800 font-medium capitalize">
              {userName}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-red-500 text-sm font-medium">
                    Logging out...
                  </span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span className="text-red-500 text-sm font-medium">
                    Logout
                  </span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Link to="/signin">
              <button className="px-6 py-2 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-lg transition-colors shadow-sm border border-gray-200">
                Login
              </button>
            </Link>
            <Link to="/signup">
              <button className="px-6 py-2 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-lg transition-colors shadow-sm border border-gray-200">
                Sign Up
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Navbar;
