'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');

/**
 * Handles incoming contact form submissions from the landing page.
 * POST /api/contact
 */
exports.submitContactForm = async (req, res, next) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and message are required fields.'
      });
    }

    if (!env.smtpUser || !env.smtpPass) {
      console.error('[ContactController] SMTP_USER or SMTP_PASS is missing in .env file.');
      return res.status(500).json({
        success: false,
        error: 'Email service is not configured on the server.'
      });
    }

    // Configure the Nodemailer transporter explicitly for Gmail with timeouts
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    // Format the email
    const mailOptions = {
      from: `"${name}" <${env.smtpUser}>`, // Must send from the authenticated user to avoid spam filters
      replyTo: email,
      to: env.smtpUser, // Send the message to yourself
      subject: `New Contact Us Message from ${name}`,
      text: `You have received a new message from the CareerIQ AI Contact Form.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #005ed0; margin-top: 0;">New Contact Form Submission</h2>
          <p>You have received a new message from the <strong>CareerIQ AI</strong> landing page.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Message:</strong></p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 5px; white-space: pre-wrap; color: #333;">${message}</div>
        </div>
      `
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully!'
    });

  } catch (error) {
    console.error('[ContactController] Error sending email:', error);
    return res.status(500).json({
      success: false,
      error: `Failed to send the message: ${error.message}`
    });
  }
};
