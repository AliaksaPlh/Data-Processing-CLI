const fsPromises = require("fs").promises;
const { resolvePath } = require("../utils/pathUtils");
const { hashStream, HASH_ALGORITHMS } = require("./hash");

/**
 * Compare file hash with expected hash from a file (case-insensitive, trim trailing newline).
 * @param {string} currentDir
 * @param {string} inputPath - path to file to hash (rel/abs)
 * @param {string} hashFilePath - path to file containing expected hash (rel/abs)
 * @param {string} algorithm - sha256, md5, sha512
 * @returns {Promise<{ ok: boolean, match?: boolean }>}
 */
const handleHashCompare = async (
  currentDir,
  inputPath,
  hashFilePath,
  algorithm,
) => {
  if (!HASH_ALGORITHMS.includes(algorithm)) {
    return { ok: false };
  }
  const resolvedInput = resolvePath(currentDir, inputPath);
  const resolvedHashFile = resolvePath(currentDir, hashFilePath);
  try {
    await fsPromises.access(resolvedInput);
    await fsPromises.access(resolvedHashFile);
  } catch {
    return { ok: false };
  }

  let expectedHash;
  try {
    const raw = await fsPromises.readFile(resolvedHashFile, "utf8");
    expectedHash = raw.trim().toLowerCase();
  } catch {
    return { ok: false };
  }

  const result = await hashStream(resolvedInput, algorithm);
  if (!result.ok) {
    return result;
  }

  const computedHash = result.hash.toLowerCase();
  const match = computedHash === expectedHash;
  return { ok: true, match };
};

module.exports = {
  handleHashCompare,
};
