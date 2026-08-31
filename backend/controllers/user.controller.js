const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Project = require("../models/Project");

const {
  getPlanByKey,
  computeSubscriptionWindow,
} = require("../services/plan.service");

// ============================================================
// CONFIGURATION    
// ============================================================

const BCRYPT_SALT_ROUNDS = 12;

const DEFAULT_PROJECT_LIMIT = 20;
const MAX_PROJECT_LIMIT = 100;

const ALLOWED_PROFILE_FIELDS = [
  "name",
  "avatar",
];


// ============================================================
// HELPERS
// ============================================================

/**
 * Return only fields that are safe to expose publicly.
 *
 * Never return:
 * - password
 * - tokenVersion
 * - refresh-token-related fields
 * - internal security fields
 */
const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    role: user.role,
    isEmailVerified: Boolean(user.isEmailVerified),
    isActive: Boolean(user.isActive),
    lastLoginAt: user.lastLoginAt || null,
    subscription: user.subscription
      ? {
          planKey: user.subscription.planKey,
          status: user.subscription.status,
          startedAt: user.subscription.startedAt,
          expiresAt: user.subscription.expiresAt,
          isLifetime: Boolean(user.subscription.isLifetime),
        }
      : null,
    analytics: {
      totalProjects:
        user.analytics?.totalProjects || 0,

      completedProjects:
        user.analytics?.completedProjects || 0,

      failedProjects:
        user.analytics?.failedProjects || 0,

      totalProcessingTimeSeconds:
        user.analytics?.totalProcessingTimeSeconds || 0,

      totalUploadedBytes:
        user.analytics?.totalUploadedBytes || 0,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};


/**
 * Parse pagination safely.
 */
const parsePagination = (query) => {
  let page = Number.parseInt(query.page, 10);
  let limit = Number.parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) {
    page = 1;
  }

  if (
    !Number.isFinite(limit) ||
    limit < 1
  ) {
    limit = DEFAULT_PROJECT_LIMIT;
  }

  limit = Math.min(
    limit,
    MAX_PROJECT_LIMIT
  );

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};


/**
 * Convert uploaded bytes into a useful human-readable value.
 */
const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  let value = bytes;
  let index = 0;

  while (
    value >= 1024 &&
    index < units.length - 1
  ) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};


// ============================================================
// GET CURRENT USER
// ============================================================

/**
 * GET /api/users/me
 *
 * Returns the authenticated user's profile.
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    console.error(
      "getMe error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve user profile",
    });
  }
};


// ============================================================
// UPDATE PROFILE
// ============================================================

/**
 * PATCH /api/users/me
 *
 * Allowed:
 * - name
 * - avatar
 *
 * Email/password changes should be separate operations.
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // --------------------------------------------------------
    // Account check
    // --------------------------------------------------------

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled",
      });
    }

    // --------------------------------------------------------
    // Update only explicitly allowed fields
    // --------------------------------------------------------

    let hasChanges = false;

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "name"
      )
    ) {
      const name =
        typeof req.body.name === "string"
          ? req.body.name.trim()
          : "";

      if (name.length < 2) {
        return res.status(400).json({
          success: false,
          message:
            "Name must contain at least 2 characters",
        });
      }

      if (name.length > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Name cannot exceed 100 characters",
        });
      }

      user.name = name;
      hasChanges = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "avatar"
      )
    ) {
      const avatar =
        req.body.avatar === null
          ? null
          : String(req.body.avatar).trim();

      if (
        avatar &&
        avatar.length > 2048
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Avatar URL is too long",
        });
      }

      user.avatar = avatar;
      hasChanges = true;
    }

    // --------------------------------------------------------
    // Prevent unsupported fields
    // --------------------------------------------------------

    const incomingKeys = Object.keys(req.body);

    const unsupportedFields =
      incomingKeys.filter(
        (key) =>
          !ALLOWED_PROFILE_FIELDS.includes(
            key
          )
      );

    if (unsupportedFields.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "One or more fields cannot be updated here",
        fields: unsupportedFields,
      });
    }

    if (!hasChanges) {
      return res.status(400).json({
        success: false,
        message: "No profile changes provided",
      });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    console.error(
      "updateProfile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update profile",
    });
  }
};


// ============================================================
// CHANGE PASSWORD
// ============================================================

/**
 * PATCH /api/users/me/password
 *
 * Changes the authenticated user's password.
 *
 * Important:
 * tokenVersion is incremented so all existing
 * refresh tokens can be invalidated.
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // --------------------------------------------------------
    // Validate request
    // --------------------------------------------------------

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password, new password and confirmation are required",
      });
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password and confirmation do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must contain at least 8 characters",
      });
    }

    if (newPassword.length > 200) {
      return res.status(400).json({
        success: false,
        message:
          "New password is too long",
      });
    }

    // --------------------------------------------------------
    // Get password explicitly
    // --------------------------------------------------------

    const user = await User.findById(
      userId
    ).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled",
      });
    }

    // --------------------------------------------------------
    // Verify current password
    // --------------------------------------------------------

    const currentPasswordMatches =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!currentPasswordMatches) {
      return res.status(400).json({
        success: false,
        message:
          "Current password is incorrect",
      });
    }

    // --------------------------------------------------------
    // Prevent same password
    // --------------------------------------------------------

    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from current password",
      });
    }

    // --------------------------------------------------------
    // Hash new password
    // --------------------------------------------------------

    user.password =
      await bcrypt.hash(
        newPassword,
        BCRYPT_SALT_ROUNDS
      );

    // --------------------------------------------------------
    // Invalidate all refresh tokens
    // --------------------------------------------------------

    user.tokenVersion =
      (user.tokenVersion || 0) + 1;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Please login again on other devices.",
    });
  } catch (error) {
    console.error(
      "changePassword error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to change password",
    });
  }
};


// ============================================================
// GET PROJECT HISTORY
// ============================================================

/**
 * GET /api/users/me/projects
 *
 * Returns only projects belonging to the authenticated user.
 *
 * Query:
 * ?page=1
 * ?limit=20
 * ?status=completed
 * ?search=interview
 */
