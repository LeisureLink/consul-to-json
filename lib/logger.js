'use strict';

const SkinnyLoggins = require('@leisurelink/skinny-loggins');
const logger = new SkinnyLoggins();

logger.transports.console.timestamp = false;
logger.transports.console.showLevel = false;
logger.transports.console.stderrLevels = ['error', 'debug', 'info'];

module.exports = logger;
