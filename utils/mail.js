const nodemailer = require('nodemailer');
const Logger = require('./logger');  // Import the logger class
const logger = new Logger();         // Instantiate the logger

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false, // Set to true if using port 465
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
  },
});

const sendMail = async (to, integration_name, subject, htmlContent) => {
  const mailOptions = {
    from: `"${integration_name}" <${process.env.MAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`, 'info'); 
    return info;
  } catch (error) {
    logger.info(`Error sending email: ${error.message}`, 'error');  
    throw new Error('Failed to send email');
  }
};

module.exports = {
  sendMail,
};
