const transporter = require('../config/nodemailer');

const generateOTP = () => {
  return Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit OTP
};

const sendOTP = async (email, name, otp) => {
  const mailOptions = {
    from: `"FreelanceHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your FreelanceHub Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">FreelanceHub</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">Your Professional Freelance Platform</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 10px;">Hello, ${name}!</h2>
          <p style="color: #666; margin-bottom: 25px;">Use the verification code below to complete your registration:</p>
          <div style="background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; display: inline-block; margin-bottom: 25px;">
            <span style="font-size: 40px; font-weight: bold; letter-spacing: 10px; color: #667eea;">${otp}</span>
          </div>
          <p style="color: #999; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      </body>
      </html>
    `
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { generateOTP, sendOTP };