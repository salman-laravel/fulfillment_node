const FulFillmentService = require('../services/FulFillmentService');
let fulFillmentService = new FulFillmentService();
const Joi = require("joi");

class FulFillmentController {
    static async create(req, res) {

        const data = req.body;
        const orderCode = req.params.id;
        const fulfillmentType = req.params.fulfillment_type ?? 'DEFAULT';

        const schema = Joi.object({
            fulfillments: Joi.array().items(
                Joi.object({
                    line_item_code: Joi.number().required(),
                    quantity: Joi.number().integer().min(1).required()
                })
            ).required(),
            packaging_code: Joi.string().allow(null).optional(),
        });

        const { error, value } = schema.validate(data);

        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const serviceData = await fulFillmentService.create(data, orderCode, fulfillmentType);
        res.send(serviceData);
    }
}

module.exports = FulFillmentController;