"use strict";

require("dotenv").config();

// Must run before other requires so startup-time errors are
// captured too.
const { Sentry, SENTRY_ENABLED } = require("./config/sentry");

const path = require("path");
const http = require("http");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const { connectDB, disconnectDB } = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const projectRoutes = require("./routes/project.routes");
const webhookRoutes = require("./routes/webhook.routes");
const uploadRoutes = require("./routes/upload.routes");
const planRoutes = require("./routes/plan.routes");
const contactRoutes = require("./routes/contact.routes");

const { ensurePlansSeeded } = require("./services/plan.service");
const { verifyMailConnection } = require("./config/mail");
const {
  startRenderWorker,
  stopRenderWorker,
} = require("./workers/render.worker");

const {
  initializeSocket,
  getProjectRoom,
  getUserRoom,
} = require("./services/socket.service");

const User = require("./models/User");
const Project = require("./models/Project");

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = Number(process.env.PORT || 5000);

const NODE_ENV = process.env.NODE_ENV || "development";

const HOST = process.env.HOST || "0.0.0.0";

const CLIENT_URLS = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  "http://localhost:3000"
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

// ============================================================
// EXPRESS APP
// ============================================================

const app = express();

// ============================================================
// HTTP SERVER
// ============================================================

const server = http.createServer(app);

// ============================================================
// SOCKET.IO
// ============================================================

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      // Allow server-to-server requests / tools without Origin.
      if (!origin) {
        return callback(null, true);
      }

      if (CLIENT_URLS.includes(origin) || NODE_ENV !== "production") {
        return callback(null, true);
      }

      return callback(new Error("Socket.IO CORS origin not allowed"));
    },

    credentials: true,

    methods: ["GET", "POST"],
  },

  transports: ["websocket", "polling"],
});

// Give socket service access to the
// Socket.IO server instance.
initializeSocket(io);

// ============================================================
// SECURITY
// ============================================================

app.disable("x-powered-by");

app.set("trust proxy", 1);

app.use(
  helmet(),
);

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin(origin, callback) {
      // Allow tools such as curl/Postman and same-origin calls.
      if (!origin) {
        return callback(null, true);
      }

      if (CLIENT_URLS.includes(origin) || NODE_ENV !== "production") {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"));
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// ============================================================
// BODY PARSING
// ============================================================

// JSON request body limit.
// Actual file uploads should use Multer/Cloudinary
// rather than keeping large files in req.body.
app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT || "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.URLENCODED_BODY_LIMIT || "2mb",
  }),
);

app.use(express.static(path.join(__dirname, "public", "dist")));

// ============================================================
// COOKIE PARSER
// ============================================================

app.use(cookieParser());

// ============================================================
// REQUEST ID
// ============================================================

app.use((req, res, next) => {
  const incomingId = req.headers["x-request-id"];

  req.requestId =
    typeof incomingId === "string" && incomingId.length <= 100
      ? incomingId
      : crypto.randomUUID();

  res.setHeader("X-Request-ID", req.requestId);

  next();
});

// ============================================================
// HTTP ACCESS LOGGING
// ============================================================

morgan.token("request-id", (req) => req.requestId || "-");

const accessLogFormat =
  NODE_ENV === "production"
    ? [
        ":remote-addr",
        "-",
        ":method",
        ":url",
        ":status",
        ":res[content-length]",
        ":response-time ms",
        "request-id=:request-id",
      ].join(" ")
    : [
        ":method",
        ":url",
        ":status",
        "-",
        ":response-time ms",
        "request-id=:request-id",
      ].join(" ");

app.use(morgan(accessLogFormat));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", async (req, res) => {
  const mongoState = require("mongoose").connection.readyState;

  const mongoStatus = mongoState === 1 ? "connected" : "disconnected";

  const healthy = mongoState === 1;

  return res.status(healthy ? 200 : 503).json({
    success: healthy,

    service: "subtitle-backend",

    environment: NODE_ENV,

    status: healthy ? "healthy" : "unhealthy",

    database: {
      mongodb: mongoStatus,
    },

    timestamp: new Date().toISOString(),

    uptimeSeconds: Math.floor(process.uptime()),

    requestId: req.requestId,
  });
});

