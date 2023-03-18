const { agentFiles } = require('../db_factory');

/**
 * Stores the given file in the databse.
 * @param {string} b64File file to store
 * @param {string} fileName name of the file
 * @param {string} fileType mimetype of the file
 * @param {string} senderUsername
 * @param {string} recipientUsername
 * @returns the file id upon successful creation
 * @throws if a db error occurs.
 */
const storeAgentFile = (b64File, fileName, fileType, senderUsername, recipientUsername) => {
  return agentFiles.create({
    file: b64File,
    fileName,
    fileType,
    senderUsername,
    recipientUsername,
  }).then((res) => res._id.toString());
};

/**
 * Gets the file of the given id if it exists and accessingUsername has access
 * to it.
 * @param {string} fileId id of the file
 * @param {string} accessingUsername username that requested the file
 * @returns the file document if found
 * @throws if a db error occurs.
 */
const getAgentFile = (fileId, accessingUsername) => {
  return agentFiles.find({
    _id: fileId,
    $or: [
      { senderUsername: accessingUsername },
      { recipientUsername: accessingUsername },
    ],
  }, {
    file: 1, fileName: 1, fileType: 1, _id: 0,
  }).lean();
};

module.exports = {
  storeAgentFile,
  getAgentFile,
};
