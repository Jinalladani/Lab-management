import React, { useState } from "react";
import { login as loginApi } from "../../api";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ScienceIcon from "@mui/icons-material/Science";
import { useNavigate } from "react-router-dom";
import LoginImage from "../../assets/business-discussion.png";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
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
      email: "",
      password: "",
      common: "",
    };

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

    setErrors(newErrors);

    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const response = await loginApi(formData);

      const data = response.data?.data || {};
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data));
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

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Blue Background (60%) */}
      {/* Left Section */}
      <div className="hidden lg:flex lg:w-3/5 items-center justify-center bg-white">

        <div className="flex flex-col items-center justify-center text-center max-w-2xl px-10">

          <h6 className="text-3xl font-extrabold text-[#243744] leading-tight">
            LAB MANAGEMENT SYSTEM
          </h6>

          <p className="mt-6 text-lg text-gray-500 leading-8">
            Streamline laboratory workflows with a secure and intelligent
            laboratory management platform.
          </p>

          <img
            src={LoginImage}
            alt="LabMate"
            className="max-w-[80%] max-h-[80vh] object-contain"
          />

        </div>

      </div>

      {/* Right Section */}
      <div className="flex-1 lg:w-2/5 flex items-center justify-center p-6 lg:p-8 bg-[#243744]">
        <div className="w-full max-w-sm">

          {/* Mobile Logo */}
          <div className="flex lg:hidden justify-center mb-8">
            {/* <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-[#032068] flex items-center justify-center shadow-lg">
          <ScienceIcon sx={{ fontSize: 36, color: "white" }} />
        </div>

        <div>
          <span className="text-2xl font-bold text-white block">
            LabMate
          </span>
          <span className="text-sm text-gray-300">
            Automation
          </span>
        </div>
      </div> */}
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome Back!
            </h2>

            <p className="text-gray-300">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {errors.common && (
              <div className="bg-red-500/10 border border-red-500 rounded-xl p-3">
                <p className="text-red-300 text-sm text-center">
                  {errors.common}
                </p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>

              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-[#324552] border border-[#506575] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
                />
              </div>

              {errors.email && (
                <p className="text-red-400 text-xs mt-2">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>

              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 bg-[#324552] border border-[#506575] rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <VisibilityOffIcon />
                  ) : (
                    <VisibilityIcon />
                  )}
                </button>
              </div>

              {errors.password && (
                <p className="text-red-400 text-xs mt-2">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <a
                href="/forgot-password"
                className="text-sm text-blue-300 hover:text-blue-200"
              >
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white hover:bg-[#243744] hover:border border-white hover:text-white text-[#243744] font-semibold transition duration-300 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex justify-center items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.96 7.96 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"
                    />
                  </svg>

                  Signing In...
                </span>
              ) : (
                "Sign In"
              )}
            </button>

          </form>

          {/* Signup */}
          {/* <div className="mt-8 text-center">
      <p className="text-gray-300">
        Don't have an account?{" "}
        <a
          href="/signup"
          className="text-blue-300 hover:text-blue-200 font-semibold"
        >
          Sign Up
        </a>
      </p>
    </div> */}

        </div>
      </div>
    </div>
  );
};

export default Login;