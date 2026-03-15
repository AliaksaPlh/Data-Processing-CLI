const path = require("path");

/**
 * resolve paths relative to current working directory or normalize
 * @param {string} currentDir
 * @param {string} rawPath
 * @returns {string}
 */
const resolvePath = (currentDir, rawPath) => {
  return path.isAbsolute(rawPath)
    ? path.normalize(rawPath)
    : path.resolve(currentDir, rawPath);
};

module.exports = {
  resolvePath,
};
