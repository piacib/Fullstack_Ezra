import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090/");
const i = 4;
interface BOOKS_ENTRY {
  title: string;
  authors: string;
  originalText: string;
  episodeTitle: string;
  airDate: string;
}
const testEntry: BOOKS_ENTRY = {
  title: `test${i}`,
  authors: `JSON${i}`,
  originalText: `test${i}`,
  episodeTitle: `test${i}`,
  airDate: new Date().toDateString(),
};
const addEntry = async (data: BOOKS_ENTRY) => {
  const authData = await pb.admins.authWithPassword(
    process.env.POCKETBASEEMAIL,
    process.env.POCKETBASEPASSWORD
  );
  const record = await pb.collection("books").create(data);
};
// export default addEntry
