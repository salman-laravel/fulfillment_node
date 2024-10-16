const FulFillmentRepository = require("../repositories/FulFillmentRepository");
const EventRepository = require("../repositories/EventRepository");
const SalesInvoiceEntity = require("../entity/SalesInvoiceEntity");
const InvoiceRepository = require("../repositories/InvoiceRepository");
const CountryRepository = require('../repositories/CountryReposiotry');
const OrderRepository = require('../repositories/OrderRepository');
const Queue = require('bull');
const MailService = require("./MailService");
const Logger = require("../utils/logger");
const { array } = require("joi");

// Create a new queue
let repository = new FulFillmentRepository();
let eventRepository = new EventRepository();
let invoiceRepository = new InvoiceRepository();
let countryReposiotry = new CountryRepository();
let orderRepository = new OrderRepository();
const mailService = new MailService();
const logger = new Logger();

class FulFillmentService {
  async create(data, orderCode, fulfillmentType) {
    const lineItemCodes = data.fulfillments.map(item => item.line_item_code);
    const fulfillments = data.fulfillments;
    const lineItemsValidated = await this.checkIdsExist(lineItemCodes);

    if (!lineItemsValidated) {
      throw new Error("Line items not found.");
    }

    const order = await orderRepository.getOrder(orderCode);
    if (order) {
      const companyCode = order.company_code;
      const customerCountryCode = order.customerCountryCode;
      const orderDeliveryTemplateAdditionalServices = order.templateAdditionalServices;

      if (companyCode && customerCountryCode && orderDeliveryTemplateAdditionalServices.length > 0) {

        //getting company personalized email
        const companyPersonalizedMessages = await repository.getCompanyPersonalizedMessages(companyCode, customerCountryCode);
        
        for (const additionalService of orderDeliveryTemplateAdditionalServices) {
          const checkPersonalizeEmailAsCharges = await repository.getPersnoalizeEmailAsCharges(additionalService);
          
          if (checkPersonalizeEmailAsCharges.length > 0 && checkPersonalizeEmailAsCharges.additional_service_code == process.env.PERSONALIZED_EMAIL_VAL) {
            if (companyPersonalizedMessages.personalizedMessageCount == 0) {
              const country = await countryReposiotry.getCountryByCountryCode(order.customer_country_code)
              throw new Error("Tracking email is not set up " + country ? ` for ${country.default_name}` : ".");
            }
          }

        }
        let orderFulfillmentsCount, orderCancelledFulfillmentsCount = 0;
        if (fulfillmentType == "RETURN") {
          //will work on this later
        } else {
          // getting fulfillments count if already did  
          const orderFulfillmentsCountResult = await repository.getOrderFulfillmentsCount(orderCode);
          orderFulfillmentsCount = orderFulfillmentsCountResult?.fulfillment_count ?? 0;
        }
        
        //calculating totalFulfillmentsCount = order active fullfilments - order cancelled fullfillments
        const orderCancelledFulfillmentsCountResult = await repository.getOrderCancelledFulfillmentsCount(orderCode);
        orderCancelledFulfillmentsCount = orderCancelledFulfillmentsCountResult?.fulfillment_count ?? 0;
        const totalFulfillmentsCount = parseInt(orderFulfillmentsCount) - parseInt(orderCancelledFulfillmentsCount);
        
        const fulfillmentName = order.order_number + ((fulfillmentType ?? '') === "RETURN" ? '-R' : '') + '-' + totalFulfillmentsCount;

        // Generate a hash code for the fulfillment
        const fulfillmentCode = generateHash();

        for (const fulfillment of fulfillments) {
          // Create the payload object for fulfillment
          const fulfillmentPayload = {
            quantity: fulfillment.quantity,
            line_item_code: fulfillment.line_item_code,
            order_code: order.order_code,
            order_id: order.order_id,
            integration_code: order.integration_code,
            refund_id: fulfillment.refund_id || null,
            name: fulfillmentName || 'Default Name',
            fulfillment_code: fulfillmentCode,
            packaging_code: fulfillment.packaging_code || null,
            reason: fulfillment.reason || null,
            comment: fulfillment.comment || null,
            fulfillment_type: fulfillmentType || 'DEFAULT',
            reference: fulfillment.reference || null
          };

          // Send the payload to the repository function to insert into the database
          await repository.createFulfillment(fulfillmentPayload);
        }

        // marking the order as partially or fully fulfilled
        await repository.markOrderAsFulfilled(orderCode);

        // creating order event that logged in user has fulfiled 4 items
        await this.createOrderEvent(orderCode, fulfillments.length ?? 0);

        // create invoice and event (merchant created invoice)
        await invoiceRepository.createInvoiceEvent(order, fulfillmentCode, SalesInvoiceEntity.INVOICE_TYPE.INVOICE);
        
        //sending email
        mailService.sendEmail(order, companyPersonalizedMessages, 'fulfillment_created');

        //getting update order with joins
        const orderModel = await orderRepository.getOrder(orderCode);
        const fulfillmentsModel = await repository.getOrderFulfillments(orderCode);
        // logger.info(JSON.stringify(fulfillmentsModel, null, 2));
        
        return {
          ...orderModel,
          fulfillments:fulfillmentsModel
        };
      }
    }


  }


  async createOrderEvent(orderCode, count) {
    await eventRepository.createEvent({
      order_code: orderCode,
      subject_type: 'Order',
      verb: 'fulfillment_success',
      author: "Merchant",
      message: `Admin has fulfilled ${count} items`,
      description: `Admin has fulfilled ${count} items`,
    });
  }

  async checkIdsExist(ids) {
    const results = await repository.getLineitems(ids);
    try {
      // Extract IDs from the result
      const foundIds = results.map(row => row.line_item_code);

      // Compare the found IDs with the provided ones
      const missingIds = ids.filter(id => !foundIds.includes(id));

      if (missingIds.length === 0) {
        return true
      }

      return false;
    } catch (err) {
      console.error('Error checking IDs:', err);
    }
  }


  //end of class
}

module.exports = FulFillmentService;
