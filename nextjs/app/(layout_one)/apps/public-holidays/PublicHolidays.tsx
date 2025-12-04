"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReadable } from "@/lib/react_use_svelte_store";
import { cn } from "@/lib/utils";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { writable } from "svelte/store";
import useSWR from "swr";

const selectedYearStore = writable(new Date().getFullYear().toString());
const selectedCountryStore = writable(null);

const fetcher = async (...args: [RequestInfo, RequestInit?]): Promise<any> => {
  const res = await fetch(...args);
  return res.json();
};

export function SelectYear() {
  const selectedYear = useReadable(selectedYearStore);

  return (
    <Select
      value={selectedYear}
      onValueChange={(value) => selectedYearStore.set(value)}
    >
      <SelectTrigger className="select-year-trigger w-max">
        <SelectValue placeholder="Select year" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Year</SelectLabel>
          {Array.from(Array(3).keys()).map((_, index) => {
            const year = new Date().getFullYear() + index;
            return (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function SelectCountry({ selectedCountry }: { selectedCountry: any }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(selectedCountry?.value);

  const { data, error, isLoading } = useSWR(
    `https://date.nager.at/api/v3/AvailableCountries`,
    fetcher,
    {
      revalidateOnFocus: true,
    },
  );

  // Adjust data, by adding properties value and label
  data?.forEach((country: any) => {
    country.value = country.name.toLowerCase();
    country.label = country.name;
  });

  if (isLoading)
    return (
      <div className="text-sm text-accent-foreground">Loading countries...</div>
    );
  if (error)
    return (
      <div className="text-sm text-accent-foreground">Failed to load data</div>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          {value
            ? data.find((country: any) => country.value === value)?.label
            : "Select country"}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-max p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." className="h-9" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {data.map((country: any) => (
                <CommandItem
                  key={country.value}
                  value={country.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    // selectedCountryCodeStore.set(
                    //   data.find(
                    //     (country: any) => country.value === currentValue,
                    //   )?.countryCode,
                    // );
                    selectedCountryStore.set(
                      data.find(
                        (country: any) => country.value === currentValue,
                      ),
                    );
                    setOpen(false);
                  }}
                >
                  {country.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === country.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function PublicHolidays({
  requestHeaders,
}: {
  requestHeaders: any;
}) {
  // const countryCode = requestHeaders["cf-ipcountry"];
  const countryCode = requestHeaders["x-vercel-ip-country"];
  const selectedYear = useReadable(selectedYearStore);
  const selectedCountry = useReadable(selectedCountryStore) || {
    countryCode: countryCode,
    value: "indonesia",
    name: "Indonesia",
    label: "Indonesia",
  };

  const { data, error, isLoading } = useSWR(
    `https://date.nager.at/api/v3/PublicHolidays/${selectedYear}/${selectedCountry?.countryCode}`,
    fetcher,
    {
      revalidateOnFocus: true,
    },
  );

  // Loop on data and add property key that is unique
  data?.forEach((holiday: any, index: number) => {
    holiday.key = `${holiday.date}-${index}`;
  });

  if (isLoading)
    return (
      <div className="text-sm text-accent-foreground">
        Loading public holidays...
      </div>
    );
  if (error)
    return (
      <div className="text-sm text-accent-foreground">Failed to load data</div>
    );

  return (
    <>
      <div className="flex gap-2">
        <SelectCountry selectedCountry={selectedCountry} />
        <SelectYear />
      </div>
      <Table className="mt-7">
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="hidden sm:table-cell">Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((holiday: any) => {
            const day = new Intl.DateTimeFormat("en-US", {
              weekday: "long",
            }).format(new Date(holiday.date));

            const formattedDate = new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).format(new Date(holiday.date));

            return (
              <TableRow key={holiday.key}>
                <TableCell className="align-text-top md:align-middle">
                  {day}
                </TableCell>
                <TableCell className="align-text-top md:align-middle">
                  {formattedDate}
                </TableCell>
                <TableCell className="align-text-top md:align-middle">
                  <div className="font-medium">{holiday.name}</div>
                  <div className="inline text-sm text-muted-foreground">
                    {holiday.localName}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
