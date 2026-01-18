// scripts/identifyAnimals.mjs
// 等价于 animal_identify.py：给定一张本地图片 → 调百度动物识别 → 存 *.animal.json

import fs from "fs/promises";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

// 明确告诉 dotenv 去读 .env.local，而不是默认的 .env
dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

const AK = process.env.BAIDU_AK;
const SK = process.env.BAIDU_SK;

// 命令行参数：node scripts/identifyAnimals.mjs data/animals/ele_11.jpg
const IMG_PATH = process.argv[2];
const OUTPUT_DIR = path.resolve("data/recog_json/output_json");
const TOP_NUM = 10;

async function getToken(ak, sk) {
  const url = "https://aip.baidubce.com/oauth/2.0/token";
  const params = {
    grant_type: "client_credentials",
    client_id: ak,
    client_secret: sk,
  };
  const { data } = await axios.get(url, { params });
  return data.access_token;
}

async function identifyLocalImage(imgPath, token, topNum = 10) {
  const url = `https://aip.baidubce.com/rest/2.0/image-classify/v1/animal?access_token=${token}`;

  const imgBuf = await fs.readFile(imgPath);
  const imgBase64 = imgBuf.toString("base64");

  const body = new URLSearchParams();
  body.append("image", imgBase64);
  body.append("top_num", String(topNum));

  const { data } = await axios.post(url, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data;
}

async function main() {
  if (!IMG_PATH) {
    console.error("用法: node scripts/identifyAnimals.mjs <imagePath>");
    process.exit(1);
  }
  if (!AK || !SK) {
    console.error("请在 .env.local 中设置 BAIDU_AK / BAIDU_SK");
    process.exit(1);
  }

  const token = await getToken(AK, SK);
  const out = await identifyLocalImage(IMG_PATH, token, TOP_NUM);

  console.log(JSON.stringify(out, null, 2));

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const imgName = path.basename(IMG_PATH, path.extname(IMG_PATH));
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "")
    .replace("T", "-")
    .slice(0, 15); // 类似 20251113-010000

  const outPath = path.join(OUTPUT_DIR, `${imgName}.${ts}.animal.json`);
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf-8");

  console.log("Save successfully:", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