const getMyProjects = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      page,
      limit,
      skip,
    } = parsePagination(
      req.query
    );

    // --------------------------------------------------------
    // Build filter
    // --------------------------------------------------------

    const filter = {
      userId,
    };

    // Status filter
    if (req.query.status) {
      const allowedStatuses = [
        "created",
        "uploading",
        "queued",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ];

      const requestedStatus =
        String(req.query.status)
          .trim()
          .toLowerCase();

      if (
        !allowedStatuses.includes(
          requestedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid project status",
        });
      }

      filter.status =
        requestedStatus;
    }

    // Search by projectId/name
    if (req.query.search) {
      const search =
        String(req.query.search)
          .trim();

      if (search.length > 100) {
        return res.status(400).json({
          success: false,
          message:
            "Search query is too long",
        });
      }

      if (search) {
        filter.$or = [
          {
            projectId: {
              $regex: escapeRegex(
                search
              ),
              $options: "i",
            },
          },
          {
            name: {
              $regex: escapeRegex(
                search
              ),
              $options: "i",
            },
          },
          {
            "subtitle.searchText": {
              $regex: escapeRegex(
                search
              ),
              $options: "i",
            },
          },
        ];
      }
    }

    // --------------------------------------------------------
    // Fetch data + count in parallel
    // --------------------------------------------------------

    const [
      projects,
      total,
    ] = await Promise.all([
      Project.find(filter)
        .select(
          [
            "projectId",
            "name",
            "status",
            "currentStep",
            "currentStepName",
            "lastCompletedStep",
            "inputType",
            "input",
            "subtitle",
            "output",
            "processing",
            "pipeline",
            "failure",
            "createdAt",
            "updatedAt",
          ].join(" ")
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Project.countDocuments(
        filter
      ),
    ]);

    const totalPages =
      Math.ceil(
        total / limit
      );

    return res.status(200).json({
      success: true,
      data: {
        projects,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage:
            page < totalPages,
          hasPreviousPage:
            page > 1,
        },
      },
    });
  } catch (error) {
    console.error(
      "getMyProjects error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve project history",
    });
  }
};


// ============================================================
// GET SINGLE PROJECT
// ============================================================

/**
 * GET /api/users/me/projects/:projectId
 *
 * User can only access their own project.
 */
const getMyProject = async (req, res) => {
  try {
    const userId = req.user._id;
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message:
          "Project ID is required",
      });
    }

    const project =
      await Project.findOne({
        projectId,
        userId,
      }).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    console.error(
      "getMyProject error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve project",
    });
  }
};


// ============================================================
// USER STATISTICS
// ============================================================

/**
 * GET /api/users/me/stats
 *
 * Returns dashboard analytics.
 */
const getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // --------------------------------------------------------
    // Load user counters and database aggregates together
    // --------------------------------------------------------

    const [
      user,
      projectStatistics,
    ] = await Promise.all([
      User.findById(userId)
        .select(
          "analytics name email createdAt"
        )
        .lean(),

      Project.aggregate([
        {
          $match: {
            userId,
          },
        },

        {
          $group: {
            _id: null,

            totalProjects: {
              $sum: 1,
            },

            completedProjects: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "completed",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            failedProjects: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "failed",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            processingProjects: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      [
                        "queued",
                        "processing",
                        "uploading",
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            totalUploadedBytes: {
              $sum: {
                $ifNull: [
                  "$metadata.fileSizeBytes",
                  0,
                ],
              },
            },

            totalProcessingSeconds: {
              $sum: {
                $ifNull: [
                  "$processing.durationSeconds",
                  0,
                ],
              },
            },

            totalWords: {
              $sum: {
                $ifNull: [
                  "$subtitle.wordCount",
                  0,
                ],
              },
            },

            totalSubtitles: {
              $sum: {
                $ifNull: [
                  "$subtitle.subtitleCount",
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const statistics =
      projectStatistics[0] || {
        totalProjects: 0,
        completedProjects: 0,
        failedProjects: 0,
        processingProjects: 0,
        totalUploadedBytes: 0,
        totalProcessingSeconds: 0,
        totalWords: 0,
        totalSubtitles: 0,
      };

    const successRate =
      statistics.totalProjects > 0
        ? (
            (
              statistics.completedProjects /
              statistics.totalProjects
            ) * 100
          ).toFixed(2)
        : "0.00";

    const averageProcessingSeconds =
      statistics.completedProjects > 0
        ? (
            statistics.totalProcessingSeconds /
            statistics.completedProjects
          ).toFixed(2)
        : "0.00";

    return res.status(200).json({
      success: true,

      data: {
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          memberSince:
            user.createdAt,
        },

        projects: {
          total:
            statistics.totalProjects,

          completed:
            statistics.completedProjects,

          failed:
            statistics.failedProjects,

          processing:
            statistics.processingProjects,

          successRate:
            Number(successRate),
        },

        processing: {
          totalSeconds:
            statistics.totalProcessingSeconds,

          totalFormatted:
            formatDuration(
              statistics.totalProcessingSeconds
            ),

          averageSeconds:
            Number(
              averageProcessingSeconds
            ),

          averageFormatted:
            formatDuration(
              Number(
                averageProcessingSeconds
              )
            ),
        },

        transcription: {
          totalWords:
            statistics.totalWords,

          totalSubtitles:
            statistics.totalSubtitles,
        },

        storage: {
          totalUploadedBytes:
            statistics.totalUploadedBytes,

          totalUploadedFormatted:
            formatBytes(
              statistics.totalUploadedBytes
            ),
        },

        storedAnalytics:
          user.analytics || {},
      },
    });
  } catch (error) {
    console.error(
      "getMyStats error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve user statistics",
    });
  }
};


// ============================================================
// STORAGE SUMMARY
// ============================================================

/**
 * GET /api/users/me/storage
 *
 * Calculates actual uploaded source media usage.
 */
const getMyStorage = async (req, res) => {
  try {
    const userId = req.user._id;

    const result =
      await Project.aggregate([
        {
          $match: {
            userId,
          },
        },

        {
          $group: {
            _id: null,

            totalFiles: {
              $sum: {
                $cond: [
                  {
                    $ne: [
                      "$input",
                      null,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            totalBytes: {
              $sum: {
                $ifNull: [
                  "$input.sizeBytes",
                  0,
                ],
              },
            },

            videoFiles: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$inputType",
                      "video",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            audioFiles: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$inputType",
                      "audio",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

    const storage =
      result[0] || {
        totalFiles: 0,
        totalBytes: 0,
        videoFiles: 0,
        audioFiles: 0,
      };

    return res.status(200).json({
      success: true,
      data: {
        files: storage.totalFiles,

        bytes: storage.totalBytes,

        formatted:
          formatBytes(
            storage.totalBytes
          ),

        videoFiles:
          storage.videoFiles,

        audioFiles:
          storage.audioFiles,
      },
    });
  } catch (error) {
    console.error(
      "getMyStorage error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve storage information",
    });
  }
};


// ============================================================
// DEACTIVATE ACCOUNT
// ============================================================

/**
 * PATCH /api/users/me/deactivate
 *
 * Soft-deactivates the account.
 *
 * We do NOT immediately delete the user because projects,
 * Cloudinary assets and analytics may need to be retained
 * according to your application's retention policy.
 */
const deactivateAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      password,
    } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message:
          "Password is required to deactivate the account",
      });
    }

    const user =
      await User.findById(
        userId
      ).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "Account is already inactive",
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Password is incorrect",
      });
    }

    user.isActive = false;

    // Invalidate all existing
    // refresh tokens.
    user.tokenVersion =
      (user.tokenVersion || 0) + 1;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Account deactivated successfully",
    });
  } catch (error) {
    console.error(
      "deactivateAccount error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to deactivate account",
    });
  }
};


// ============================================================
// DELETE ACCOUNT
// ============================================================

/**
 * DELETE /api/users/me
 *
 * Permanently deletes the user account.
 *
 * IMPORTANT:
 * This removes the MongoDB user, but Cloudinary files
 * must also be deleted separately using your Cloudinary
 * service before/after this operation.
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      password,
      confirmation,
    } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message:
          "Password is required",
      });
    }

    if (
      confirmation !==
      "DELETE MY ACCOUNT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Type "DELETE MY ACCOUNT" to confirm account deletion',
      });
    }

    const user =
      await User.findById(
        userId
      ).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Password is incorrect",
      });
    }

    // --------------------------------------------------------
    // IMPORTANT
    //
    // Do not blindly delete everything here if your business
    // requires retention or legal/audit history.
    //
    // Cloudinary cleanup should be performed through the
    // Cloudinary service.
    // --------------------------------------------------------

    await User.findByIdAndDelete(
      userId
    );

    // Remove user's projects.
    await Project.deleteMany({
      userId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Account and project records deleted successfully",
    });
  } catch (error) {
    console.error(
      "deleteAccount error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete account",
    });
  }
};


// ============================================================
// HELPERS
// ============================================================

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}


function formatDuration(
  seconds
) {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0s";
  }

  const totalSeconds =
    Math.round(seconds);

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}


// ============================================================
// SUBSCRIPTION
// ============================================================

/**
 * GET /api/users/me/subscription
 *
 * Returns the user's current subscription window merged with
 * the full Plan document it points at, plus a computed
 * `isActive` / `daysRemaining` for the UI.
 */
const getMySubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("subscription");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const plan = await getPlanByKey(user.subscription?.planKey || "free_trial");

    const expiresAt = user.subscription?.expiresAt || null;
    const isLifetime = Boolean(user.subscription?.isLifetime);
    const msRemaining = expiresAt ? new Date(expiresAt).getTime() - Date.now() : null;

    return res.status(200).json({
      success: true,
      data: {
        subscription: {
          planKey: user.subscription?.planKey || "free_trial",
          status: user.subscription?.status || "trialing",
          startedAt: user.subscription?.startedAt || null,
          expiresAt,
          isLifetime,
          isActive: user.hasActiveAccess(),
          daysRemaining:
            isLifetime || msRemaining === null
              ? null
              : Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000))),
        },
        plan,
      },
    });
  } catch (error) {
    console.error("getMySubscription error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load subscription",
    });
  }
};

