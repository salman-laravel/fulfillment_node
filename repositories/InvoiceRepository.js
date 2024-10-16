const mysql = require('mysql2');
const dotenv = require("dotenv");
const SalesInvoiceEntity = require('../entity/SalesInvoiceEntity');
const EventRepository = require('./EventRepository');
const eventRepository = new EventRepository();
const Logger = require("../utils/logger");
const logger = new Logger();

dotenv.config({
  path: "./.env",
});

class InvoiceRepository {

  constructor() {
    const dbHost = process.env.DB_HOST;
    const dbUser = process.env.DB_USERNAME;
    const dbPass = process.env.DB_PASSWORD;
    const dbName = process.env.DB_DATABASE;

    // Set up MySQL connection
    const connection = mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPass,
      database: dbName
    });

    this.connect = connection;

    // Connect to the database
    connection.connect((err) => {
      if (err) {
        console.error('Error connecting to MySQL:', err.stack);
        return;
      }
      console.log('Connected to MySQL as id ' + connection.threadId);
    });
  }


  async createInvoiceEvent(order, fulfillmentCode, invoiceType) {
    const fulfillmentLineitems = await this.getFulfillmentLineItems(order.order_code, fulfillmentCode)

    // creating invoice items json for invoice table
    const invoiceItems = fulfillmentLineitems.map(lineItem => ({
      count: lineItem.quantity,
      amount: lineItem.product_selling_price,
      description: lineItem.product_title,
      taxes_included: lineItem.taxable || false,
      vat_rate: (lineItem.tax_lines && lineItem.tax_lines.length > 0) ? lineItem.tax_lines[0].rate : 0.00,
      tax_price: (lineItem.tax_lines && lineItem.tax_lines.length > 0) ? lineItem.tax_lines[0].price : 0.00,
      price_set: lineItem.price_set || ''
    }));

    //creating customer information json
    const customerInformation = await this.createCustomerInformation(order.customer_code);
    
    //creating discount json
    let discount = [];
    if(order && order.payment_details && order.payment_details[0]){
      discount = order.payment_details[0] ? this.createDiscountData(order) : null;
    }

    //creating shipping lines json
    const shippingLines = order.shipping_lines[0] ? this.createShippingLinesData(order.shipping_lines[0]) : null;

    const response = await this.insertInvoiceInDB(order.order_code, invoiceItems, discount, SalesInvoiceEntity.INVOICE_TYPE.INVOICE, customerInformation, shippingLines);
    if (response) {
      await eventRepository.createEvent({
        order_code: order.order_code,
        subject_type: 'Order',
        verb: 'invoice_created',
        author: "Merchant",
        message: `Admin created invoice`,
        description: `Admin created invoice`,
      });
    }

    return "Fulfillments has been done";

  }

  async getFulfillmentLineItems(orderCode, fulfillmentCode) {
    const query = `
    SELECT 
        f.fulfillment_code as fulfillment_code,
        f.is_cancelled as fulfillment_is_cancelled,
        f.fulfillment_type as fulfillment_type,
        li.*,
        p.title as product_title,
        p.selling_price as product_selling_price
    FROM 
        fulfillments f
    LEFT JOIN 
        line_items li ON f.line_item_code = li.line_item_code
    LEFT JOIN 
    products p on p.product_code = li.product_code
    WHERE 
        f.order_code = ${orderCode}
        AND f.fulfillment_code = ${fulfillmentCode}
        AND f.is_cancelled = 0
        AND f.fulfillment_type = 'DEFAULT';
    `;

    return new Promise((resolve, reject) => {
      this.connect.query(query, [orderCode, fulfillmentCode], (err, results) => {
        if (err) {
          return reject(err); // Reject the promise on error
        }
        resolve(results); // Resolve the promise with results
      });
    });
  }

  async createCustomerInformation(customerCode) {
    const customer = await this.getCustomerFromDB(customerCode);
    return {
      first_name: customer?.first_name || null,
      last_name: customer?.last_name || null,
      address1: customer?.address1 || null,
      address2: customer?.address2 || null,
      country_code: customer.country_iso ?? null,
      zip: customer?.zipcode || null,
      city: customer?.city || null,
      mobile: customer?.mobile || null,
    };

  }

  async getCustomerFromDB(customerCode) {
    const query = `
    SELECT 
      customers.*, 
      c.iso as country_iso 
    FROM 
      customers 
    JOIN 
      countries c ON c.country_code = customers.country_code 
    WHERE 
      customer_code = ${customerCode}
  `;

    return new Promise((resolve, reject) => {
      this.connect.query(query, customerCode, (err, results) => {
        if (err) {
          return reject(err); // Reject the promise on error
        }
        resolve(results[0]); // Resolve the promise with results
      });
    });
  }

  createDiscountData(order) {
    const result = {};
    if (order.payment_details[0]) {
      result.tax = order.payment_details[0].discount_percent ?? 0,
        result.amount = order.payment_details[0].discount_amount ?? 0
    }
    return result;
  }

  createShippingLinesData(shippingLines) {
    return {
      title: shippingLines.title,
      taxes_included: shippingLines.tax_lines[0] ? true : false,
      vat_rate: shippingLines.tax_lines[0] ? shippingLines.tax_lines[0].rate : 0
    }
  }

  async insertInvoiceInDB(orderCode, invoiceItems, discount, invoiceType, customerInformation, shippingLines) {
    const currentTime = new Date(); 
    const query = `
    INSERT INTO sales_invoices (
        sales_invoice_code,
        order_code,
        company_code,
        invoice_type,
        customer_info,
        invoice_items,
        shipping_lines,
        discount,
        status,
        order_refund_code,
        tax,
        created_at,
        updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const values = [
      generateHash(),
      orderCode,
      23000,
      invoiceType,
      JSON.stringify(customerInformation),
      JSON.stringify(invoiceItems),
      JSON.stringify(shippingLines),
      JSON.stringify(discount),
      'success',
      null,
      invoiceItems[0].vat_rate ?? 0.,
      currentTime,
      currentTime
    ];

    return new Promise((resolve, reject) => {
      this.connect.query(query, values, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });

  }


  // class ends
}
module.exports = InvoiceRepository;