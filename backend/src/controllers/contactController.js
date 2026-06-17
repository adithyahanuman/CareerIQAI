'use strict';

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

    if (!env.resendApiKey) {
      console.error('[ContactController] RESEND_API_KEY is missing in .env file.');
      return res.status(500).json({
        success: false,
        error: 'Email service is not configured on the server (Missing Resend API Key).'
      });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #005ed0; margin-top: 0;">New Contact Form Submission</h2>
        <p>You have received a new message from the <strong>CareerIQ AI</strong> landing page.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Message:</strong></p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 5px; white-space: pre-wrap; color: #333;">${message}</div>
      </div>
    `;

    // The email you want to receive the messages at. 
    // IMPORTANT: On Resend's free tier, this MUST be the email address you used to register for Resend!
    const toEmail = env.contactEmailTo || env.smtpUser || 'careeriqai.admin@gmail.com';

    // Call Resend's HTTP API directly (bypasses Render's SMTP blocks)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CareerIQ AI <onboarding@resend.dev>', // Free tier must use onboarding@resend.dev
        to: [toEmail],
        reply_to: email, // If you click "reply" in your inbox, it goes to the user who filled the form
        subject: `New Contact Us Message from ${name}`,
        html: htmlContent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Resend API returned an error');
    }

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully!'
    });

  } catch (error) {
    console.error('[ContactController] Error sending email via Resend:', error);
    return res.status(500).json({
      success: false,
      error: `Failed to send the message: ${error.message}`
    });
  }
};
