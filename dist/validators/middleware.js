"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateISO20022 = validateISO20022;
const iso20022_1 = require("./iso20022");
function validateISO20022(messageType) {
    return (req, res, next) => {
        const result = (0, iso20022_1.validate)(messageType, req.body);
        if (!result.valid) {
            res.status(400).json({
                code: result.code,
                fields: result.fields,
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=middleware.js.map