import { Config } from "@remotion/cli/config";

// 1080p H.264 MP4 — the safe submission format for a hackathon upload.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
// Higher CRF quality (lower = better). 18 is visually lossless-ish for slide-style content.
Config.setCodec("h264");
Config.setCrf(18);
