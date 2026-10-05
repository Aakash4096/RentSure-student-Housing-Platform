const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const config = require("./src/config/env");
const { connectDB } = require("./src/config/database");
const logger = require("./src/utils/logger");
const ApiError = require("./src/utils/ApiError");

const app = express();

// Middleware
app.use(helmet());
app.use(cookieParser());
app.use(
  cors({
    origin: config.isDevelopment
      ? ["http://localhost:3000", "http://localhost:5173"]
      : process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const requestLogger = require("./src/middleware/requestLogger");
app.use(requestLogger);
app.use("/api/v1/auth", require("./src/routes/v1/auth.routes"));
app.use("/api/v1/properties", require("./src/routes/v1/property.routes"));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
  });
});

// 404 Handler
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error(err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(config.port, () => {
      logger.info(
        `Server running on port ${config.port} in ${config.nodeEnv} mode`,
      );
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection", error);
});

startServer();
