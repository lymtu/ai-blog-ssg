import fs from "fs/promises";
import path from "path";
import { timeTransform } from "../../src/utils/timeTransform.js";

const root = process.cwd();
const listPlaceholder = "<!-- MD-LIST -->";
const insertHtml = async (mdInfoList) => {
  const indexHtmlPath = path.join(root, "dist", "index.html");
  const indexHtmlContent = await fs.readFile(indexHtmlPath, "utf-8");

  let mdListDom = "";
  for (let i = 0; i < Math.min(mdInfoList.length, 10); i++) {
    const mdInfo = mdInfoList[i];
    mdListDom += `<li>
            <a href="${path.join(mdInfo.type, mdInfo.baseName)}">
              <span class="dir">[ ${mdInfo.type} ]</span>
              <span class="basename">${mdInfo.baseName}</span>
              <span class="birthtime">${timeTransform(mdInfo.birthTime)}</span>
              <div>
                <img src="/arrow-left-up.svg" alt="">
              </div>
            </a>
          </li>`;
  }

  const newHtmlContent = indexHtmlContent.replace(listPlaceholder, mdListDom);
  await fs.writeFile(indexHtmlPath, newHtmlContent, "utf-8");
};

export default insertHtml;
