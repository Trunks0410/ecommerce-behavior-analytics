import nodemailer from 'nodemailer';

const createTransporter = () => {
  console.log("Creating email transporter with user:", process.env.MAIL_USER);
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.MAIL_PORT || "587"),
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const sendForgotPasswordOtp = async (toEmail, otpCode) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME || 'Support Team'}" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: 'Your Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="color: #555;">Use the OTP below to reset your password. This code is valid for <strong>5 minutes</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1a73e8; background: #f0f4ff; padding: 16px 32px; border-radius: 8px;">
            ${otpCode}
          </span>
        </div>
        <p style="color: #888; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
};

const sendOtpSecurityAlert = async (toEmail) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME || 'Support Team'}" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: '⚠️ Security Alert: Multiple Failed OTP Attempts',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #ffcccc; border-radius: 8px; background: #fff8f8;">
        <h2 style="color: #d32f2f;">Security Alert</h2>
        <p style="color: #555;">We detected <strong>3 failed OTP attempts</strong> on your account. The OTP function has been <strong>temporarily locked for 15 minutes</strong>.</p>
        <p style="color: #555;">If this was not you, please change your password immediately.</p>
      </div>
    `,
  });
};

const sendRegistrationOtp = async (toEmail, otpCode) => {
  const transporter = createTransporter();

  console.log(`Nodemailer attempting to send to: ${toEmail}`);

  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME || "Support Team"}" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: "Xác thực tài khoản UTEShop",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Chào mừng bạn đến với UTEShop!</h2>
        <p style="color: #555;">Sử dụng mã OTP dưới đây để xác thực tài khoản của bạn. Mã này có hiệu lực trong <strong>15 phút</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1a73e8; background: #f0f4ff; padding: 16px 32px; border-radius: 8px;">
            ${otpCode}
          </span>
        </div>
        <p style="color: #888; font-size: 13px;">Nếu bạn không thực hiện đăng ký tài khoản, vui lòng bỏ qua email này.</p>
      </div>
    `,
  });
};

const sendShipperAccountCreated = async (toEmail, fullName, password) => {
  const transporter = createTransporter();
  console.log(`Nodemailer attempting to send shipper account credentials to: ${toEmail}`);

  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME || "Support Team"}" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: "Thông tin tài khoản Shipper tại UTEShop",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Tài khoản Shipper của bạn đã được tạo!</h2>
        <p style="color: #555;">Chào <strong>${fullName || 'bạn'}</strong>, quản trị viên đã tạo tài khoản Shipper cho bạn tại UTEShop.</p>
        <p style="color: #555;">Dưới đây là thông tin đăng nhập của bạn:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 4px 0; color: #333;"><strong>Email đăng nhập:</strong> ${toEmail}</p>
          <p style="margin: 4px 0; color: #333;"><strong>Mật khẩu đăng nhập:</strong> ${password}</p>
        </div>
        <p style="color: #ff5e3a; font-weight: bold;">Lưu ý: Vui lòng đăng nhập và thay đổi mật khẩu của bạn để đảm bảo an toàn.</p>
      </div>
    `,
  });
};

export { sendForgotPasswordOtp, sendOtpSecurityAlert, sendRegistrationOtp, sendShipperAccountCreated };