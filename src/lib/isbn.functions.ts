import { createServerFn } from "@tanstack/react-start";
import { isbn13 } from "./reading";

export const lookupIsbn = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => {
    const isbn = typeof value === "string" && isbn13(value);
    if (!isbn) throw new Error("ISBN inválido");
    return isbn;
  })
  .handler(async ({ data }) => {
    const { findEdition } = await import("./isbn-catalog");
    return findEdition(data);
  });
