const Bull = require('bull');
const nodemailer = require('nodemailer');
const dotenv = require("dotenv");

dotenv.config({
  path: "./.env",
});

// Create a Bull queue
const emailQueue = new Bull('emailQueue');

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
  },
});

// Process the email job
emailQueue.process(async (job) => {
  console.log(`Processing job inside emailQueue: ${JSON.stringify(job.data)}`);
  
  const { to, subject, text } = job.data;
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    if (error.response) {
      console.error(`SMTP error while sending email: ${error.response}`);
    } else {
      console.error('Error sending email:', error);
    }
  }
});

// Log events for the email queue
emailQueue.on('completed', (job) => {
  console.log(`Job completed with result: ${job.returnvalue}`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`Job failed with error: ${err}`);
});

emailQueue.on('waiting', (jobId) => {
  console.log(`Job waiting: ${jobId}`);
});

emailQueue.on('stalled', (jobId) => {
  console.warn(`Job stalled: ${jobId}`);
});

module.exports = emailQueue;
