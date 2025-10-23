// Vercel Serverless Function: /api/send-email.js
// Handles contact form submissions and sends emails via Resend.

import { Resend } from 'resend';

// Initialize Resend with the API key from your Vercel environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

// IMPORTANT: Configure these in Vercel Environment Variables
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || '00Agent Leads <leads@yourdomain.com>'; // Replace with your verified sender
const TO_EMAIL = process.env.RESEND_TO_EMAIL || 'your-receiving-email@example.com'; // Replace with where you want to receive leads

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { name, email, phone, website, "company-size": companySize, "help-message": message } = req.body;

        // --- Validation ---
        if (!email && !phone) {
            return res.status(400).json({ error: 'Either email or phone number is required.' });
        }
         if (!website) {
             return res.status(400).json({ error: 'Website URL is required.' });
         }
         // Add other required field checks if necessary

         if (!process.env.RESEND_API_KEY) {
             console.error('RESEND_API_KEY environment variable not set.');
            return res.status(500).json({ error: 'Email service is not configured on the server.' });
         }
          if (!process.env.RESEND_FROM_EMAIL || !process.env.RESEND_TO_EMAIL) {
             console.error('RESEND_FROM_EMAIL or RESEND_TO_EMAIL environment variable not set.');
            return res.status(500).json({ error: 'Email sender/recipient is not configured on the server.' });
         }


        // Send the email using Resend
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [TO_EMAIL], // Must be an array
            subject: 'New Lead from 00Agent.io Website', // Updated subject
            html: `
                <h3>New Lead from 00Agent.io</h3>
                <p><strong>Full Name:</strong> ${name || 'Not provided'}</p>
                <p><strong>Email:</strong> ${email || 'Not provided'}</p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                <p><strong>Website URL:</strong> ${website}</p>
                <p><strong>Company Size:</strong> ${companySize || 'Not selected'}</p>
                <p><strong>Message:</strong> ${message || 'No message provided.'}</p>
            `,
        });

        if (error) {
            console.error('Resend API Error:', error);
            // Provide a more generic error to the client
            return res.status(400).json({ error: 'Failed to send message. Please try again later.' }); 
        }

        // Success
        res.status(200).json({ success: true, message: 'Email sent successfully!' });

    } catch (error) {
        console.error('Serverless function execution error:', error);
        res.status(500).json({ error: 'An internal server error occurred while sending the email.' });
    }
}
