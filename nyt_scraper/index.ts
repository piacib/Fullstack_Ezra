import puppeteer from "puppeteer";
import * as fs from "fs";
import newEpisodes from "./newEpisodes.json" assert { type: "json" };
import _ from "lodash";

// Define interfaces for data structures
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
  [k: string]: DATA;
}
// Type cast newEpisodes to newEpisodeJSON
const newEpisodeJSON = newEpisodes as newEpisodeJSON;

// Get most recent episode date
const episodeDatesArray = Object.values(newEpisodeJSON).map(
  (x) => new Date(x.episodeDate).getTime() + 24 * 60 * 60 * 1000
);
const latestEpisode = new Date(Math.max.apply(null, episodeDatesArray));
// Define constants
const url = "https://www.nytimes.com/article/ezra-klein-show-book-recs.html";
const ALLDATAFILENAME = "data.json";
const NEWEPISODEFILENAME = "newEpisodes.json";
const LASTEPISODEFILENAME = "lastestEpisodeDate.json";

/// *** FETCHES NYT PAGE AND RETURNS ARRAY OF BOOKS PARSED *** ///

// Function to write data to a JSON file
const writeDataToJson = (data: any, name: string) => {
  console.log(`writing data to ${name}...`);
  try {
    fs.writeFileSync(name, JSON.stringify(data));
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Function to parse the NYT page and extract relevant data
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

// Interface for the properties used in scraping
interface ScrapeProps {
  url: string;
  parsePageFunc: () => DATA[];
  pathtofile?: string;
  fileName?: string;
}
// Function to append new episode data to the existing JSON file
const appendNewEpisodeDataToJSON = (
  newData: DATA[],
  oldData = newEpisodeJSON
) => {
  let updatedData = oldData;
  // Filter Data to extract new Episodes
  const newEpisodes = newData.filter(
    (x) => new Date(x.episodeDate) > new Date(latestEpisode)
  );

  let episodeNumber = Object.keys(oldData).length
    ? Math.max(...Object.keys(oldData).map((x) => Number(x))) + 1
    : 1;
  const oldDataKeys = Object.keys(oldData);
  let newEpisodeCount = 0;
  newEpisodes.forEach((newEpisode) => {
    // Iterate over episode numbers for the new entry
    const isEntryNew =
      oldDataKeys.filter((key) => _.isEqual(oldData[key], newEpisode))
        .length === 0;

    if (isEntryNew) {
      updatedData[String(episodeNumber++)] = newEpisode;
      newEpisodeCount++;
    }
  });
  console.log(`${newEpisodeCount} entries added to newEpisodes.json`);
  if (!newEpisodeCount) {
    // Write the updated data to the newEpisodes.json file
    writeDataToJson(updatedData, "../newEpisodes.json");
  }
};
// Main scraping function
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
    appendNewEpisodeDataToJSON(data);
  }
  console.log(latestEpisode);
  // Close the browser
  await browser.close();
  return;
};

scrape({
  url,
  parsePageFunc: parseNYTPage,
  fileName: NEWEPISODEFILENAME,
});
