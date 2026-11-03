const nodemailer = require('nodemailer');

const sendTicketEmail = async (userEmail, userName, bookingDetails, pdfBuffer) => {
  try {
    // Check if SMTP user and password are provided
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials missing from environment. Skipping email dispatch.');
      return false;
    }

    // Configure transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: `"PayanamX" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Simulated reservation: PNR ${bookingDetails.pnr}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #312e81, #4c1d95); color: #fff; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Sample reservation confirmed</h1>
            <p style="margin: 5px 0 0; font-size: 14px;">PayanamX · simulated project booking</p>
          </div>
          <div style="padding: 20px;">
            <p>Dear <strong>${userName}</strong>,</p>
            <p>Your simulated reservation is recorded. The attached project PDF is not issued by Indian Railways or IRCTC and is not valid for travel.</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #C51E3A;">Journey Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; font-weight: bold; width: 40%;">PNR Number:</td>
                  <td style="padding: 5px 0;">${bookingDetails.pnr}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">Train Number & Name:</td>
                  <td style="padding: 5px 0;">${bookingDetails.trainNumber} - ${bookingDetails.trainName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">Date of Journey:</td>
                  <td style="padding: 5px 0;">${bookingDetails.date}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">From:</td>
                  <td style="padding: 5px 0;">${bookingDetails.fromStation}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">To:</td>
                  <td style="padding: 5px 0;">${bookingDetails.toStation}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">Passengers:</td>
                  <td style="padding: 5px 0;">${bookingDetails.passengers.join(', ')}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 13px; color: #666;">
              Train data, PNR, seat availability, payment and this reservation are simulated sample information.
            </p>
          </div>
          <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e5e7eb;">
            This is an automated transactional email. Please do not reply directly to this address.
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Ticket_PNR_${bookingDetails.pnr}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Nodemailer SMTP Error: Failed to send email.', error.message);
    return false; // Fail silently so checkout is not blocked
  }
};

module.exports = { sendTicketEmail };

