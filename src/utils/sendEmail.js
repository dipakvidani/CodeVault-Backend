import nodemailer from "nodemailer";
import logger from "./logger.js";

const createTransporter = () => {
  // Check if SMTP credentials are configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.error('SMTP credentials not configured');
    throw new Error('Email service not configured');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    logger.info('Attempting to send email', { to, subject });
    
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'CodeVault',
        address: process.env.SMTP_USER
      },
      to,
      subject,
      text,
      html: html || text, // Use HTML if provided, fallback to text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error('Failed to send email', { error: error.message });
    throw new Error('Failed to send email. Please try again later.');
  }
};

export default sendEmail;
