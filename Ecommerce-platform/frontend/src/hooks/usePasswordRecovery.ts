import { useState } from "react";
import { passwordService } from "@/services/passwordService";

export type RecoveryStep = "email" | "otp" | "reset-password" | "success";

export type PasswordRecoveryState = {
  email: string;
  resetToken: string | null;
  currentStep: RecoveryStep;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
};

/**
 * Custom hook for managing password recovery flow
 * Handles three main steps: Send OTP -> Verify OTP -> Reset Password
 */
const usePasswordRecovery = () => {
  const [state, setState] = useState<PasswordRecoveryState>({
    email: "",
    resetToken: null,
    currentStep: "email",
    loading: false,
    error: null,
    successMessage: null,
  });

  const setEmail = (email: string) => {
    setState((prev) => ({ ...prev, email }));
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  const clearSuccess = () => {
    setState((prev) => ({ ...prev, successMessage: null }));
  };

  /**
   * Step 1: Send OTP to email
   */
  const sendOtp = async (email: string) => {
    try {
      clearError();
      setState((prev) => ({
        ...prev,
        loading: true,
        email,
      }));

      const response = await passwordService.sendOtp({ email });

      if (response.data?.status === 200) {
        setState((prev) => ({
          ...prev,
          currentStep: "otp",
          successMessage: response.data.message,
          loading: false,
        }));
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          error: response.data?.message || "Failed to send OTP",
          loading: false,
        }));
        return false;
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send OTP";
      setState((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      return false;
    }
  };

  /**
   * Step 2: Verify OTP
   */
  const verifyOtp = async (otpCode: string) => {
    try {
      clearError();
      setState((prev) => ({ ...prev, loading: true }));

      const response = await passwordService.verifyOtp({
        email: state.email,
        otp_code: otpCode,
      });

      if (response.data?.status === 200 && response.data?.data?.reset_token) {
        setState((prev) => ({
          ...prev,
          currentStep: "reset-password",
          resetToken: response.data.data.reset_token,
          successMessage: response.data.message,
          loading: false,
        }));
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          error: response.data?.message || "Failed to verify OTP",
          loading: false,
        }));
        return false;
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to verify OTP";
      setState((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      return false;
    }
  };

  /**
   * Step 3: Reset Password
   */
  const resetPassword = async (
    newPassword: string,
    confirmPassword: string
  ) => {
    try {
      clearError();
      setState((prev) => ({ ...prev, loading: true }));

      if (!state.resetToken) {
        throw new Error("Reset token not found");
      }

      const response = await passwordService.resetPassword({
        reset_token: state.resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (response.data?.status === 200) {
        setState((prev) => ({
          ...prev,
          currentStep: "success",
          successMessage: response.data.message,
          loading: false,
        }));
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          error: response.data?.message || "Failed to reset password",
          loading: false,
        }));
        return false;
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to reset password";
      setState((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      return false;
    }
  };

  /**
   * Resend OTP to email
   */
  const resendOtp = async () => {
    try {
      clearError();
      setState((prev) => ({ ...prev, loading: true }));

      const response = await passwordService.resendOtp({
        email: state.email,
      });

      if (response.data?.status === 200) {
        setState((prev) => ({
          ...prev,
          successMessage: response.data.message,
          loading: false,
        }));
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          error: response.data?.message || "Failed to resend OTP",
          loading: false,
        }));
        return false;
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to resend OTP";
      setState((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      return false;
    }
  };

  /**
   * Reset the entire recovery flow to start over
   */
  const reset = () => {
    setState({
      email: "",
      resetToken: null,
      currentStep: "email",
      loading: false,
      error: null,
      successMessage: null,
    });
  };

  return {
    ...state,
    setEmail,
    sendOtp,
    verifyOtp,
    resetPassword,
    resendOtp,
    reset,
    clearError,
    clearSuccess,
  };
};

export default usePasswordRecovery;
