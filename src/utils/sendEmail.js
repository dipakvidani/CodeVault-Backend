import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, text }) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // or your SMTP provider
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: '"CodeVault" <no-reply@codevault.com>',
    to,
    subject,
    text,
  });
};

export default sendEmail;
