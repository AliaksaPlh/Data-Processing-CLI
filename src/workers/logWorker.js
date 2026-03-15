const { parentPort } = require("worker_threads");
const fs = require("fs");

function getStatusClass(statusCode) {
  const code = parseInt(statusCode, 10);
  if (Number.isNaN(code)) return null;
  const n = Math.floor(code / 100);
  if (n >= 2 && n <= 5) return `${n}xx`;
  return null;
}

function parseLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 7) return null;
  const path = parts.slice(6).join(" ").trim();
  return {
    level: parts[1],
    statusCode: parts[3],
    responseTimeMs: parseInt(parts[4], 10),
    path: path || parts[6],
  };
}

parentPort.on("message", (msg) => {
  const { filePath, startByte, endByte } = msg;
  const levels = {};
  const status = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  const paths = {};
  let responseTimeSum = 0;
  let lineCount = 0;

  const stream = fs.createReadStream(filePath, {
    start: startByte,
    end: endByte,
  });
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = parseLine(line);
      if (!parsed) continue;
      lineCount++;
      levels[parsed.level] = (levels[parsed.level] || 0) + 1;
      const sc = getStatusClass(parsed.statusCode);
      if (sc && status[sc] !== undefined) status[sc]++;
      paths[parsed.path] = (paths[parsed.path] || 0) + 1;
      if (!Number.isNaN(parsed.responseTimeMs))
        responseTimeSum += parsed.responseTimeMs;
    }
  });

  stream.on("end", () => {
    if (buffer.trim()) {
      const parsed = parseLine(buffer);
      if (parsed) {
        lineCount++;
        levels[parsed.level] = (levels[parsed.level] || 0) + 1;
        const sc = getStatusClass(parsed.statusCode);
        if (sc && status[sc] !== undefined) status[sc]++;
        paths[parsed.path] = (paths[parsed.path] || 0) + 1;
        if (!Number.isNaN(parsed.responseTimeMs))
          responseTimeSum += parsed.responseTimeMs;
      }
    }
    parentPort.postMessage({
      total: lineCount,
      levels,
      status,
      paths,
      responseTimeSum,
    });
  });

  stream.on("error", (err) => {
    parentPort.postMessage({ error: err.message });
  });
});
