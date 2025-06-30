import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../utils/supabase-client";
import { useScanContext } from "../context/ScanContext";
import { toast } from "react-toastify";
import Navbar from "../component/Navbar";

function SignIn() {
  const { formData, setFormData } = useScanContext();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error("Error signing in:", error.message);
        toast.error(`Error signing in: ${error.message}`);
        return;
      }

      if (data?.session) {
        toast.success("Sign in successful!");
        setFormData({
          ...formData,
          email: "",
          password: "",
        });

        const from = "/home";
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error("Unexpected error signing in:", error);
      toast.error("Unexpected error signing in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="flex flex-col pt-16 justify-center items-center m-auto bg-[#F4F7FA] h-screen">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-10 flex flex-col gap-5 rounded-md shadow-md"
        >
          <h1 className="text-3xl font-semibold">Login into your account</h1>
          <div className="flex flex-col gap-1 w-full">
            <label htmlFor="email" className="text-sm">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              className="border-2 border-gray-300 rounded-md p-2 text-black placeholder:text-gray-300"
              disabled={isLoading}
              required
            />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <label htmlFor="password" className="text-sm">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className="border-2 border-gray-300 rounded-md p-2 text-black placeholder:text-gray-300"
              disabled={isLoading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-black text-white w-full p-3 rounded-md flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
          <p className="text-sm text-center text-black">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default SignIn;
