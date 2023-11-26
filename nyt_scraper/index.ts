import puppeteer from "puppeteer";
import * as fs from "fs";
// import lastUpdated from "./lastupdated.json"; //assert { type: "json" };

interface BOOKAUTHORDATA {
  title: string;
  authors: string[];
  originalText: string;
}
interface TITLEDATE {
  episodeTitle: string;
  date: Date;
}
interface DATA extends BOOKAUTHORDATA, TITLEDATE {
  guest: string;
}
// console.log(new Date(lastUpdated));
/// *** FETCHES NYT PAGE AND RETURNS ARRAY OF BOOKS PARSED *** ///
// import allData from "./data.json" assert { type: "json" };
const writeDataToJson = (data: any, name: string) => {
  console.log(`writing data to ${name}...`);
  try {
    fs.writeFileSync(name, JSON.stringify(data));
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const parseNYTPage = (expr = "parseAllData") => {
  const parseEpisodeandDate = (pNode: HTMLParagraphElement): TITLEDATE => {
    const lastParenth = pNode.innerText.lastIndexOf(")");
    const lastFirstParenth = pNode.innerText.lastIndexOf("(");
    const date = pNode.innerText.slice(lastFirstParenth + 1, lastParenth);
    const episodeTitle = pNode.innerText.slice(0, lastFirstParenth).trim();
    return { episodeTitle, date: new Date(date) };
  };
  const parseBooks = (ulNode: HTMLUListElement) => {
    const liNodes = ulNode.children as HTMLCollectionOf<HTMLLIElement>;
    if (liNodes === undefined) {
      return;
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
        return;
      }
      books.push({ title, authors: [], originalText: text });
    });
    return books;
  };
  const parseEntry = (h2Node: HTMLHeadingElement) => {
    const data: DATA[] = [];
    const guest = h2Node.innerText;
    const titleEl = h2Node.nextSibling as HTMLParagraphElement;
    const titleDateObj = parseEpisodeandDate(titleEl);
    const booksUL = titleEl.nextSibling as HTMLUListElement;
    const booksArr = parseBooks(booksUL);
    if (!booksArr) {
      return data;
    }
    booksArr.forEach((book) => {
      data.push({
        ...book,
        ...titleDateObj,
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
      const results = parseEntry(x);
      data.push(...results);
    });
    return data;
  };
  //   const parseLatestEpisode = () => {
  //     const guestNodeList = getH2s;
  //     const isNewEpisode = true;
  //     let newEpisodes = [];
  //     let entry = 0;
  //     while (isNewEpisode) {
  //       const episode = guestNodeList[entry];
  //       const episodeData = parseEntry(episode);
  //       const dataFiltered = allData.filter((entry) =>
  //         _isEqual(entry, episodeData)
  //       );
  //       if (dataFiltered && dataFiltered.length > 1) {
  //         throw Error("duplicate entry", dataFiltered);
  //       }
  //       if (dataFiltered && dataFiltered.length === 1) {
  //         isNewEpisode = false;
  //         break;
  //       }
  //       newEpisodes.push(episode);
  //       entry++;
  //     }
  //     return newEpisodes;
  //   };
  switch (expr) {
    case "parseAllData":
      const fullPageData = parsePage();
      return fullPageData;
    // case "parseNewestEpisodes":
    //   console.log("parseNewestEpisodes");
    //   const latestEpisodeData = parseLatestEpisode();
    //   return latestEpisodeData;
  }
};
interface ScrapeProps {
  url: string;
  parsePageFunc: any;
  lastUpdated: string;
  pathtofile?: string;
  fileName?: string;
}
const scrape = async ({
  url,
  parsePageFunc,
  lastUpdated,
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
  const scrapeAllData = await page.evaluate(parsePageFunc);
  const data = scrapeAllData;
  // save data
  if (fileName) {
    writeDataToJson(new Date(), pathtofile + "lastupdated.json");

    writeDataToJson(data, pathtofile + fileName);
  }
  // Close the browser
  await browser.close();
  return data;
};

const url = "https://www.nytimes.com/article/ezra-klein-show-book-recs.html";

scrape({
  url,
  lastUpdated: "10",
  parsePageFunc: parseNYTPage,
  fileName: "../../data.json",
});
