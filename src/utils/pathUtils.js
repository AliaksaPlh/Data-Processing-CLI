const path = require("path");

/**
 * specifi a path relative to the current dir, or normalize it if path is absolute
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
