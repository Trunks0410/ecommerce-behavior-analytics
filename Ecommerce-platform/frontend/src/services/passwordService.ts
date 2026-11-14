import { axiosClient } from "@/shared/api/axiosClient";

// Type definitions for password recovery flow
export type SendOtpFormData = {
  email: string;
};

export type VerifyOtpFormData = {
  email: string;
  otp_code: string;
};

export type ResetPasswordFormData = {
  reset_token: string;
  new_password: string;
  confirm_password: string;
};

export type ResendOtpFormData = {
  email: string;
};

// API Response types
export type SendOtpResponse = {
  status: number;
  message: string;
  data?: any;
};

export type VerifyOtpResponse = {
  status: number;
  message: string;
  data?: {
    reset_token: string;
  };
};

export type ResetPasswordResponse = {
  status: number;
  message: string;
  data?: any;
};

/**
 * Password Service
 * Handles all password recovery and OTP-related API calls
 */
export const passwordService = {
  /**
   * Send OTP to user's email
   * @param data - { email: string }
   * @returns Promise with OTP send confirmation
   */
  sendOtp: (data: SendOtpFormData) =>
    axiosClient.post<SendOtpResponse>("/auth/forgot-password/send-otp", data),

  /**
   * Verify OTP code sent to user's email
   * @param data - { email: string, otp_code: string }
   * @returns Promise with reset_token if successful
   */
  verifyOtp: (data: VerifyOtpFormData) =>
    axiosClient.post<VerifyOtpResponse>(
      "/auth/forgot-password/verify-otp",
      data
    ),

  /**
   * Reset password using reset token
   * @param data - { reset_token: string, new_password: string, confirm_password: string }
   * @returns Promise with password reset confirmation
   */
  resetPassword: (data: ResetPasswordFormData) =>
    axiosClient.post<ResetPasswordResponse>(
      "/auth/forgot-password/reset-password",
      data
    ),

  /**
   * Resend OTP to user's email
   * @param data - { email: string }
   * @returns Promise with OTP resend confirmation
   */
  resendOtp: (data: ResendOtpFormData) =>
    axiosClient.post<SendOtpResponse>(
      "/auth/forgot-password/resend-otp",
      data
    ),
};
