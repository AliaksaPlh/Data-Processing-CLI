const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const fsPromises = require("fs").promises;
const { resolvePath } = require("../utils/pathUtils");

const HASH_ALGORITHMS = ["sha256", "md5", "sha512"];

/**
 * Calculate a cryptographic hash of a file
 * @param {string} filePath - resolved path to the file
 * @param {string} algorithm - sha256, md5, sha512
 * @returns {Promise<{ ok: boolean, hash?: string, algorithm?: string }>}
 */
const hashStream = (filePath, algorithm) => {
  return new Promise((resolve) => {
    const hash = crypto.createHash(algorithm);
    const readStream = fs.createReadStream(filePath);

    readStream.on("data", (chunk) => {
      hash.update(chunk);
    });

    readStream.on("end", () => {
      const hex = hash.digest("hex");
      resolve({ ok: true, hash: hex, algorithm });
    });

    readStream.on("error", () => {
      resolve({ ok: false });
    });
  });
};

/**
 * Calculate file hash; optionally save to a file next to the source.
 * @param {string} currentDir
 * @param {string} inputPath - path to input file - rel or abs
 * @param {string} algorithm - sha256, md5,sha512
 * @param {boolean} save - if true, write hash to filename.algorithm
 * @returns {Promise<{ ok: boolean, hash?: string, algorithm?: string }>}
 */
const handleHash = async (currentDir, inputPath, algorithm, save) => {
  if (!HASH_ALGORITHMS.includes(algorithm)) {
    return { ok: false };
  }
  const resolvedInput = resolvePath(currentDir, inputPath);
  try {
    await fsPromises.access(resolvedInput);
  } catch {
    return { ok: false };
  }

  const result = await hashStream(resolvedInput, algorithm);
  if (!result.ok) {
    return result;
  }

  if (save) {
    const dir = path.dirname(resolvedInput);
    const base = path.basename(resolvedInput);
    const outPath = path.join(dir, `${base}.${algorithm}`);
    try {
      await fsPromises.writeFile(outPath, result.hash, "utf8");
    } catch {
      return { ok: false };
    }
  }

  return result;
};

module.exports = {
  handleHash,
  hashStream,
  HASH_ALGORITHMS,
};