// ============================================================
// API INFORMATION
// ============================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,

    service: "Subtitle Processing API",

    version: process.env.API_VERSION || "1.0.0",

    environment: NODE_ENV,

    status: "running",

    endpoints: {
      health: "/health",

      auth: "/api/auth",

      users: "/api/users",

      projects: "/api/projects",

      webhooks: "/api/webhooks",

      socket: "project:event",
    },

    documentation: process.env.API_DOCS_URL || null,
  });
});

// ============================================================
// ROUTES
// ============================================================

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/webhooks", webhookRoutes);

app.use("/api/uploads", uploadRoutes);

app.use("/api/plans", planRoutes);

app.use("/api/contact", contactRoutes);

app.use(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dist", "index.html"));
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,

    message: "API route not found",

    path: req.originalUrl,

    method: req.method,

    requestId: req.requestId,
  });
});

// ============================================================
// SENTRY ERROR HANDLER
// ============================================================
//
// Must be mounted after all routes/controllers but before any
// other error-handling middleware, per Sentry's Express
// integration docs - captures anything that reaches Express's
// error-handling chain (thrown errors, CORS rejections, JSON
// parse failures, etc.) and forwards it to the global handler
// below via next(err).
//
// NOTE: most of this app's own controllers catch their own
// errors internally and respond directly (they don't call
// next(err)), so this alone does not capture every error this
// app produces - see BACKEND.md for the actual coverage this
// gives you and what it doesn't.

if (SENTRY_ENABLED) {
  Sentry.setupExpressErrorHandler(app);
}

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
  console.error(
    `[ERROR] requestId=${req.requestId || "-"} ${error.stack || error.message || error}`,
  );

  // --------------------------------------------------------
  // CORS
  // --------------------------------------------------------

  if (error.message === "CORS origin not allowed") {
    return res.status(403).json({
      success: false,
      message: "Origin is not allowed",
      requestId: req.requestId,
    });
  }

  // --------------------------------------------------------
  // JSON body parsing
  // --------------------------------------------------------

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
      requestId: req.requestId,
    });
  }

  // --------------------------------------------------------
  // MongoDB duplicate key
  // --------------------------------------------------------

  if (error.code === 11000) {
    const fields = Object.keys(error.keyPattern || {});

    return res.status(409).json({
      success: false,
      message: "A record with the provided unique value already exists",
      fields,
      requestId: req.requestId,
    });
  }

  // --------------------------------------------------------
  // Mongoose validation
  // --------------------------------------------------------

  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
      requestId: req.requestId,
    });
  }

  // --------------------------------------------------------
  // Invalid ObjectId
  // --------------------------------------------------------

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource identifier",
      requestId: req.requestId,
    });
  }

  // --------------------------------------------------------
  // JWT / authentication errors
  // --------------------------------------------------------

  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
      requestId: req.requestId,
    });
  }

  // --------------------------------------------------------
  // HTTP-style application errors
  // --------------------------------------------------------

  const statusCode = Number(error.statusCode) || Number(error.status) || 500;

  const safeStatus = statusCode >= 400 && statusCode <= 599 ? statusCode : 500;

  const isProduction = NODE_ENV === "production";

  return res.status(safeStatus).json({
    success: false,

    message:
      isProduction && safeStatus >= 500
        ? "Internal server error"
        : error.message || "Internal server error",

    requestId: req.requestId,

    ...(isProduction
      ? {}
      : {
          stack: error.stack,
        }),
  });
});

// ============================================================
// SOCKET AUTHENTICATION
// ============================================================

