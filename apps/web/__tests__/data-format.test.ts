import { describe,expect,it } from "vitest";
import { formatVnd } from "@/lib/format";

describe("formatVnd",()=>{it("formats whole VND values",()=>{expect(formatVnd(1850000)).toMatch(/1[.\s]850[.\s]000|1,850,000/);});});
