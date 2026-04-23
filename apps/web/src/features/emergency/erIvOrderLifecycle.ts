/**
 * IV / infusion in Medora-S today: documented as `Order.type === "CARE"` order lines (`OrderItem`)
 * with manual labels (nursing quick-picks, e.g. peripheral IV). There is no separate `IV` order type
 * in the schema; lifecycle is the same `OrderItem.status` + `OrderEvent` stream as other care lines.
 */
export const ER_IV_LIFECYCLE_ORDER_TYPE = "CARE" as const;
