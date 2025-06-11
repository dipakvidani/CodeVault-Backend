import nodemailer from "nodemailer";
import logger from "./logger.js";

const createTransporter = () => {
  // Check if SMTP credentials are configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.error('SMTP credentials not configured', {
      hasUser: !!process.env.SMTP_USER,
      hasPass: !!process.env.SMTP_PASS
    });
    throw new Error('Email service not configured. Please check your environment variables.');
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // Only use this in development
      }
    });

    // Verify transporter configuration
    return new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          logger.error('SMTP configuration error', { error: error.message });
          reject(new Error('Failed to configure email service. Please check your SMTP settings.'));
        } else {
          logger.info('SMTP configuration verified successfully');
          resolve(transporter);
        }
      });
    });
  } catch (error) {
    logger.error('Failed to create email transporter', { error: error.message });
    throw new Error('Failed to initialize email service. Please try again later.');
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    logger.info('Attempting to send email', { 
      to, 
      subject,
      hasHtml: !!html
    });
    
    const transporter = await createTransporter();
    
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
    logger.info('Email sent successfully', { 
      messageId: info.messageId,
      to: info.accepted,
      rejected: info.rejected
    });
    return info;
  } catch (error) {
    logger.error('Failed to send email', { 
      error: error.message,
      code: error.code,
      command: error.command
    });
    
    // Provide more specific error messages based on the error type
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check your SMTP credentials.');
    } else if (error.code === 'ESOCKET') {
      throw new Error('Failed to connect to email server. Please check your internet connection.');
    } else {
      throw new Error('Failed to send email. Please try again later.');
    }
  }
};

export default sendEmail;