io.use(async (socket, next) => {
  try {
    const authToken = socket.handshake.auth?.token;

    if (!authToken) {
      return next(new Error("Authentication required"));
    }

    // ------------------------------------------------------
    // Verify JWT manually here instead of using
    // Express middleware because Socket.IO does not
    // pass through Express route middleware.
    // ------------------------------------------------------

    const jwt = require("jsonwebtoken");

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error("User not found"));
    }

    if (!user.isActive) {
      return next(new Error("Account is disabled"));
    }

    socket.user = user;

    next();
  } catch (error) {
    console.error("Socket authentication failed:", error.message);

    next(new Error("Socket authentication failed"));
  }
});

// ============================================================
// SOCKET CONNECTION
// ============================================================

io.on("connection", (socket) => {
  const userId = socket.user._id.toString();

  console.log(`[SOCKET] connected user=${userId} socket=${socket.id}`);

  // --------------------------------------------------------
  // Automatically join user room
  // --------------------------------------------------------

  socket.join(getUserRoom(userId));

  // --------------------------------------------------------
  // Client joins a specific project room
  // --------------------------------------------------------

  socket.on("project:join", async (projectId, callback) => {
    try {
      if (typeof projectId !== "string") {
        throw new Error("Invalid project ID");
      }

      const project = await Project.findOne({
        projectId,
        userId: socket.user._id,
      }).select(
        "_id projectId status currentStep currentStepName lastCompletedStep",
      );

      if (!project) {
        throw new Error("Project not found");
      }

      const room = getProjectRoom(projectId);

      socket.join(room);

      console.log(`[SOCKET] user=${userId} joined ${room}`);

      if (typeof callback === "function") {
        callback({
          success: true,

          projectId,

          status: project.status,

          currentStep: project.currentStep,

          currentStepName: project.currentStepName,

          lastCompletedStep: project.lastCompletedStep,
        });
      }
    } catch (error) {
      console.error("[SOCKET] project:join error:", error.message);

      if (typeof callback === "function") {
        callback({
          success: false,
          message: error.message,
        });
      }
    }
  });

  // --------------------------------------------------------
  // Leave project room
  // --------------------------------------------------------

  socket.on("project:leave", (projectId, callback) => {
    if (typeof projectId !== "string") {
      return;
    }

    const room = getProjectRoom(projectId);

    socket.leave(room);

    if (typeof callback === "function") {
      callback({
        success: true,
        projectId,
      });
    }
  });

  // --------------------------------------------------------
  // Disconnect
  // --------------------------------------------------------

  socket.on("disconnect", (reason) => {
    console.log(
      `[SOCKET] disconnected user=${userId} socket=${socket.id} reason=${reason}`,
    );
  });
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`\n[SERVER] ${signal} received. Starting graceful shutdown...`);

  // ----------------------------------------------------------
  // Stop accepting new HTTP connections
  // ----------------------------------------------------------

  server.close(async (serverError) => {
    if (serverError) {
      console.error("[SERVER] HTTP shutdown error:", serverError);
    }

    // ------------------------------------------------------
    // Close Socket.IO
    // ------------------------------------------------------

    try {
      await new Promise((resolve) => {
        io.close(() => resolve());
      });

      console.log("[SERVER] Socket.IO closed");
    } catch (error) {
      console.error("[SERVER] Socket.IO shutdown error:", error);
    }

    // ------------------------------------------------------
    // Stop the render worker
    // ------------------------------------------------------
    //
    // Waits for in-flight jobs to finish their current step
    // before closing - queued/incomplete jobs stay safely in
    // Redis and resume on next boot.

    try {
      await stopRenderWorker();
    } catch (error) {
      console.error("[SERVER] Render worker shutdown error:", error);
    }

    // ------------------------------------------------------
    // Close MongoDB
    // ------------------------------------------------------

    try {
      await disconnectDB();

      console.log("[SERVER] MongoDB connection closed");
    } catch (error) {
      console.error("[SERVER] MongoDB shutdown error:", error);
    }

    console.log("[SERVER] Shutdown complete");

    process.exit(serverError ? 1 : 0);
  });

  // ----------------------------------------------------------
  // Don't hang forever waiting for connections
  // ----------------------------------------------------------

  setTimeout(() => {
    console.error("[SERVER] Forced shutdown after timeout");

    process.exit(1);
  }, 15000).unref();
};

