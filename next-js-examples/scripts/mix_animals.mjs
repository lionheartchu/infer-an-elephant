// scripts/mixAnimals.mjs
// 等价于 mix_animals.py：读取一个 *.animal.json → 随机抽两种动物 + ratio → 存 *.mix.json

import fs from "fs/promises";
import path from "path";

const INPUT_FILE = process.argv[2]; // 传入 animal.json 的路径
const OUTPUT_DIR = path.resolve("data/baidu_animal/mix_json");

function pickTwoNames(data) {
  const names = (data.result || [])
    .filter((it) => typeof it.name !== "undefined")
    .map((it) => String(it.name));

  if (names.length < 2) {
    throw new Error("结果中少于两个 name。");
  }

  // 随机取两个不重复
  const i = Math.floor(Math.random() * names.length);
  let j;
  do {
    j = Math.floor(Math.random() * names.length);
  } while (j === i);

  return [names[i], names[j]];
}

function twoDecimalsSumOne() {
  // 1..99，避免 0 和 1
  const pInt = Math.floor(Math.random() * 99) + 1;
  const p = pInt / 100.0;
  const q = (100 - pInt) / 100.0;
  return [p, q];
}

async function main() {
  if (!INPUT_FILE) {
    console.error("用法: node scripts/mixAnimals.mjs <animalJsonPath>");
    process.exit(1);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const text = await fs.readFile(INPUT_FILE, "utf-8");
  const data = JSON.parse(text);

  const [a, b] = pickTwoNames(data);
  const [p, q] = twoDecimalsSumOne();

  const outObj = {
    mix: [
      { name: a, ratio: p },
      { name: b, ratio: q },
    ],
  };

  const stem = path.basename(INPUT_FILE, path.extname(INPUT_FILE));
  const outPath = path.join(OUTPUT_DIR, `${stem}.mix.json`);

  await fs.writeFile(outPath, JSON.stringify(outObj, null, 2), "utf-8");
  console.log(`已生成: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
