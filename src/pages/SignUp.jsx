import React, { useState } from "react";
import { supabase } from "../utils/supabase-client";
import { Link } from "react-router-dom";
import { useScanContext } from "../context/ScanContext";
import { toast } from "react-toastify";
import Navbar from "../component/Navbar";

function SignUp() {
  const { formData, setFormData } = useScanContext();
   const [isLoading, setIsLoading] = useState(false);

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
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            fullName: formData.fullName,
          },
        },
      });
      if (error) {
        console.error("Error signing up:", error.message);
        toast.error("Error signing up.", error.message);
        return;
      }
      setFormData({
        ...formData,
        fullName: "",
        email: "",
        password: "",
      })
      toast.info(
        "Sign up successful! Please check your email for confirmation."
      );
    } catch (error) {
      console.error("Error signing up:", error);
      toast.error("Unexpected error signing up. Please try again.");
    }finally{
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="flex flex-col pt-20 justify-center items-center m-auto bg-[#F4F7FA] h-screen">
      <form onSubmit={handleSubmit} className="bg-white p-10 flex flex-col gap-5 rounded-md shadow-md">
        <h1 className="text-3xl font-semibold">Create your own account</h1>
        <div className="flex flex-col gap-1 w-full">
          <label htmlFor="fullName" className="text-sm">FullName</label>
          <input
            type="text"
            id="name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Name"
            disabled={isLoading}
            className="border-2 border-gray-300 rounded-md p-2 text-black placeholder:text-gray-300"
          />
        </div>
        <div className="flex flex-col gap-1 w-full">
          <label htmlFor="email" className="text-sm">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            disabled={isLoading}
            className="border-2 border-gray-300 rounded-md p-2 text-black placeholder:text-gray-300"
          />
        </div>
        <div className="flex flex-col gap-1 w-full">
          <label htmlFor="password" className="text-sm">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            disabled={isLoading}
            className="border-2 border-gray-300 rounded-md p-2 text-black placeholder:text-gray-300"
          />
        </div>
        <button 
            type="submit" 
            disabled={isLoading}
            className="bg-black text-white w-full p-3 rounded-md flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing up...
              </>
            ) : (
              "Sign up"
            )}
          </button>
        <p className="text-sm text-center text-black">
          Already have an accout? <Link to="/signin" className="font-medium">Login</Link>
        </p>
      </form>
      </div>
    </div>
  );
}

export default SignUp;
