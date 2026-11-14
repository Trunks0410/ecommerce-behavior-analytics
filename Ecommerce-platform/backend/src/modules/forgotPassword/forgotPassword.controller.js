import forgotPasswordService from './forgotPassword.service.js';

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    const response = await forgotPasswordService.sendOtp(email);
    return res.status(response.status).json(response);
  } catch (error) {
    console.error('[forgotPasswordController.sendOtp]', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
      return res.status(400).json({ message: 'Email and OTP code are required.' });
    }

    const response = await forgotPasswordService.verifyOtp(email, otp_code);
    return res.status(response.status).json(response);
  } catch (error) {
    console.error('[forgotPasswordController.verifyOtp]', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { reset_token, new_password, confirm_password } = req.body;

    if (!reset_token || !new_password || !confirm_password) {
      return res.status(400).json({
        message: 'reset_token, new_password, and confirm_password are required.',
      });
    }

    const response = await forgotPasswordService.resetPassword(
      reset_token,
      new_password,
      confirm_password
    );
    return res.status(response.status).json(response);
  } catch (error) {
    console.error('[forgotPasswordController.resetPassword]', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const response = await forgotPasswordService.resendOtp(email);
    return res.status(response.status).json(response);
  } catch (error) {
    console.error('[forgotPasswordController.resendOtp]', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export default { sendOtp, verifyOtp, resetPassword, resendOtp };