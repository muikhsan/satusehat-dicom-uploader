// utils/logger.js
const winston = require('winston');
require('winston-daily-rotate-file'); // For log rotation

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message}`
  ),
  winston.format.errors({ stack: true }) // Include stack trace for errors
);

// Console Transport
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    logFormat
  ),
  level: 'info', // Show 'info' and above on console
});

// File Transport with rotation (Crucial for auditing)
const fileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/sdb-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m', // Rotate logs daily or when size exceeds 20MB
  maxFiles: '14d', // Keep logs for 14 days
  level: 'debug', // Log everything ('debug' and above) to the file
  format: winston.format.json(), // Log as structured JSON for easy searching/parsing
});

const logger = winston.createLogger({
  transports: [consoleTransport, fileTransport],
});

// Custom wrapper for success messages
logger.success = (message) => logger.info(`SUCCESS: ${message}`);
logger.warn = (message) => logger.log('warn', message);
logger.error = (message) => logger.log('error', message);

module.exports = logger;