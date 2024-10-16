const Queue = require('bull');
const MailService = require('../services/MailService');

const emailQueue = new Queue('email-queue');
const mailService = new MailService();

emailQueue.process(async (job) => {
    console.log('Processing job inside emailQueueWorker:');
    const {order, companyPersonalizedMessages, eventType} = job.data;
    
    try {
        mailService.sendEmail(order, companyPersonalizedMessages, eventType);
    } catch (err) {
        console.error(`Failed to send email to ${email}:`, err);
        throw err;
    }
});

// Event listeners
emailQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed with result ${result}`);
});

emailQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error ${err}`);
});
