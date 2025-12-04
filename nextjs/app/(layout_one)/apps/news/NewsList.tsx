"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { LoaderCircle, Search } from "lucide-react";
import { useState } from "react";

interface NewsListProps {
  newsStories: any[];
  page: number;
}

/* eslint-disable @next/next/no-img-element */
export default function NewsList({
  newsStories: propNewsStories,
  page: propPage,
}: NewsListProps) {
  const [newsStories, setNewsStories] = useState(propNewsStories);
  const [page, setPage] = useState(propPage);
  const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isReachingEndPage, setIsReachingEndPage] = useState(false);

  const loadMoreNewsStories = async () => {
    // Check if loading state is true
    if (isLoadMoreLoading) {
      return;
    }

    // Set loading state to true
    setIsLoadMoreLoading(true);

    const newNewsStories = await fetch(
      `${process.env.NEXT_PUBLIC_BUKA_API_URL_V8}/news-stories?page=${page + 1}&q=${searchQuery}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    ).then((res) => res.json());

    // Detect if there are no more radio stations, this will happen when the newStations is an empty array or the length is less than 100
    if (newNewsStories.length === 0 || newNewsStories.length < 25) {
      // Set loading state to false
      setIsLoadMoreLoading(false);

      // Set reaching end page state to true
      setIsReachingEndPage(true);

      // Append new news stories to the existing news stories
      setNewsStories([...newsStories, ...newNewsStories]);

      return;
    }

    // Append new news stories to the existing news stories
    setNewsStories([...newsStories, ...newNewsStories]);

    // Increment the page number
    setPage(page + 1);

    // Set loading state to false
    setIsLoadMoreLoading(false);
  };

  const changeSearchQuery = async (query: string) => {
    setSearchQuery(query);

    if (query.length === 0) {
      const resultNewStories = await fetch(
        `${process.env.NEXT_PUBLIC_BUKA_API_URL_V8}/news-stories`,
        {
          cache: "no-cache",
          headers: {
            "Content-Type": "application/json",
          },
        },
      ).then((res) => res.json());

      setNewsStories(resultNewStories);
    }
  };

  const searchNewsStories = async (query: string) => {
    const resultNewStories = await fetch(
      `${process.env.NEXT_PUBLIC_BUKA_API_URL_V8}/news-stories?q=${query}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    ).then((res) => res.json());

    setNewsStories(resultNewStories);
    setSearchQuery(query);
  };

  return (
    <>
      <div className="relative ml-auto w-full flex-1 md:grow">
        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full rounded-lg bg-background pl-8"
          value={searchQuery}
          onChange={(e) => changeSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              searchNewsStories(e.currentTarget.value);
            }
          }}
        />
      </div>
      {newsStories.length > 0 ? (
        <Table className="mt-7">
          <TableBody>
            {newsStories.map((newsStory: any) => (
              <TableRow key={newsStory.id} className={`group`}>
                <TableCell className={`relative w-[80px]`}>
                  <a href={newsStory.link} className={`block`} target="_blank">
                    <img
                      alt=""
                      className="aspect-square rounded-md object-cover"
                      height="64"
                      src={newsStory.image_url_detail}
                      width="64"
                    />
                  </a>
                </TableCell>
                <TableCell className="font-medium">
                  <a href={newsStory.link} className={`block`} target="_blank">
                    {newsStory.title}
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="mt-10 flex w-full items-center justify-center">
          <span className="text-muted-foreground">No news stories found.</span>
        </div>
      )}

      {!isReachingEndPage && newsStories.length > 0 && (
        <Button
          variant="outline"
          size="default"
          type="button"
          className="mx-auto mt-3 w-36 gap-1.5"
          onClick={loadMoreNewsStories}
        >
          {isLoadMoreLoading ? (
            <LoaderCircle className="animate-spin text-slate-500" />
          ) : (
            "Load more"
          )}
        </Button>
      )}
    </>
  );
}