/**
 * POST /api/users/me/subscription/activate
 *
 * Body: { "planKey": "monthly" }
 *
 * ⚠️ PLACEHOLDER - no payment gateway is wired in yet. This
 * immediately activates the requested plan with no charge, so
 * the frontend pricing/upgrade flow has something real to call.
 * Before shipping, gate this behind an actual payment provider
 * (Stripe/Razorpay/etc.) confirming payment first - see
 * BACKEND.md for the exact TODO.
 */
const activateSubscription = async (req, res) => {
  try {
    const { planKey } = req.body;

    if (!planKey) {
      return res.status(400).json({
        success: false,
        message: "planKey is required",
      });
    }

    const plan = await getPlanByKey(planKey);

    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { startedAt, expiresAt, isLifetime } = computeSubscriptionWindow(plan);

    user.subscription = {
      planKey: plan.key,
      status: plan.key === "free_trial" ? "trialing" : "active",
      startedAt,
      expiresAt,
      isLifetime,
      lastPayment:
        plan.price > 0
          ? {
              amount: plan.price,
              currency: plan.currency,
              provider: "manual", // TODO: replace once a real gateway is wired in
              reference: null,
              paidAt: startedAt,
            }
          : user.subscription?.lastPayment || null,
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Plan updated to ${plan.name}`,
      data: {
        subscription: sanitizeUser(user).subscription,
        plan,
      },
    });
  } catch (error) {
    console.error("activateSubscription error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to activate plan",
    });
  }
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getMe,
  updateProfile,
  changePassword,
  getMyProjects,
  getMyProject,
  getMyStats,
  getMyStorage,
  deactivateAccount,
  deleteAccount,
  getMySubscription,
  activateSubscription,
};