// ============================================================
// PROCESS SIGNALS
// ============================================================

process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("SIGINT", () => shutdown("SIGINT"));

// ============================================================
// UNHANDLED ERRORS
// ============================================================

process.on("unhandledRejection", (reason) => {
  console.error("[PROCESS] Unhandled promise rejection:", reason);

  if (SENTRY_ENABLED) {
    Sentry.captureException(reason);
  }
});

process.on("uncaughtException", (error) => {
  console.error("[PROCESS] Uncaught exception:", error);

  if (SENTRY_ENABLED) {
    Sentry.captureException(error);
  }

  // An uncaught exception can leave the process
  // in an unknown state. Shut down cleanly and
  // let the process manager restart it.
  shutdown("uncaughtException");
});

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    console.log("============================================================");

    console.log("Starting Subtitle Backend");

    console.log(`Environment: ${NODE_ENV}`);

    console.log(`Host: ${HOST}`);

    console.log(`Port: ${PORT}`);

    console.log("============================================================");

    // ------------------------------------------------------
    // Validate required environment variables
    // ------------------------------------------------------

    const requiredEnv = ["MONGODB_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];

    const missingEnv = requiredEnv.filter((key) => !process.env[key]);

    if (missingEnv.length) {
      throw new Error(
        `Missing required environment variables: ${missingEnv.join(", ")}`,
      );
    }

    // ------------------------------------------------------
    // Connect MongoDB
    // ------------------------------------------------------

    await connectDB();

    console.log("[SERVER] MongoDB ready");

    await ensurePlansSeeded();

    console.log("[SERVER] Plan catalog seeded");

    // Non-blocking: an unreachable/misconfigured SMTP server
    // must never prevent the app from starting. verifyMailConnection()
    // already logs its own success/failure.
    verifyMailConnection();

    // ------------------------------------------------------
    // Start the render worker (BullMQ, backed by Redis)
    // ------------------------------------------------------
    //
    // Runs in-process by default - see workers/render.worker.js
    // and worker.js for the optional standalone-process path.
    // Set ENABLE_RENDER_WORKER=false if you're running a
    // separate dedicated worker process/container instead.

    if (process.env.ENABLE_RENDER_WORKER !== "false") {
      startRenderWorker();
    } else {
      console.log(
        "[SERVER] Render worker disabled (ENABLE_RENDER_WORKER=false) - expecting a separate worker process",
      );
    }

    // ------------------------------------------------------
    // Start HTTP + Socket.IO
    // ------------------------------------------------------

    server.listen(PORT, HOST, () => {
      console.log(
        "============================================================",
      );

      console.log(`Server listening on http://${HOST}:${PORT}`);

      console.log(`Health: http://${HOST}:${PORT}/health`);

      console.log(`API: http://${HOST}:${PORT}/api`);

      console.log(`Allowed clients: ${CLIENT_URLS.join(", ")}`);

      console.log("Socket.IO: enabled");

      console.log(
        "============================================================",
      );
    });
  } catch (error) {
    console.error("[SERVER] Failed to start:", error);

    process.exit(1);
  }
};

// ============================================================
// START
// ============================================================

if (require.main === module) {
  startServer();
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  app,
  server,
  io,
};

/*
 "data": {
        "file": {
            "url": "https://res.cloudinary.com/cboartzo/video/upload/v1787929765/subtitle-app/users/6a9196ba5c8b6ea4ddad9a6d/uploads/u1jet3ychuyv71xg7wrh.mp4",
            "publicId": "subtitle-app/users/6a9196ba5c8b6ea4ddad9a6d/uploads/u1jet3ychuyv71xg7wrh",
            "resourceType": "video",
            "format": "mp4",
            "originalFilename": "video.mp4",
            "sizeBytes": 1673157,
            "mimeType": "video/mp4",
            "width": 854,
            "height": 480,
            "durationSeconds": 12
        },
        "inputType": "video"
    }
*/
