import puppeteer from "puppeteer";
import * as fs from "fs";
import latestEpisode from "./latestEpisodeDate.json" assert { type: "json" };
import newEpisodes from "./newEpisodes.json" assert { type: "json" };

interface BOOKAUTHORDATA {
  title: string;
  authors: string[];
  originalText: string;
}

interface DATA extends BOOKAUTHORDATA {
  guest: string;
  episodeTitle: string;
  episodeDate: string;
}
interface newEpisodeJSON {
  [k: number]: DATA;
}
const newEpisodeJSON = newEpisodes as newEpisodeJSON;

const url = "https://www.nytimes.com/article/ezra-klein-show-book-recs.html";
const ALLDATAFILENAME = "data.json";
const NEWEPISODEFILENAME = "newEpisodes.json";
const LASTEPISODEFILENAME = "lastestEpisodeDate.json";

/// *** FETCHES NYT PAGE AND RETURNS ARRAY OF BOOKS PARSED *** ///
const writeDataToJson = (data: any, name: string) => {
  console.log(`writing data to ${name}...`);
  try {
    fs.writeFileSync(name, JSON.stringify(data));
  } catch (error) {
    console.error(error);
    throw error;
  }
};
const appendDataToJson = (data: any, name: string) => {
  console.log(`writing data to ${name}...`);
  try {
    fs.appendFileSync(name, JSON.stringify(data));
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const parseNYTPage = () => {
  const parseEpisodeTitle = (pNode: HTMLParagraphElement): string => {
    const lastFirstParenth = pNode.innerText.lastIndexOf("(");
    const episodeTitle = pNode.innerText.slice(0, lastFirstParenth).trim();
    return episodeTitle;
  };
  const parseEpisodeDate = (pNode: HTMLParagraphElement): string => {
    const lastParenth = pNode.innerText.lastIndexOf(")");
    const lastFirstParenth = pNode.innerText.lastIndexOf("(");
    const date = pNode.innerText.slice(lastFirstParenth + 1, lastParenth);
    return date;
  };
  const parseEpisodeBookRecs = (ulNode: HTMLUListElement): BOOKAUTHORDATA[] => {
    const liNodes = ulNode.children as HTMLCollectionOf<HTMLLIElement>;
    if (liNodes === undefined) {
      return [];
    }
    let books: BOOKAUTHORDATA[] = [];
    Array.from(liNodes).forEach((bookAuthorNode) => {
      const text = bookAuthorNode.innerText;
      const titleRegEx = text.match(/\“(.*?)\”/);
      const title = titleRegEx && titleRegEx[1] ? titleRegEx[1] : text;
      const splitText = text.split(" by ");
      if (splitText.length == 2) {
        const unparsedAuthor = splitText[1];
        const authors = unparsedAuthor?.split(/ and | , /);
        books.push({
          title,
          authors: authors ? authors : [],
          originalText: text,
        });
        return books;
      }
      books.push({ title, authors: [], originalText: text });
    });
    return books;
  };
  const parseEpisodeEntry = (h2Node: HTMLHeadingElement) => {
    const data: DATA[] = [];
    const guest = h2Node.innerText;
    const titleEl = h2Node.nextSibling as HTMLParagraphElement;
    const episodeTitle = parseEpisodeTitle(titleEl);
    const episodeDate = parseEpisodeDate(titleEl);

    const booksUL = titleEl.nextSibling as HTMLUListElement;
    const booksArr = parseEpisodeBookRecs(booksUL);
    if (!booksArr) {
      return data;
    }
    booksArr.forEach((book) => {
      data.push({
        ...book,
        episodeTitle,
        episodeDate,
        guest,
      });
    });
    return data;
  };
  const getH2s = document.querySelectorAll(
    "#story > section > div > div > h2"
  ) as NodeListOf<HTMLHeadingElement>;
  const parsePage = () => {
    const guestNodeList = getH2s;
    const data: DATA[] = [];
    const guestArr = Array.from(guestNodeList);
    guestArr.forEach((x) => {
      const results = parseEpisodeEntry(x);
      if (!(typeof results === "string")) {
        data.push(...results);
      } else {
        return;
      }
    });
    return data;
  };
  return parsePage();
};
interface ScrapeProps {
  url: string;
  parsePageFunc: () => DATA[];
  pathtofile?: string;
  fileName?: string;
}
const scrape = async ({
  url,
  parsePageFunc,
  pathtofile = "../../",
  fileName = "",
}: ScrapeProps) => {
  // Start a Puppeteer session with:
  // - a visible browser (`headless: false` - easier to debug because you'll see the browser in action)
  // - no default viewport (`defaultViewport: null` - website page will in full width and height)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  // Open a new page
  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: "domcontentloaded",
  });
  const data = await page.evaluate(parsePageFunc);
  // save data
  if (fileName == ALLDATAFILENAME) {
    writeDataToJson(data[0]?.episodeDate, pathtofile + LASTEPISODEFILENAME);
    writeDataToJson(data, pathtofile + fileName);
  }
  if (fileName == NEWEPISODEFILENAME) {
    const newData = data.filter(
      (x) => new Date(x.episodeDate) > new Date(latestEpisode)
    );
    let episodeNumber = Object.keys(newEpisodeJSON).length
      ? Math.max(...Object.keys(newEpisodeJSON).map((x) => Number(x))) + 1
      : 1;

    newData.forEach((x) => {
      newEpisodeJSON[episodeNumber++] = x;
    });
    writeDataToJson(newEpisodeJSON, "../newEpisodes.json");
  }

  console.log(latestEpisode);
  // Close the browser
  await browser.close();
  return data;
};

scrape({
  url,
  parsePageFunc: parseNYTPage,
  fileName: NEWEPISODEFILENAME,
});
