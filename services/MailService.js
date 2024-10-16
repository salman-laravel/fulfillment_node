const mailer = require('../utils/mail');
const ejs = require('ejs');
const path = require('path');
const CustomerRepository = require("../repositories/CustomerRepository");
const ASChargeRepository = require("../repositories/ASChargeRepository");
const CarrierRepository = require("../repositories/CarrierRepository");
const Logger = require("../utils/logger");

let asChargeRepository = new ASChargeRepository();
let customerRepository = new CustomerRepository();
let carrierRepository = new CarrierRepository();
const logger = new Logger();
let order, company, eventType, carrier, orderNumber, customer, recipientName, recipientEmail, recipientPhone, integrationName, companyCode = null;

class MailService {

  async sendEmail(order, company, eventType) {
    try {
      this.order = order;
      this.company = company;
      this.eventType = eventType;

      await this.createPayload(this.order);
      console.log('Order confirmation email sent successfully');
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
    }
  };

  async createPayload(order) {
    this.companyCode = order.company_code;

    if (!order.shipping_address.email) {
      return; // Exit if no email present
    }

    this.recipientName = order.shipping_address.name;
    this.recipientEmail = order.shipping_address.email;
    this.recipientPhone = order.shipping_address.phone || '';
    this.integrationName = this.company.integration_name;

    this.carrier = await carrierRepository.getCarrier(this.order.order_code);
    this.orderNumber = order.order_number;
    this.customer = await this.findCustomer(order.customer_code);

    const additionalServices = order.templateAdditionalServices;

    if (additionalServices) {
      for (const service of additionalServices) {
        const serviceDetail = await asChargeRepository.asCharge(service);
        if (serviceDetail && serviceDetail.notification_type === 'EMAIL') {
          if (serviceDetail.is_personalized == 1) {
            await this.sendPersonalizedEmailNotification();
          }
        }
      }
    }

  }

  async findCustomer(customerCode) {
    const customerModel = customerRepository.findCustomer(customerCode)

    if (!customerModel) {
      const splitName = this.recipientName.split(' ');
      const firstName = splitName[0];
      const lastName = splitName.length > 1 ? splitName[1] : '';

      const customerPayload = {
        customer_code: generateHash(),
        first_name: firstName,
        last_name: lastName,
        email: recipientEmail,
        phone: recipientPhone,
        company_code: companyCode
      };

      customerModel = await customerRepository.createCustomer(customerPayload);
    }

    return customerModel;
  }

  async sendPersonalizedEmailNotification() {
    if (this.company.personalizedMessageCount < 1) {
      return;
    }


    const mailContent = this.prepareMessage(this.company.message_content);
    const subject = this.prepareMessage(this.company.subject);

    const bcc = this.company.bcc;
    const templateData = {
      mailContent,
    };

    const templatePath = path.join(__dirname, '../views/customer-message.ejs');
    const htmlContent = await ejs.renderFile(templatePath, templateData);

    await mailer.sendMail(this.customer.email, this.integrationName, subject, htmlContent);

  }

  prepareMessage(messageTemplate) {
    let messageText = messageTemplate;
    const search = [
      '{{company_name}}',
      '{{receiver_name}}',
      '{{order_number}}',
      '{{carrier}}',
    ];

    const replace = [
      this.company.company_name,
      this.recipientName,
      this.order.order_number,
      this.carrier.carrier_name,
    ];

    search.forEach((item, index) => {
      messageText = messageText.replace(item, replace[index]);
    });

    return messageText;
  }

}
module.exports = MailService;