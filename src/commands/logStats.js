const fs = require("fs");
const fsPromises = require("fs").promises;
const os = require("os");
const path = require("path");
const { Worker } = require("worker_threads");
const { resolvePath } = require("../utils/pathResolver");

const TOP_PATHS_LIMIT = 10;

/**
 * stream the file and record byte offset of each line start (chunks on line boundaries)
 * @param {string} filePath
 * @returns {Promise<number[]>} lineStarts[i] = byte offset where line i starts
 */
function getLineBoundaries(filePath) {
  return new Promise((resolve, reject) => {
    const lineStarts = [0];
    const readStream = fs.createReadStream(filePath);
    let offset = 0;

    readStream.on("data", (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const chunkStart = offset;
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] === 0x0a) {
          lineStarts.push(chunkStart + i + 1);
        }
      }
      offset = chunkStart + buf.length;
    });

    readStream.on("end", () => resolve(lineStarts));
    readStream.on("error", reject);
  });
}

/**
 * run one worker for a byte range
 * @param {string} workerPath - path to worker script
 * @param {string} filePath - resolved input file path
 * @param {number} startByte
 * @param {number} endByte
 * @returns {Promise<object>}
 */
function runWorker(workerPath, filePath, startByte, endByte) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: {},
    });
    worker.on("message", (msg) => {
      if (msg.error) {
        reject(new Error(msg.error));
      } else {
        resolve(msg);
      }
    });
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker exited with ${code}`));
    });
    worker.postMessage({ filePath, startByte, endByte });
  });
}

/**
 * Merge partial stats from workers: sum counters, merge path maps, then topPaths.
 */
function mergePartialStats(partials) {
  const total = partials.reduce((s, p) => s + p.total, 0);
  const levels = {};
  const status = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  const paths = {};
  let responseTimeSum = 0;

  for (const p of partials) {
    for (const [k, v] of Object.entries(p.levels || {})) {
      levels[k] = (levels[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(p.status || {})) {
      if (status[k] !== undefined) status[k] += v;
    }
    for (const [k, v] of Object.entries(p.paths || {})) {
      paths[k] = (paths[k] || 0) + v;
    }
    responseTimeSum += p.responseTimeSum || 0;
  }

  const topPaths = Object.entries(paths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_PATHS_LIMIT)
    .map(([pathName, count]) => ({ path: pathName, count }));

  const avgResponseTimeMs =
    total > 0 ? Math.round((responseTimeSum / total) * 100) / 100 : 0;

  return {
    total,
    levels,
    status,
    topPaths,
    avgResponseTimeMs,
  };
}

/**
 * analyze log file using worker threads. write stats JSON to output
 * @param {string} currentDir current work dir
 * @param {string} inputPath path to log file (rel/abs)
 * @param {string} outputPath - path to output JSON (rel/abs)
 * @returns {Promise<{ ok: boolean }>}
 */
const handleLogStats = async (currentDir, inputPath, outputPath) => {
  const resolvedInput = resolvePath(currentDir, inputPath);
  const resolvedOutput = resolvePath(currentDir, outputPath);

  let stat;
  try {
    await fsPromises.access(resolvedInput);
    stat = await fsPromises.stat(resolvedInput);
  } catch {
    return { ok: false };
  }

  const fileSize = stat.size;
  const numCores = Math.max(1, os.cpus().length);

  if (fileSize === 0) {
    const empty = {
      total: 0,
      levels: {},
      status: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
      topPaths: [],
      avgResponseTimeMs: 0,
    };
    await fsPromises.writeFile(
      resolvedOutput,
      JSON.stringify(empty, null, 2),
      "utf8",
    );
    return { ok: true };
  }

  let lineStarts;
  try {
    lineStarts = await getLineBoundaries(resolvedInput);
  } catch {
    return { ok: false };
  }

  const numLines = lineStarts.length;
  const N = Math.min(numCores, Math.max(1, numLines));
  const workerPath = path.resolve(__dirname, "..", "workers", "logWorker.js");

  const chunkRanges = [];
  for (let k = 0; k < N; k++) {
    const startIdx = Math.floor((k * numLines) / N);
    const endIdx = k < N - 1 ? Math.floor(((k + 1) * numLines) / N) : numLines;
    const startByte = lineStarts[startIdx];
    const endByte = endIdx < numLines ? lineStarts[endIdx] - 1 : fileSize - 1;
    if (startByte <= endByte) {
      chunkRanges.push({ startByte, endByte });
    }
  }

  const workers = chunkRanges.map(({ startByte, endByte }) =>
    runWorker(workerPath, resolvedInput, startByte, endByte),
  );

  let partials;
  try {
    partials = await Promise.all(workers);
  } catch {
    return { ok: false };
  }

  const result = mergePartialStats(partials);

  try {
    await fsPromises.writeFile(
      resolvedOutput,
      JSON.stringify(result, null, 2),
      "utf8",
    );
  } catch {
    return { ok: false };
  }

  return { ok: true };
};

module.exports = {
  handleLogStats,
};
