#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const mode = String(process.argv[2] || "").trim().toLowerCase();
const allowedModes = new Set(["local", "trial", "release"]);

if (!allowedModes.has(mode)) {
  console.error("用法: node scripts/switch-ext-config.js <local|trial|release>");
  process.exit(1);
}

const DEFAULT_ENV_ID = "prod-0gtze2g30e64915d";
const DEFAULT_SERVICE = "xinqi-diet";
const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || "http://127.0.0.1:8080";

function resolveCloudConfig(prefix) {
  return {
    cloudEnvId: process.env[`${prefix}_CLOUD_ENV_ID`] || process.env.CLOUD_ENV_ID || DEFAULT_ENV_ID,
    cloudService: process.env[`${prefix}_CLOUD_SERVICE`] || process.env.CLOUD_SERVICE || DEFAULT_SERVICE,
  };
}

function localRuntimeConfig() {
  return {
    useCloudContainer: false,
    baseUrl: LOCAL_BASE_URL,
  };
}

function cloudRuntimeConfig(cloudConfig) {
  return {
    useCloudContainer: true,
    cloudEnvId: cloudConfig.cloudEnvId,
    cloudService: cloudConfig.cloudService,
  };
}

const trialCloud = resolveCloudConfig("TRIAL");
const releaseCloud = resolveCloudConfig("RELEASE");

const runtime = {
  develop: localRuntimeConfig(),
  trial: cloudRuntimeConfig(trialCloud),
  release: cloudRuntimeConfig(releaseCloud),
};

if (mode === "trial") {
  runtime.develop = cloudRuntimeConfig(trialCloud);
}
if (mode === "release") {
  runtime.develop = cloudRuntimeConfig(releaseCloud);
}

const activeRuntime = runtime.develop;
const ext = {
  useCloudContainer: activeRuntime.useCloudContainer,
  baseUrl: activeRuntime.baseUrl || "",
  cloudEnvId: activeRuntime.cloudEnvId || "",
  cloudService: activeRuntime.cloudService || "",
  runtime,
};

const extJson = {
  extEnable: true,
  extAppid: "wx0a7ca5b4f5d09a35",
  ext,
};

const targetPath = path.resolve(__dirname, "../miniprogram/ext.json");
fs.writeFileSync(targetPath, `${JSON.stringify(extJson, null, 2)}\n`, "utf8");

console.info(`已写入 ${targetPath}`);
console.info(`当前模式: ${mode}`);
if (activeRuntime.useCloudContainer) {
  console.info(`请求通道: 云托管 (${activeRuntime.cloudEnvId} / ${activeRuntime.cloudService})`);
} else {
  console.info(`请求通道: 本地 HTTP (${activeRuntime.baseUrl})`);
}
