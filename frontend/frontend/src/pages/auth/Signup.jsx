import React, { useState } from "react";
import { signup as signupApi } from "../../api";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import BusinessIcon from "@mui/icons-material/Business";
import ScienceIcon from "@mui/icons-material/Science";
import { Link, useNavigate } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    lab_name: "",
    email: "",
    contact_no: "",
    password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState({
    first_name: "",
    lab_name: "",
    email: "",
    password: "",
    confirm_password: "",
    common: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "", common: "" }));
  };

  const validateForm = () => {
    const newErrors = {
      first_name: "",
      lab_name: "",
      email: "",
      password: "",
      confirm_password: "",
      common: "",
    };

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.lab_name.trim()) {
      newErrors.lab_name = "Lab name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirm_password.trim()) {
      newErrors.confirm_password = "Please confirm your password";
    } else if (formData.confirm_password !== formData.password) {
      newErrors.confirm_password = "Passwords do not match";
    }

    setErrors(newErrors);

    return (
      !newErrors.first_name &&
      !newErrors.lab_name &&
      !newErrors.email &&
      !newErrors.password &&
      !newErrors.confirm_password
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const response = await signupApi(formData);

      const payload = response.data?.data || {};
      localStorage.setItem("user", JSON.stringify(payload));
      if (payload.token) {
        localStorage.setItem("token", payload.token);
      }
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error.response?.data?.message) {
        setErrors((prev) => ({
          ...prev,
          common: error.response.data.message,
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          common: "Something went wrong. Please try again.",
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const labelClass =
    "block text-[15px] md:text-[17px] font-normal text-black mb-2";

  const inputClass =
    "w-full bg-transparent outline-none border-none text-[14px] md:text-[15px] text-[#585050]/80 placeholder:text-[#585050]/55 pl-2";

  const inputWrapper =
    "relative h-[48px] md:h-[52px] border-[3px] border-white rounded-[8px] shadow-[0_4px_4px_rgba(0,0,0,0.15)] flex items-center pl-[46px] pr-3 bg-white/40";

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Blue Background (60%) */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-[#2562AA] to-[#1e4f8a] flex-col justify-center items-center text-white p-12 relative overflow-hidden">
        {/* Background Pattern and Illustrations */}
        <div className="absolute inset-0">
          {/* Floating Circles with Animation */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full opacity-10 animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full opacity-10 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white rounded-full opacity-10 animate-pulse delay-500"></div>
          
          {/* Laboratory Equipment Illustrations */}
          <svg className="absolute top-20 right-20 w-48 h-48 opacity-20" viewBox="0 0 200 200">
            {/* Microscope */}
            <g transform="translate(150, 50)">
              <rect x="0" y="0" width="4" height="40" fill="white" />
              <rect x="-8" y="35" width="20" height="4" fill="white" />
              <circle cx="2" cy="-5" r="8" fill="none" stroke="white" strokeWidth="2" />
              <rect x="-2" y="40" width="8" height="20" fill="white" />
              <rect x="-6" y="58" width="16" height="3" fill="white" />
            </g>
            {/* Test Tubes */}
            <g transform="translate(30, 100)">
              <rect x="0" y="0" width="6" height="30" rx="3" fill="none" stroke="white" strokeWidth="2" />
              <rect x="10" y="0" width="6" height="30" rx="3" fill="none" stroke="white" strokeWidth="2" />
              <rect x="20" y="0" width="6" height="30" rx="3" fill="none" stroke="white" strokeWidth="2" />
              <rect x="-5" y="30" width="36" height="3" fill="white" />
            </g>
            {/* DNA Helix */}
            <g transform="translate(100, 140)">
              <path d="M0,0 Q10,-5 20,0 T40,0" stroke="white" strokeWidth="2" fill="none" />
              <path d="M0,5 Q10,10 20,5 T40,5" stroke="white" strokeWidth="2" fill="none" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="white" strokeWidth="1" />
              <line x1="20" y1="0" x2="20" y2="5" stroke="white" strokeWidth="1" />
              <line x1="40" y1="0" x2="40" y2="5" stroke="white" strokeWidth="1" />
            </g>
          </svg>
          
          {/* Decorative Flow Lines */}
          <svg className="absolute top-1/3 left-10 w-64 h-32 opacity-15" viewBox="0 0 200 100">
            <path d="M0,50 Q50,20 100,50 T200,50" stroke="white" strokeWidth="2" fill="none" strokeDasharray="5,5" />
            <path d="M0,30 Q50,60 100,30 T200,30" stroke="white" strokeWidth="1" fill="none" strokeDasharray="3,3" />
          </svg>
          
          {/* Grid Pattern */}
          <div className="absolute bottom-0 left-0 w-full h-32 opacity-5">
            <svg width="100%" height="100%" viewBox="0 0 100 32">
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* Abstract Science Shapes */}
          <div className="absolute top-1/4 right-1/6 w-16 h-16 border-2 border-white opacity-20 transform rotate-45"></div>
          <div className="absolute bottom-1/4 left-1/6 w-12 h-12 bg-white opacity-10 transform rotate-12"></div>
          <div className="absolute top-2/3 right-1/3 w-8 h-8 border border-white opacity-15 rounded-full"></div>
          
          {/* Molecule Structure */}
          <svg className="absolute bottom-20 right-32 w-32 h-32 opacity-20" viewBox="0 0 100 100">
            <circle cx="50" cy="30" r="8" fill="white" />
            <circle cx="30" cy="50" r="8" fill="white" />
            <circle cx="70" cy="50" r="8" fill="white" />
            <circle cx="50" cy="70" r="8" fill="white" />
            <line x1="50" y1="30" x2="30" y2="50" stroke="white" strokeWidth="2" />
            <line x1="50" y1="30" x2="70" y2="50" stroke="white" strokeWidth="2" />
            <line x1="30" y1="50" x2="50" y2="70" stroke="white" strokeWidth="2" />
            <line x1="70" y1="50" x2="50" y2="70" stroke="white" strokeWidth="2" />
          </svg>
          
          {/* Laboratory Beaker */}
          <svg className="absolute top-40 left-20 w-24 h-24 opacity-15" viewBox="0 0 80 80">
            <path d="M20,20 L20,50 L30,70 L50,70 L60,50 L60,20" fill="none" stroke="white" strokeWidth="2" />
            <rect x="15" y="15" width="50" height="5" fill="white" />
            <rect x="25" y="55" width="30" height="10" fill="white" opacity="0.3" />
          </svg>
        </div>
        
        <div className="relative z-10 text-center">
          {/* <p className="text-xl mb-8 font-light tracking-wide">Join the Future</p> */}
          
          {/* Logo Section with Enhanced Design */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl scale-110"></div>
              <div className="relative flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-white/20 flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/30">
                  <ScienceIcon sx={{ fontSize: 56, color: "white" }} />
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold mb-6 tracking-tight">LabMate</h1>
          <p className="text-xl opacity-90 max-w-lg mx-auto leading-relaxed mb-8">
            Start your journey with comprehensive laboratory management solutions
          </p>
        </div>
      </div>

      {/* Right Section - White Form (40%) */}
      <div className="flex-1 lg:w-2/5 flex items-center justify-center p-6 lg:p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-[#2562AA] flex items-center justify-center shadow-lg">
                <ScienceIcon sx={{ fontSize: 36, color: "white" }} />
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-800 tracking-tight block">
                  LabMate
                </span>
                <span className="text-sm font-medium text-gray-600 tracking-wide">
                  Automation
                </span>
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
            <p className="text-gray-600">Join our laboratory management platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.common && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm text-center">{errors.common}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* First Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">First Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PersonIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="first_name"
                    placeholder="First name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm"
                  />
                </div>
                {errors.first_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Last Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PersonIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Last name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Lab Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Lab Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BusinessIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="lab_name"
                  placeholder="Enter your laboratory name"
                  value={formData.lab_name}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                />
              </div>
              {errors.lab_name && (
                <p className="text-red-500 text-xs mt-1">{errors.lab_name}</p>
              )}
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Contact Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PhoneIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="contact_no"
                  placeholder="Enter contact number"
                  value={formData.contact_no}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MailIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-9 pr-9 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <VisibilityOffIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <VisibilityIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirm_password"
                  placeholder="Confirm password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="w-full pl-9 pr-9 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <VisibilityOffIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <VisibilityIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-red-500 text-xs mt-1">{errors.confirm_password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#2562AA] hover:bg-[#1e4f8a] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                "Sign Up"
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#2562AA] hover:text-[#1e4f8a] font-semibold transition-colors duration-200"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;