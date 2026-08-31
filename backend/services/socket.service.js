let io = null;


// ============================================================
// INITIALIZE
// ============================================================

function initializeSocket(
  socketServer
) {
  io = socketServer;
}


// ============================================================
// PROJECT ROOM
// ============================================================

function getProjectRoom(
  projectId
) {
  return `project:${projectId}`;
}


// ============================================================
// USER ROOM
// ============================================================

function getUserRoom(
  userId
) {
  return `user:${userId}`;
}


// ============================================================
// EMIT PROJECT EVENT
// ============================================================

async function emitProjectEvent({
  projectId,
  userId,
  type,
  status = null,
  stepNumber = null,
  message,
  data = null,
}) {
  if (!io) {
    return;
  }

  const payload = {
    projectId,
    type,
    status,
    stepNumber,
    message,
    data,
    timestamp:
      new Date().toISOString(),
  };

  console.log(JSON.stringify(payload,null,3));

  // User watching this project
  io.to(
    getProjectRoom(
      projectId
    )
  ).emit(
    "project:event",
    payload
  );

  // User's general dashboard
  if (userId) {
    io.to(
      getUserRoom(
        userId
      )
    ).emit(
      "project:event",
      payload
    );
  }
}


// ============================================================
// PRESENCE CHECK
// ============================================================
//
// Used to decide whether a completion/failure notification
// email is worth sending: if the user already has a live socket
// connection (i.e. they're sitting on the dashboard watching
// updates arrive in real time), the in-app toast/notification is
// enough - an email would just be noise. If they're not
// connected, they only find out via email.
// ============================================================

function isUserOnline(userId) {
  if (!io || !userId) {
    return false;
  }

  const room = io.sockets.adapter.rooms.get(getUserRoom(userId));

  return Boolean(room && room.size > 0);
}


module.exports = {
  initializeSocket,
  getProjectRoom,
  getUserRoom,
  emitProjectEvent,
  isUserOnline,
};