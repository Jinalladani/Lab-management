import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MailIcon from "@mui/icons-material/Mail";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import RefreshIcon from "@mui/icons-material/Refresh";
import ScienceIcon from "@mui/icons-material/Science";

const EMAIL_KEY = "email_verify_email";
const OTP_KEY = "email_verify_otp";
const VERIFIED_KEY = "email_verified";
const VERIFIED_EMAIL_KEY = "email_verified_email";

function isValidOtp(otp) {
  return /^[0-9]{6}$/.test(String(otp || ""));
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const VerifyEmail = () => {
  const navigate = useNavigate();
  const inputRefs = useRef([]);

  const storedEmail = useMemo(
    () => localStorage.getItem(EMAIL_KEY) || "",
    []
  );
  const storedOtp = useMemo(
    () => localStorage.getItem(OTP_KEY) || "",
    []
  );

  const [digits, setDigits] = useState(Array(6).fill(""));
  const [errors, setErrors] = useState({ otp: "", common: "" });
  const [loading, setLoading] = useState(false);

  const otpValue = digits.join("");

  const focusInput = (idx) => {
    const el = inputRefs.current[idx];
    if (el) el.focus();
  };

  const setDigitAndMaybeAdvance = (idx, digitChar) => {
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = digitChar;
      return next;
    });
    if (digitChar && idx < 5) focusInput(idx + 1);
  };

  const sanitizeDigits = (value) => String(value || "").replace(/\D/g, "");

  const validateForm = () => {
    const newErrors = { otp: "", common: "" };
    if (!otpValue) newErrors.otp = "OTP is required";
    else if (!isValidOtp(otpValue)) newErrors.otp = "OTP must be 6 digits";
    setErrors(newErrors);
    return !newErrors.otp;
  };

  const handleDigitPaste = (startIdx, e) => {
    e.preventDefault();
    const pasted = sanitizeDigits(e.clipboardData.getData("text"));
    if (!pasted) return;

    const chars = pasted.split("").slice(0, 6 - startIdx);
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((ch, i) => {
        next[startIdx + i] = ch;
      });
      return next;
    });

    const nextIdx = Math.min(5, startIdx + chars.length - 1);
    focusInput(nextIdx);
  };

  const handleDigitChange = (idx, rawValue) => {
    const onlyDigits = sanitizeDigits(rawValue);
    const digitChar = onlyDigits.charAt(0);

    if (!digitChar) {
      setDigits((prev) => {
        const next = [...prev];
        next[idx] = "";
        return next;
      });
      return;
    }

    setErrors((prev) => ({ ...prev, otp: "", common: "" }));
    setDigitAndMaybeAdvance(idx, digitChar);
  };

  const handleDigitKeyDown = (idx, e) => {
    const allowedControlKeys = [
      "Backspace",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Delete",
    ];
    const isDigitKey = /^[0-9]$/.test(e.key);

    if (!isDigitKey && !allowedControlKeys.includes(e.key)) {
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      setDigits((prev) => {
        const next = [...prev];
        if (next[idx]) {
          next[idx] = "";
          return next;
        }
        if (idx > 0) next[idx - 1] = "";
        return next;
      });
      if (!digits[idx] && idx > 0) focusInput(idx - 1);
      return;
    }

    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      focusInput(idx - 1);
      return;
    }

    if (e.key === "ArrowRight" && idx < 5) {
      e.preventDefault();
      focusInput(idx + 1);
      return;
    }
  };

  useEffect(() => {
    if (!localStorage.getItem(EMAIL_KEY)) {
      navigate("/login", { replace: true });
      return;
    }

    // Prefocus first box for better UX.
    setTimeout(() => focusInput(0), 0);
  }, [navigate]);

  const handleResend = () => {
    const otp = generateOtp();
    localStorage.setItem(OTP_KEY, otp);
    setDigits(Array(6).fill(""));
    setErrors({ otp: "", common: "OTP regenerated. Please verify again." });
    setTimeout(() => focusInput(0), 0);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const expectedOtp = localStorage.getItem(OTP_KEY) || "";
      if (otpValue !== expectedOtp) {
        setErrors({ otp: "Invalid OTP. Please try again.", common: "" });
        return;
      }

      localStorage.setItem(VERIFIED_KEY, "true");
      localStorage.setItem(VERIFIED_EMAIL_KEY, storedEmail);
      localStorage.removeItem(OTP_KEY);
      setDigits(Array(6).fill(""));

      navigate("/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const demoOtp =
    process.env.NODE_ENV !== "production" ? storedOtp : null;

  const labelClass =
    "block text-[15px] md:text-[17px] font-normal text-black mb-2";

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
          <p className="text-xl mb-8 font-light tracking-wide">Verify Email</p>
          
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
            Confirm your email address to secure your laboratory management account
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
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
            <p className="text-gray-600">Enter the 6-digit code</p>
          </div>

          <div className="w-full text-center text-sm text-gray-600 mb-6">
            <MailIcon className="h-4 w-4 mr-1 inline" />
            Enter OTP sent to <span className="font-bold">{storedEmail}</span>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            {errors.common && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm text-center">{errors.common}</p>
              </div>
            )}

            {/* OTP Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Enter OTP</label>
              <div className="flex items-center justify-center gap-2">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    placeholder=""
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    onPaste={(e) => handleDigitPaste(idx, e)}
                    aria-label={`OTP digit ${idx + 1}`}
                    className="w-12 h-12 text-center border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:border-transparent text-lg font-bold text-gray-900 placeholder-gray-400"
                  />
                ))}
              </div>
              {errors.otp && (
                <p className="text-red-500 text-xs mt-1 text-center">{errors.otp}</p>
              )}
            </div>

            {/* Demo OTP */}
            {demoOtp && (
              <div className="text-center text-sm text-blue-600 -mt-2">
                Demo OTP: <span className="font-bold">{demoOtp}</span>
              </div>
            )}

            {/* Info Message */}
            <div className="flex items-center gap-2 text-gray-600 text-sm p-3 bg-blue-50 rounded-lg">
              <VerifiedUserIcon className="h-4 w-4 text-blue-600" />
              <span>Confirm your email to continue.</span>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleResend}
                className="flex-1 py-3 px-4 bg-white border border-gray-300 text-[#2562AA] font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RefreshIcon className="h-4 w-4" />
                Resend
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-[#2562AA] hover:bg-[#1e4f8a] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2562AA] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  "Verify"
                )}
              </button>
            </div>

            {/* Back to Login */}
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="w-full py-3 px-4 bg-white border border-gray-300 text-[#2562AA] font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

