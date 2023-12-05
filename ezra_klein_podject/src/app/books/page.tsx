import React from "react";
import PocketBase from "pocketbase";
const getBooks = async () => {
  const pb = new PocketBase("http://127.0.0.1:8090");
  const records = await pb.collection("books").getFullList({
    sort: "-created",
  });
  return records;
};
const page = async () => {
  const books = await getBooks();
  return (
    <div>
      <ul>
        {books[0].authors.map((x) => (
          <li>{x}</li>
        ))}
      </ul>
    </div>
  );
};

export default page;
