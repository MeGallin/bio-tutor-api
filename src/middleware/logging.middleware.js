/**
 * Custom logging middleware
 * Enhances console.log with timestamp and formatting
 */
export const setupLogging = () => {
  // Configure logging for better visibility
  console.log = function (message, ...args) {
    const timestamp = new Date().toISOString();
    process.stdout.write(`[${timestamp}] [INFO] ${message}\n`);
    if (args.length > 0) {
      console.dir(args, { depth: null, colors: true });
    }
  };
};
