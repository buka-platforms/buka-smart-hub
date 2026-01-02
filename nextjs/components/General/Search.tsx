"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search as SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Search({ ...props }) {
  const router = useRouter();
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const doSearch = () => {
    const searchInput = document.getElementById("search") as HTMLInputElement;

    // Check if the search input is empty
    if (searchInput?.value.trim() === "") {
      setIsValid(false);
      setError("Search cannot empty");
      return;
    }

    // Check if the search type is empty
    if (selectedValue === "") {
      setIsValid(false);
      setError("Please select the search type");
      return;
    }

    // Reset the error message
    setIsValid(true);
    setError("");

    // Send virtual page view event to Google Analytics
    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: `Search for ${selectedValue} with keyword ${searchInput.value}`,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }

    // Do router.push based on the selected value
    if (selectedValue === "radio")
      router.push(`/apps/radio?q=${searchInput.value}`);
    else if (selectedValue === "book_preview")
      router.push(`/apps/book-preview?q=${searchInput.value}`);
    else if (selectedValue === "music_preview")
      router.push(`/apps/music-preview?q=${searchInput.value}`);
    else if (selectedValue === "ai")
      window.open(`https://chat.com?q=${searchInput.value}`, "_blank");

    // Close the dialog
    setIsOpen(false);
  };

  const doKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      doSearch();
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (!open) {
      setIsValid(true);
      setError("");
      setSelectedValue("");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger>
          <SearchIcon {...props} />
        </DialogTrigger>
        <DialogContent className="top-37.5">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          {/* <div className="flex flex-wrap items-center gap-2 md:flex-row"> */}
          <div className="flex flex-wrap items-center gap-3 md:flex-row">
            <Input
              type="text"
              placeholder="Search..."
              id="search"
              onKeyDown={doKeyDown}
            />
            <Select onValueChange={(value) => setSelectedValue(value)}>
              <SelectTrigger className="select-search-trigger w-max cursor-pointer">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>What to search</SelectLabel>
                  <SelectItem value="ai">Artificial Intelligence</SelectItem>
                  <SelectItem value="book_preview">Book Preview</SelectItem>
                  <SelectItem value="music_preview">Music Preview</SelectItem>
                  <SelectItem value="radio">Radio</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button type="button" className="cursor-pointer" onClick={doSearch}>
              Search
            </Button>
          </div>
          {!isValid && (
            <span className="-mt-2 text-xs text-red-500">{error}</span>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
