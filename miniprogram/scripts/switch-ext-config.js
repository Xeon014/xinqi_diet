#!/usr/bin/env node

console.error("当前项目是普通小程序，ext.json 仅适用于第三方平台代开发场景，不能作为本项目的运行时配置入口。");
console.error("开发环境请直接使用 utils/constants.js 中的默认策略：develop 走本地 127.0.0.1:8080，trial/release 走云托管。");
console.error("如需调整环境映射，请修改 utils/constants.js，而不是写入 ext.json。");
process.exit(1);
