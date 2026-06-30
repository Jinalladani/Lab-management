import api from "./axios";

export const login = (payload) => api.post("/auth/login", payload);
export const signup = (payload) => api.post("/auth/signup", payload);
export const logout = () => api.post("/auth/logout");
export const getMe = () => api.get("/auth/me");
export const forgotPasswordRequest = (email) =>
  api.post("/auth/forgot-password/request", { email });
export const forgotPasswordVerify = (email, otp) =>
  api.post("/auth/forgot-password/verify", { email, otp });
export const forgotPasswordReset = (email, otp, password) =>
  api.post("/auth/forgot-password/reset", { email, otp, password });
