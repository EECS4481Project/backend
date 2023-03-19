const { userFiles } = require('../db_factory');

/**
 * Stores the given file
 * @param {string} file B64 encoded file (thats encrypted)
 * @param {string} fileName Name of file
 * @param {string} fileType Type of file
 * @returns the file id upon successful creation
 * @throws if a db error occurs.
 */
const writeFile = async (fileString, fileName, fileType) => {
  return userFiles.create({
    file: fileString,
    fileName,
    fileType,
  }).then((res) => res._id.toString());
};

module.exports = {
  writeFile,
};
