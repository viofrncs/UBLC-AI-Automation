const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendReservationEmail = async (to, bookData) => {
  const msg = {
    to,
    from: process.env.EMAIL_FROM,
    subject: `📚 Book Reservation Confirmed - ${bookData.title}`,
    text: `
Hello ${bookData.studentName}!

Your book reservation has been confirmed.

Reservation Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reservation ID: ${bookData.reservationId}
Book Title: ${bookData.title}
Author: ${bookData.author || 'N/A'}
Location: ${bookData.location || 'Library'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please pick up your book at the library circulation desk within 3 days.
Bring your student ID and this reservation ID.

Library Hours: Monday - Friday, 8:00 AM - 5:00 PM

Thank you for using UBLC Library Services!

University of Batangas Lipa Campus
Library Services Department
    `,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #8B0000; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #8B0000; }
    .warning { background-color: #fff3cd; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .highlight { color: #8B0000; font-weight: bold; }
    h1 { margin: 0; font-size: 24px; }
    h3 { color: #8B0000; margin-top: 0; }
    ul { line-height: 2; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 Book Reservation Confirmed</h1>
      <p style="margin: 10px 0 0 0;">University of Batangas Lipa Campus</p>
    </div>
    
    <div class="content">
      <p>Hello <strong>${bookData.studentName}</strong>!</p>
      
      <p>Your book reservation has been <span class="highlight">successfully confirmed</span>.</p>
      
      <div class="details">
        <h3>📖 Reservation Details</h3>
        <p><strong>Reservation ID:</strong> ${bookData.reservationId}</p>
        <p><strong>Book Title:</strong> ${bookData.title}</p>
        <p><strong>Author:</strong> ${bookData.author || 'N/A'}</p>
        <p><strong>Location:</strong> ${bookData.location || 'Library'}</p>
      </div>
      
      <div class="warning">
        <h3>⏰ Important</h3>
        <p>Please pick up your book at the library circulation desk <strong>within 3 days</strong>.</p>
      </div>
      
      <h3>📍 Next Steps:</h3>
      <ul>
        <li>Visit the library circulation desk</li>
        <li>Bring your <strong>student ID</strong></li>
        <li>Present this <strong>reservation ID</strong></li>
      </ul>
      
      <p><strong>Library Hours:</strong><br>
      Monday - Friday: 8:00 AM - 5:00 PM</p>
    </div>
    
    <div class="footer">
      <p>University of Batangas Lipa Campus<br>
      Library Services Department<br>
      <em>Committed to Academic Excellence</em></p>
    </div>
  </div>
</body>
</html>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error('❌ SendGrid error:', error.response ? error.response.body : error.message);
    throw error;
  }
};

module.exports = { sendReservationEmail };