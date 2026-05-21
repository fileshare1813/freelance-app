const transporter = require('../config/nodemailer');

// ── Registration OTP ──────────────────────────────────────────────────────────

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

// ── Warning Email (unverified users — midnight cron) ──────────────────────────
/**
 * @param {string} email
 * @param {string} name
 * @param {string} otp        - 5-digit OTP
 * @param {string} verifyUrl  - full URL: /auth/verify-account?token=xxx&email=yyy
 */
const sendVerificationWarning = async (email, name, otp, verifyUrl) => {
  const mailOptions = {
    from: `"FreelanceHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '⚠️ Last Warning: Verify Your FreelanceHub Account — 24 hrs left',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:28px 24px;text-align:center;">
    <div style="font-size:2rem;margin-bottom:6px;">⚡</div>
    <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:800;">FreelanceHub</h1>
    <p style="color:rgba(255,255,255,0.85);margin:5px 0 0;font-size:0.9rem;">Account Verification — Last Warning</p>
  </div>

  <!-- Warning strip -->
  <div style="background:#fef2f2;border-left:5px solid #ef4444;padding:14px 24px;">
    <p style="color:#991b1b;font-weight:700;margin:0;font-size:0.92rem;">
      ⚠️ &nbsp;Yeh aapka pehla aur aakhri warning hai!
    </p>
    <p style="color:#dc2626;margin:5px 0 0;font-size:0.85rem;">
      Agar aap <strong>24 ghante</strong> ke andar verify nahi karte, aapka account <strong>permanently ban</strong> ho jayega.
    </p>
  </div>

  <!-- Card -->
  <div style="max-width:500px;margin:24px auto;padding:0 16px;">
    <div style="background:#fff;border-radius:16px;padding:30px 26px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

      <h2 style="color:#1a1a2e;font-size:1.15rem;font-weight:700;margin:0 0 8px;">Hello, ${name}! 👋</h2>
      <p style="color:#64748b;font-size:0.88rem;margin:0 0 22px;line-height:1.6;">
        Aapne FreelanceHub par register kiya tha lekin email verify nahi kiya.
        Neeche OTP ya button se abhi verify karein.
      </p>

      <!-- OTP -->
      <div style="text-align:center;margin-bottom:22px;">
        <p style="color:#64748b;font-size:0.82rem;margin:0 0 8px;font-weight:600;">Aapka Verification OTP:</p>
        <div style="display:inline-block;background:#fff;border:2px dashed #6c63ff;border-radius:10px;padding:16px 28px;">
          <span style="font-size:2.2rem;font-weight:900;letter-spacing:10px;color:#6c63ff;">${otp}</span>
        </div>
        <p style="color:#94a3b8;font-size:0.75rem;margin:7px 0 0;">Valid for <strong>24 hours</strong></p>
      </div>

      <!-- Divider -->
      <div style="text-align:center;color:#94a3b8;font-size:0.8rem;margin-bottom:18px;">— ya direct link se verify karein —</div>

      <!-- Button -->
      <div style="text-align:center;margin-bottom:22px;">
        <a href="${verifyUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#764ba2);color:#fff;
                  text-decoration:none;padding:13px 32px;border-radius:10px;font-weight:700;font-size:0.95rem;
                  box-shadow:0 4px 12px rgba(108,99,255,0.3);">
          ✅ &nbsp;Abhi Verify Karein
        </a>
      </div>

      <!-- Warning box -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:13px 15px;margin-bottom:14px;">
        <p style="color:#92400e;font-size:0.82rem;margin:0;font-weight:600;">🕐 &nbsp;Samay seema:</p>
        <ul style="color:#92400e;font-size:0.8rem;margin:5px 0 0;padding-left:16px;line-height:1.8;">
          <li>OTP aur link <strong>24 ghante</strong> me expire hoga</li>
          <li>Iske baad account <strong>automatically ban</strong> hoga</li>
          <li>Ban hone ke baad login nahi kar payenge</li>
        </ul>
      </div>

      <!-- Steps -->
      <div style="background:#f0f4ff;border-radius:10px;padding:14px 16px;">
        <p style="color:#374151;font-size:0.82rem;font-weight:700;margin:0 0 8px;">Steps:</p>
        <p style="color:#64748b;font-size:0.8rem;margin:0 0 4px;">1. Upar button click karein ya site par jayein</p>
        <p style="color:#64748b;font-size:0.8rem;margin:0 0 4px;">2. OTP enter karein: <strong style="color:#6c63ff;">${otp}</strong></p>
        <p style="color:#64748b;font-size:0.8rem;margin:0;">3. ✅ Done — login kar paayenge</p>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:18px 0;color:#94a3b8;font-size:0.75rem;line-height:1.6;">
      <p style="margin:0;">Agar aapne register nahi kiya, is email ko ignore karein.</p>
      <p style="margin:4px 0 0;">Support: <a href="mailto:support@freelancehub.com" style="color:#6c63ff;">support@freelancehub.com</a></p>
      <p style="margin:6px 0 0;">© ${new Date().getFullYear()} FreelanceHub</p>
    </div>
  </div>

</body>
</html>`
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { generateOTP, sendOTP, sendVerificationWarning };
