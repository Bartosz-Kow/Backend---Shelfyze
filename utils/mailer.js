const nodemailer = require("nodemailer");

async function createTransporter() {
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  // 🔍 Test połączenia
  transporter.verify((err, success) => {
    if (err) {
      console.error("❌ SMTP verify error:", err);
    } else {
      console.log("✅ SMTP connection OK, transporter ready!");
    }
  });

  return transporter;
}

module.exports = createTransporter;
