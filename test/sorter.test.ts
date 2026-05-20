import { sortImports } from "../src/sorter";
import { it, expect, describe } from "vitest";

describe("sortImports", () => {
  it("leaves empty source unchanged", () => {
    expect(sortImports("")).toBe("");
  });

  it("leaves source without imports unchanged", () => {
    const src = "const x = 1;\nconsole.log(x);\n";
    expect(sortImports(src)).toBe(src);
  });

  it("keeps a single import as-is", () => {
    const src = `import { foo } from "bar";\n`;
    expect(sortImports(src)).toBe(src);
  });

  it("sorts single-line imports by length ascending", () => {
    const input = [
      `import { S3Bucket } from "@/types/s3";`,
      `import { Readable } from "stream";`,
      `import { randomUUID } from "crypto";`,
      "",
    ].join("\n");

    const expected = [
      `import { Readable } from "stream";`,
      `import { randomUUID } from "crypto";`,
      `import { S3Bucket } from "@/types/s3";`,
      "",
    ].join("\n");

    expect(sortImports(input)).toBe(expected);
  });

  it("sorts named specifiers within a single-line import by length ascending", () => {
    const input = `import { ObjectCannedACL, S3Client, _Object } from "@aws-sdk/client-s3";\n`;
    const expected = `import { _Object, S3Client, ObjectCannedACL } from "@aws-sdk/client-s3";\n`;
    expect(sortImports(input)).toBe(expected);
  });

  it("breaks a long single-line import into multi-line and sorts specifiers", () => {
    const input = [
      `import { S3Client, _Object, ObjectCannedACL, __MetadataBearer, GetObjectCommand, HeadObjectCommand, ListObjectsCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";`,
      "",
    ].join("\n");

    const expected = [
      "import {",
      "  _Object,",
      "  S3Client,",
      "  ObjectCannedACL,",
      "  __MetadataBearer,",
      "  GetObjectCommand,",
      "  HeadObjectCommand,",
      "  ListObjectsCommand,",
      "  DeleteObjectCommand,",
      "  ListObjectsV2Command,",
      `} from "@aws-sdk/client-s3";`,
      "",
    ].join("\n");

    expect(sortImports(input)).toBe(expected);
  });

  it("collapses a multi-line import that now fits on one line", () => {
    const input = ["import {", "  foo,", "  bar,", `} from "baz";`, ""].join(
      "\n",
    );

    const expected = `import { bar, foo } from "baz";\n`;
    expect(sortImports(input)).toBe(expected);
  });

  it("sorts mixed multi-line and single-line by single-line length", () => {
    const input = [
      `import { tiny } from "a";`,
      `import { S3Client, _Object, ObjectCannedACL, __MetadataBearer, GetObjectCommand, HeadObjectCommand, ListObjectsCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";`,
      `import { medium } from "bb";`,
      "",
    ].join("\n");

    const output = sortImports(input);
    const lines = output.split("\n");

    expect(lines[0]).toBe(`import { tiny } from "a";`);
    expect(lines[1]).toBe(`import { medium } from "bb";`);
    expect(lines[2]).toBe("import {");
    expect(lines[lines.length - 2]).toBe(`} from "@aws-sdk/client-s3";`);
  });

  it("puts a short single-line import before a multi-line one with a longer from-line", () => {
    const input = [
      `import { AlertDialog, AlertDialogTitle, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/ui/alert-dialog";`,
      `import { toast } from "sonner";`,
      `import { useState, useEffect } from "react";`,
      "",
    ].join("\n");

    const output = sortImports(input);
    const firstLine = output.split("\n")[0];

    expect(firstLine).toBe(`import { toast } from "sonner";`);
  });

  it("sorts multi-line imports by single-line length ascending", () => {
    const input = [
      `import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/ui/select";`,
      `import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/table";`,
      `import { timelineActionLabel, actionPayloadSummary, userActionSourceLabel, timelineActionBadgeVariant } from "@/utils/actionLog";`,
      "",
    ].join("\n");

    const output = sortImports(input);
    const fromLines = output.split("\n").filter((l) => l.startsWith("} from"));

    expect(fromLines).toEqual([
      `} from "@/components/ui/table";`,
      `} from "@/components/ui/select";`,
      `} from "@/utils/actionLog";`,
    ]);
  });

  it("handles default + named imports", () => {
    const input = `import sharp, { FormatEnum, FitEnum } from "sharp";\n`;
    const expected = `import sharp, { FitEnum, FormatEnum } from "sharp";\n`;
    expect(sortImports(input)).toBe(expected);
  });

  it("preserves side-effect imports", () => {
    const input = [`import "polyfill";`, `import { foo } from "bar";`, ""].join(
      "\n",
    );

    const result = sortImports(input);
    expect(result).toContain(`import "polyfill";`);
    expect(result).toContain(`import { foo } from "bar";`);
  });

  it("preserves type-only imports", () => {
    const input = `import type { B, A } from "types";\n`;
    const expected = `import type { A, B } from "types";\n`;
    expect(sortImports(input)).toBe(expected);
  });

  it("preserves namespace imports", () => {
    const input = [
      `import * as fs from "fs";`,
      `import { a } from "b";`,
      "",
    ].join("\n");

    const result = sortImports(input);
    expect(result).toContain(`import * as fs from "fs";`);
    expect(result).toContain(`import { a } from "b";`);
  });

  it("does not touch code below the import block", () => {
    const input = [
      `import { b } from "longer-module";`,
      `import { a } from "x";`,
      "",
      "const value = 1;",
      "console.log(value);",
      "",
    ].join("\n");

    const expected = [
      `import { a } from "x";`,
      `import { b } from "longer-module";`,
      "",
      "const value = 1;",
      "console.log(value);",
      "",
    ].join("\n");

    expect(sortImports(input)).toBe(expected);
  });

  it("preserves a leading file comment", () => {
    const input = [
      "// Header comment",
      `import { b } from "longer-module";`,
      `import { a } from "x";`,
      "",
    ].join("\n");

    const expected = [
      "// Header comment",
      `import { a } from "x";`,
      `import { b } from "longer-module";`,
      "",
    ].join("\n");

    expect(sortImports(input)).toBe(expected);
  });

  it("stops the sort block at a non-import statement", () => {
    const input = [
      `import { z } from "z-long";`,
      `import { a } from "a";`,
      "const between = true;",
      `import { b } from "b-keep";`,
      "",
    ].join("\n");

    const result = sortImports(input);
    const lines = result.split("\n");

    expect(lines[0]).toBe(`import { a } from "a";`);
    expect(lines[1]).toBe(`import { z } from "z-long";`);
    expect(lines[2]).toBe("const between = true;");
    expect(lines[3]).toBe(`import { b } from "b-keep";`);
  });

  it("respects custom quote option", () => {
    const input = `import { foo } from "bar";\n`;
    const expected = `import { foo } from 'bar';\n`;
    expect(sortImports(input, { quote: "'" })).toBe(expected);
  });

  it("respects custom indent option", () => {
    const input = `import { aaa, bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, ccccccccccccccccccccccccccccccc } from "x";\n`;
    const result = sortImports(input, { indent: "    " });
    expect(result).toContain("\n    aaa,");
    expect(result).toContain(
      "\n    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,",
    );
  });

  it("preserves CRLF line endings when input uses them", () => {
    const input = `import { b } from "longer";\r\nimport { a } from "x";\r\n`;
    const expected = `import { a } from "x";\r\nimport { b } from "longer";\r\n`;
    expect(sortImports(input)).toBe(expected);
  });

  it("handles 'use strict' directive at the top", () => {
    const input = [
      `"use strict";`,
      `import { b } from "longer";`,
      `import { a } from "x";`,
      "",
    ].join("\n");

    const expected = [
      `"use strict";`,
      `import { a } from "x";`,
      `import { b } from "longer";`,
      "",
    ].join("\n");

    expect(sortImports(input)).toBe(expected);
  });

  it("handles inline `type` modifier inside named specifiers", () => {
    const input = `import { type Foo, Bar } from "x";\n`;
    const expected = `import { Bar, type Foo } from "x";\n`;
    expect(sortImports(input)).toBe(expected);
  });

  it("does not pull a wrapped long-name import into the short-import band", () => {
    const input = [
      `import { MaxService } from "@/services/max";`,
      `import { ChannelSubscribeRewardService } from "@/services/channelSubscribeReward";`,
      `import { SunoClient } from "@/clients/suno";`,
      `import { VkApiClient } from "@/clients/vk";`,
      "",
    ].join("\n");

    const output = sortImports(input);
    const lines = output.split("\n");
    const channelIdx = lines.findIndex((l) =>
      l.includes("ChannelSubscribeReward"),
    );
    const maxIdx = lines.findIndex((l) => l.includes("MaxService"));
    const sunoIdx = lines.findIndex((l) => l.includes("SunoClient"));

    expect(channelIdx).toBeGreaterThan(maxIdx);
    expect(channelIdx).toBeGreaterThan(sunoIdx);
  });

  it("reproduces the user's full example", () => {
    const input = [
      `import { StreamingBlobPayloadInputTypes, StreamingBlobPayloadOutputTypes } from "@smithy/types";`,
      `import { S3Client, _Object, ObjectCannedACL, __MetadataBearer, GetObjectCommand, HeadObjectCommand, ListObjectsCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";`,
      `import { Readable } from "stream";`,
      `import { randomUUID } from "crypto";`,
      `import { S3Bucket } from "@/types/s3";`,
      `import { ReadableStream } from "stream/web";`,
      `import appConfig from "@/constants/appConfig";`,
      `import { Upload } from "@aws-sdk/lib-storage";`,
      `import { appLogger } from "@/config/winstonLogger";`,
      `import sharp, { FormatEnum, FitEnum } from "sharp";`,
      `import { ServiceException } from "@smithy/smithy-client";`,
      "",
    ].join("\n");

    const expected = [
      `import { Readable } from "stream";`,
      `import { randomUUID } from "crypto";`,
      `import { S3Bucket } from "@/types/s3";`,
      `import { ReadableStream } from "stream/web";`,
      `import appConfig from "@/constants/appConfig";`,
      `import { Upload } from "@aws-sdk/lib-storage";`,
      `import { appLogger } from "@/config/winstonLogger";`,
      `import sharp, { FitEnum, FormatEnum } from "sharp";`,
      `import { ServiceException } from "@smithy/smithy-client";`,
      "import {",
      "  StreamingBlobPayloadInputTypes,",
      "  StreamingBlobPayloadOutputTypes,",
      `} from "@smithy/types";`,
      "import {",
      "  _Object,",
      "  S3Client,",
      "  ObjectCannedACL,",
      "  __MetadataBearer,",
      "  GetObjectCommand,",
      "  HeadObjectCommand,",
      "  ListObjectsCommand,",
      "  DeleteObjectCommand,",
      "  ListObjectsV2Command,",
      `} from "@aws-sdk/client-s3";`,
      "",
    ].join("\n");

    expect(sortImports(input)).toBe(expected);
  });
});
