"use strict";
// src/routes/index.ts
// Aggregates all route modules and mounts them onto a router.
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyRoutes = applyRoutes;
const addressDirectory_1 = require("./addressDirectory");
const r2pRequests_1 = require("./r2pRequests");
const payments_1 = require("./payments");
function applyRoutes(router) {
    (0, addressDirectory_1.mountAddressDirectory)(router);
    (0, r2pRequests_1.mountR2PRequests)(router);
    (0, payments_1.mountPayments)(router);
}
//# sourceMappingURL=index.js.map